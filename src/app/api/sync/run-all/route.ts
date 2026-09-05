
import { NextResponse } from "next/server";
import { getCachedSession } from "@/features/auth/lib/session";
import { runOwnedSync } from "@/features/sync/jobs/orchestrator";
import { scoreCandidates } from "@/features/scoring/jobs/score-candidates";
import { runOpportunityAnalysis } from "@/features/ai/jobs/analyze-opportunities";
import { generatePostIdeas } from "@/features/ai/lib/post-ideator";
import { db } from "@/db";
import { syncRuns, syncRunLogs } from "@/db/schema/sync";
import { eq } from "drizzle-orm";


let isRunning = false;

// We will store the full pipeline logic in a background async function
async function executePipeline(userId: string, runId: string, accountUsername: string) {
    const funnelMetrics = {
        discovered: 0,
        deduplicated: 0,
        hardFiltered: 0,
        filterReasons: {
            ownPosts: 0,
            retweets: 0,
            stale: 0,
            spam: 0,
            weakReplies: 0,
            nestedReplies: 0,
            genericReactions: 0,
            greetingsOrTags: 0,
            contextlessOneLiners: 0,
            showcaseOrPromotional: 0
        },
        scored: 0,
        persisted: 0,
        geminiAnalyzed: 0,
        approved: 0,
        rejected: 0,
        remainingQueued: 0
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (funnelMetrics as any).discoveryBudgetTelemetry = syncResult.summary.budgetTelemetry;
        
        if (syncResult.summary.followingSyncTelemetry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (funnelMetrics as any).followingSyncTelemetry = syncResult.summary.followingSyncTelemetry;
        }

        await logToRun("INFO", "Running deterministic scoring...");
        const scoringResult = await scoreCandidates(userId, accountUsername);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pfs = (scoringResult as any).preFilterStats;
        if (pfs) {
            funnelMetrics.hardFiltered = pfs.totalInput - pfs.totalOutput;
            funnelMetrics.filterReasons = {
                ownPosts: pfs.removed.ownPosts ?? 0,
                retweets: pfs.removed.retweets ?? 0,
                stale: pfs.removed.stale ?? 0,
                spam: pfs.removed.spam ?? 0,
                weakReplies: pfs.removed.weakReply ?? 0,
                nestedReplies: pfs.removed.nestedReply ?? 0,
                genericReactions: pfs.removed.genericReaction ?? 0,
                greetingsOrTags: pfs.removed.greetingOrTag ?? 0,
                contextlessOneLiners: pfs.removed.contextlessOneLiner ?? 0,
                showcaseOrPromotional: pfs.removed.showcaseOrPromotional ?? 0,
            };
        }
        funnelMetrics.scored = scoringResult.scoredCount ?? 0;
        funnelMetrics.persisted = scoringResult.savedCount ?? 0;
        
        await logToRun("INFO", `Scoring complete. ${funnelMetrics.scored} scored, ${funnelMetrics.persisted} persisted.`);

        // Enrich interaction telemetry with scoring stats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authorStats = (scoringResult as any).authorStats || {};
        if (syncResult.networkTelemetry) {
            for (const t of syncResult.networkTelemetry) {
                const stats = authorStats[t.xUserId] || { filtered: 0, scored: 0, saved: 0 };
                t.filteredPosts = stats.filtered;
                t.scoredPosts = stats.scored;
                t.geminiEligiblePosts = stats.saved;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (funnelMetrics as any).networkDiscoveryTelemetry = syncResult.networkTelemetry;
        }

        await logToRun("INFO", "Running Gemini analysis on queued opportunities...");
        const analysisResult = await runOpportunityAnalysis(userId);
        
        funnelMetrics.geminiAnalyzed += analysisResult.analyzedCount ?? 0;
        funnelMetrics.approved += analysisResult.approvedCount ?? 0;
        funnelMetrics.rejected += analysisResult.rejectedCount ?? 0;
        funnelMetrics.remainingQueued = analysisResult.remainingCount ?? 0;

        let fallbackConfirmed = false;

        if (analysisResult.requiresFallbackConfirmation) {
            await logToRun("WARN", "Primary Gemini quota exhausted. Waiting for user to confirm fallback.");
            await db.update(syncRuns).set({ status: "NEEDS_FALLBACK" }).where(eq(syncRuns.id, runId));
            
            // Poll for user confirmation or cancellation
            while (true) {
                const runCheck = await db.select({ status: syncRuns.status }).from(syncRuns).where(eq(syncRuns.id, runId)).limit(1);
                const currentStatus = runCheck[0]?.status;
                if (currentStatus === "RUNNING") {
                    fallbackConfirmed = true;
                    break;
                }
                if (currentStatus === "STOPPED" || currentStatus === "FAILED" || currentStatus === "COMPLETED" || currentStatus === "RESUME_NO_FALLBACK") {
                    break;
                }
                await new Promise(r => setTimeout(r, 3000));
            }

            if (fallbackConfirmed) {
                await logToRun("INFO", "User confirmed fallback. Resuming Gemini analysis.");
                // Resume analysis with fallback explicitly requested
                const resumedResult = await runOpportunityAnalysis(userId, { forceFallback: true });
                funnelMetrics.geminiAnalyzed += resumedResult.analyzedCount ?? 0;
                funnelMetrics.approved += resumedResult.approvedCount ?? 0;
                funnelMetrics.rejected += resumedResult.rejectedCount ?? 0;
                funnelMetrics.remainingQueued = resumedResult.remainingCount ?? 0;
            } else {
                await logToRun("INFO", "User cancelled fallback or run was stopped. Skipping remaining analysis.");
            }
        }
        
        await logToRun("INFO", `Gemini analysis complete. Analyzed: ${funnelMetrics.geminiAnalyzed} (Approved: ${funnelMetrics.approved}, Rejected: ${funnelMetrics.rejected}). Queued: ${funnelMetrics.remainingQueued}.`);

        await logToRun("INFO", "Generating Post Ideas...");
        const ideasResult = await generatePostIdeas(userId, { forceFallback: fallbackConfirmed });
        
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

