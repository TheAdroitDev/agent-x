import { NextRequest, NextResponse } from "next/server";
import { env } from "@/common/config/env";
import { db } from "@/db";
import { xAccounts } from "@/db/schema/x-accounts";
import { scoreCandidates } from "@/features/scoring/jobs/score-candidates";
import { runOpportunityAnalysis } from "@/features/ai/jobs/analyze-opportunities";
import { logger } from "@/common/utils/logger";

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, job: "analyze", error: "Unauthorized" }, { status: 401 });
    }

    try {
        const linkedAccounts = await db
            .select({
                userId: xAccounts.userId,
                username: xAccounts.username,
            })
            .from(xAccounts);

        const results = [];
        let processed = 0;
        let errors = 0;

        for (const account of linkedAccounts) {
            logger.info(`Starting analyze job for user: @${account.username}`, "CronAnalyze");

            try {
                // 1. Run deterministic scoring
                const scoreResult = await scoreCandidates(account.userId, account.username);
                
                // 2. Run Gemini analysis on eligible top candidates
                const aiResult = await runOpportunityAnalysis(account.userId);

                processed++;
                results.push({
                    userId: account.userId,
                    username: account.username,
                    scoreResult,
                    aiResult,
                });
            } catch (err) {
                logger.error(`Analyze failed for user: @${account.username}`, "CronAnalyze", err);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            job: "analyze",
            status: "completed",
            processed,
            errors,
            data: results,
        });
    } catch (error) {
        logger.error("Analyze cron failed", "CronAnalyze", error);
        return NextResponse.json(
            { success: false, job: "analyze", error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
