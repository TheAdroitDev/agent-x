import { NextRequest, NextResponse } from "next/server";
import { env } from "@/common/config/env";
import { db } from "@/db";
import { xAccounts } from "@/db/schema/x-accounts";
import { runOwnedSync } from "@/features/sync/jobs/orchestrator";
import { logger } from "@/common/utils/logger";

/**
 * POST /api/cron/sync
 *
 * Triggers the owned-first data sync pipeline.
 * Secured by CRON_SECRET bearer token.
 *
 * In production: called by Vercel Cron.
 * In development: called manually via curl or browser.
 */
export async function POST(request: NextRequest) {
    // Validate cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 },
        );
    }

    try {
        // Get all users with linked X accounts
        const linkedAccounts = await db
            .select({
                userId: xAccounts.userId,
                username: xAccounts.username,
            })
            .from(xAccounts);

        if (linkedAccounts.length === 0) {
            // If no x_accounts exist yet, we need to find a user to sync
            // For single-user app, get the first user from the session
            return NextResponse.json({
                success: true,
                message:
                    "No linked X accounts found. User needs to trigger first sync manually.",
            });
        }

        const results = [];
        let processed = 0;
        let errors = 0;
        const isSunday = new Date().getUTCDay() === 0;

        for (const account of linkedAccounts) {
            logger.info(
                `Starting sync for user: @${account.username}`,
                "CronSync",
            );

            try {
                const result = await runOwnedSync(account.userId, { runFollowingSync: isSunday });
                processed++;
                results.push({
                    userId: account.userId,
                    username: account.username,
                    ...result,
                });
            } catch (err) {
                logger.error(`Sync failed for user: @${account.username}`, "CronSync", err);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            job: "sync",
            status: "completed",
            processed,
            errors,
            data: results,
        });
    } catch (error) {
        logger.error("Sync cron failed", "CronSync", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

/**
 * GET /api/cron/sync
 * Alternative GET handler for Vercel Cron compatibility.
 */
export async function GET(request: NextRequest) {
    return POST(request);
}
