import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { headers } from "next/headers";
import { runOwnedSync } from "@/features/sync/jobs/orchestrator";
import { logger } from "@/common/utils/logger";

/**
 * POST /api/sync/trigger
 *
 * Authenticated endpoint for manual sync trigger.
 * Uses Better Auth session to identify the user.
 */

export async function POST() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Not authenticated" },
                { status: 401 },
            );
        }

        logger.info(
            `Manual sync triggered by user ${session.user.id}`,
            "ManualSync",
        );

        const result = await runOwnedSync(session.user.id, { runFollowingSync: true });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error("Manual sync failed", "ManualSync", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
