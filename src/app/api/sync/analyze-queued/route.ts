
import { NextResponse } from "next/server";
import { getCachedSession } from "@/features/auth/lib/session";
import { runOpportunityAnalysis } from "@/features/ai/jobs/analyze-opportunities";

export async function POST() {
    const session = await getCachedSession();
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await runOpportunityAnalysis(session.user.id, { ignoreMaxPerRun: true });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Queue analysis failed:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Analysis failed" },
            { status: 500 }
        );
    }
}

