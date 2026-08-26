
import { NextResponse, NextRequest } from "next/server";
import { getCachedSession } from "@/features/auth/lib/session";
import { runOwnedSync } from "@/features/sync/jobs/orchestrator";
import { scoreCandidates } from "@/features/scoring/jobs/score-candidates";
import { runOpportunityAnalysis } from "@/features/ai/jobs/analyze-opportunities";
import { generatePostIdeas } from "@/features/ai/lib/post-ideator";
import { db } from "@/db";
import { syncRuns, syncRunLogs } from "@/db/schema/sync";
import { eq } from "drizzle-orm";
import { logger } from "@/common/utils/logger";

let isRunning = false;

// We will store the full pipeline logic in a background async function
async function executePipeline(userId: string, runId: string, accountUsername: string) {
    const funnelMetrics = {
        discovered: 0,
        filtered: 0,
        filterReasons: {
            ownPosts: 0,
            retweets: 0,
            stale: 0,
            spam: 0,
            weakReplies: 0,
            nestedReplies: 0
        },
        scored: 0,
        saved: 0,
        sentToGemini: 0,
        approved: 0,
        rejected: 0,
        queued: 0
    };

    const logToRun = async (level: string, message: string) => {
        await db.insert(syncRunLogs).values({ runId, level, message });
    };

    try {
        await db.update(syncRuns).set({ status: "RUNNING" }).where(eq(syncRuns.id, runId));
        await logToRun("INFO", "Pipeline started.");

        await logToRun("INFO", "Running sync pipeline...");
        const syncResult = await runOwnedSync(userId, { syncRunId: runId }); // Passing runId if we change orchestrator

        // For now, if orchestrator creates its own, we update this runId with that cost? 
        // Wait, orchestrator creates its own runId! We should modify orchestrator to accept an existing runId.
        // I will do that next.
        
        await logToRun("INFO", `Sync complete. ${syncResult.summary.ownPostsNew} new posts, ${syncResult.summary.mentionsNew} new mentions.`);
        funnelMetrics.discovered = syncResult.summary.ownPostsNew + syncResult.summary.mentionsNew + syncResult.summary.interactionsNew;

        await logToRun("INFO", "Running deterministic scoring...");
        const scoringResult = await scoreCandidates(userId, accountUsername);
        
        funnelMetrics.filtered = (scoringResult as any).filteredCount ?? 0;
        funnelMetrics.filterReasons = (scoringResult as any).filterReasons ?? funnelMetrics.filterReasons;
        funnelMetrics.scored = scoringResult.scoredCount ?? 0;
        funnelMetrics.saved = scoringResult.savedCount ?? 0;
        
        await logToRun("INFO", `Scoring complete. ${funnelMetrics.scored} scored, ${funnelMetrics.saved} saved.`);

        await logToRun("INFO", "Running Gemini analysis on queued opportunities...");
        const analysisResult = await runOpportunityAnalysis(userId);
        
        funnelMetrics.sentToGemini = analysisResult.analyzedCount ?? 0;
        funnelMetrics.queued = analysisResult.remainingCount ?? 0;
        
        await logToRun("INFO", `Gemini analysis complete. Analyzed: ${funnelMetrics.sentToGemini}. Queued: ${funnelMetrics.queued}.`);

        await logToRun("INFO", "Generating Post Ideas...");
        const ideasResult = await generatePostIdeas(userId);
        
        if (ideasResult.notEnoughSources) {
            await logToRun("WARN", ideasResult.error ?? "Not enough standalone sources for ideas.");
        } else {
            await logToRun("INFO", `Generated ${ideasResult.count} new Post Ideas.`);
        }

        await db.update(syncRuns).set({ 
            status: "COMPLETED", 
            completedAt: new Date(),
            funnelMetrics 
        }).where(eq(syncRuns.id, runId));
        await logToRun("INFO", "Pipeline fully completed.");
        
    } catch (error) {
        await logToRun("ERROR", `Pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        await db.update(syncRuns).set({ 
            status: "FAILED", 
            completedAt: new Date(),
            errorLog: error instanceof Error ? error.message : "Unknown error",
            funnelMetrics
        }).where(eq(syncRuns.id, runId));
    } finally {
        isRunning = false;
    }
}

export async function POST() {
    const session = await getCachedSession();
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (isRunning) {
        return NextResponse.json({ success: false, error: "Pipeline is already running" }, { status: 429 });
    }

    isRunning = true;

    try {
        const userId = session.user.id;

        const { xAccounts } = await import("@/db/schema/x-accounts");
        const accountResult = await db.select().from(xAccounts).where(eq(xAccounts.userId, userId)).limit(1);
        const account = accountResult[0];

        if (!account || !account.username) {
            isRunning = false;
            return NextResponse.json({ success: false, error: "User missing X account connection" }, { status: 400 });
        }

        // Create the run record explicitly here!
        const [syncRun] = await db.insert(syncRuns).values({
            userId,
            jobName: "run-all",
            status: "RUNNING",
        }).returning();

        // Fire and forget
        executePipeline(userId, syncRun.id, account.username).catch(err => {
            console.error("Background pipeline crashed:", err);
            isRunning = false;
        });

        return NextResponse.json({
            success: true,
            runId: syncRun.id,
            message: "Pipeline started in background"
        });
    } catch (error) {
        console.error("Manual pipeline failed to start:", error);
        isRunning = false;
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Pipeline failed" },
            { status: 500 }
        );
    }
}

