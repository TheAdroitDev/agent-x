import { NextResponse } from "next/server";
import { getCachedSession } from "@/features/auth/lib/session";
import { runOwnedSync } from "@/features/sync/jobs/orchestrator";
import { scoreCandidates } from "@/features/scoring/jobs/score-candidates";
import { runOpportunityAnalysis } from "@/features/ai/jobs/analyze-opportunities";
import { generatePostIdeas } from "@/features/ai/lib/post-ideator";
import { db } from "@/db";
import { eq } from "drizzle-orm";

let isRunning = false;

export async function POST() {
  // Authentication check
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Prevent duplicate concurrent executions in local environment
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
      throw new Error("User missing X account connection");
    }

    // 1. Sync
    const syncResult = await runOwnedSync(userId);
    
    // 2. Deterministic Scoring
    const scoringResult = await scoreCandidates(userId, account.username);
    
    // 3. Gemini Opportunity Analysis
    const analysisResult = await runOpportunityAnalysis(userId);
    
    // 4. Post-idea generation
    const ideasResult = await generatePostIdeas(userId);

    return NextResponse.json({
      success: true,
      stages: {
        sync: syncResult,
        scoring: scoringResult,
        analysis: analysisResult,
        ideas: ideasResult,
      },
    });
  } catch (error) {
    console.error("Manual pipeline failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  } finally {
    isRunning = false;
  }
}
