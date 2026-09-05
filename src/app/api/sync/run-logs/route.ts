
import { NextResponse, NextRequest } from "next/server";
import { getCachedSession } from "@/features/auth/lib/session";
import { db } from "@/db";
import { syncRuns, syncRunLogs } from "@/db/schema/sync";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
    const session = await getCachedSession();
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    try {
        if (runId) {
            const run = await db.query.syncRuns.findFirst({
                where: eq(syncRuns.id, runId),
            });
            if (!run) return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
            
            const logs = await db.query.syncRunLogs.findMany({
                where: eq(syncRunLogs.runId, runId),
                orderBy: [desc(syncRunLogs.createdAt)],
                limit: 50,
            });
            
            return NextResponse.json({ success: true, run, logs });
        } else {
            // Get latest run
            const latestRun = await db.query.syncRuns.findFirst({
                where: eq(syncRuns.userId, session.user.id),
                orderBy: [desc(syncRuns.startedAt)],
            });
            if (!latestRun) return NextResponse.json({ success: true, run: null });
            
            const logs = await db.query.syncRunLogs.findMany({
                where: eq(syncRunLogs.runId, latestRun.id),
                orderBy: [desc(syncRunLogs.createdAt)],
                limit: 50,
            });
            
            return NextResponse.json({ success: true, run: latestRun, logs });
        }
    } catch {
        return NextResponse.json({ success: false, error: "Failed to fetch logs" }, { status: 500 });
    }
}

