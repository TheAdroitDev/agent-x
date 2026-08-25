import { NextRequest, NextResponse } from "next/server";
import { env } from "@/common/config/env";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { runPostIdeasGeneration } from "@/features/ai/jobs/generate-post-ideas";
import { logger } from "@/common/utils/logger";

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, job: "ideas", error: "Unauthorized" }, { status: 401 });
    }

    try {
        const allUsers = await db.select({ id: user.id }).from(user);
        
        const results = [];
        let processed = 0;
        let errors = 0;

        for (const u of allUsers) {
            logger.info(`Starting post-ideas job for user: ${u.id}`, "CronIdeas");
            try {
                const result = await runPostIdeasGeneration(u.id);
                processed++;
                results.push({
                    userId: u.id,
                    ...result,
                });
            } catch (err) {
                logger.error(`Post-ideas failed for user: ${u.id}`, "CronIdeas", err);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            job: "ideas",
            status: "completed",
            processed,
            errors,
            data: results,
        });
    } catch (error) {
        logger.error("Ideas cron failed", "CronIdeas", error);
        return NextResponse.json(
            { success: false, job: "ideas", error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
