import { db } from "@/db";
import { opportunities } from "@/db/schema/opportunities";
import { xUsers } from "@/db/schema/x-users";
import { eq, sql } from "drizzle-orm";
import { getCachedSession } from "@/features/auth/lib/session";
import { DEFAULT_LIMITS } from "@/common/config/constants";
import { AI_MODEL_PRIMARY, AI_MODEL_FALLBACK } from "@/features/ai/lib/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle2, XCircle, Activity } from "lucide-react";

import { getUserUsageStats } from "@/features/usage/services";

export const metadata = {
  title: "Analytics - AgentX",
};

const formatCost = (cents: number) => { return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 }); };

export default async function AnalyticsPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [statsResult, relStats, usageStats, funnelStatsResult] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        engaged: sql<number>`sum(case when ${opportunities.status} = 'ENGAGED' then 1 else 0 end)::int`,
        dismissed: sql<number>`sum(case when ${opportunities.status} = 'DISMISSED' then 1 else 0 end)::int`,
        avgScore: sql<number>`avg(${opportunities.totalScore})::int`,
        worthReplying: sql<number>`sum(case when ${opportunities.worthReplying} = true then 1 else 0 end)::int`,
      })
      .from(opportunities)
      .where(eq(opportunities.userId, userId)),
      
    db
      .select({
        isMutual: xUsers.isMutual,
        isFollowing: xUsers.isFollowing,
        count: sql<number>`count(*)::int`,
      })
      .from(opportunities)
      .leftJoin(xUsers, eq(opportunities.xUserId, xUsers.xUserId))
      .where(eq(opportunities.userId, userId))
      .groupBy(xUsers.isMutual, xUsers.isFollowing),

    getUserUsageStats(userId),

    db.execute(sql`
      SELECT 
        count(*) as discovered,
        sum(case when total_score < 40 then 1 else 0 end) as filtered,
        count(*) as scored,
        sum(case when total_score >= 40 then 1 else 0 end) as score_gte_40,
        sum(case when total_score >= 40 and status NOT IN ('DISMISSED', 'ENGAGED', 'EXPIRED') and analyzed_at IS NULL then 1 else 0 end) as eligible,
        0 as blocked_by_missing_author,
        sum(case when total_score >= 40 and status IN ('DISMISSED', 'ENGAGED', 'EXPIRED') and analyzed_at IS NULL then 1 else 0 end) as blocked_by_engagement,
        sum(case when analyzed_at IS NOT NULL then 1 else 0 end) as selected_for_gemini,
        sum(case when analyzed_at IS NOT NULL and worth_replying = true then 1 else 0 end) as approved,
        sum(case when analyzed_at IS NOT NULL and worth_replying = false then 1 else 0 end) as rejected,
        sum(case when total_score >= 40 and status NOT IN ('DISMISSED', 'ENGAGED', 'EXPIRED') and analyzed_at IS NULL then 1 else 0 end) as remaining_queued
      FROM opportunities
      WHERE user_id = ${userId}
    `)
  ]);

  const stats = statsResult[0] || { total: 0, engaged: 0, dismissed: 0, avgScore: 0, worthReplying: 0 };
  const funnel = (funnelStatsResult.rows[0] as Record<string, string | number>) || {};
  const { totalTodayCents, totalMonthCents, dailyBudget, monthBudget, todayPercent, monthPercent, todayUsage, geminiUsage, todayGeminiUsage, userSettings } = usageStats;

  let mutualCount = 0;
  let followingCount = 0;
  let otherCount = 0;

  relStats.forEach(r => {
    if (r.isMutual) mutualCount += r.count;
    else if (r.isFollowing) followingCount += r.count;
    else otherCount += r.count;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics for your AgentX pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.worthReplying || 0} deemed worth replying</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engaged</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engaged || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully actioned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dismissed || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Skipped or ignored</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opportunity Funnel</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">From discovery to Gemini analysis</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="flex flex-col border p-3 rounded-md">
              <span className="text-2xl font-bold">{funnel.discovered || 0}</span>
              <span className="text-xs text-muted-foreground">Discovered/Scored</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md">
              <span className="text-2xl font-bold">{funnel.filtered || 0}</span>
              <span className="text-xs text-muted-foreground">Filtered ({'<'}40)</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md bg-accent/50">
              <span className="text-2xl font-bold">{funnel.score_gte_40 || 0}</span>
              <span className="text-xs text-muted-foreground">Score &gt;= 40</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md">
              <span className="text-2xl font-bold">{funnel.blocked_by_engagement || 0}</span>
              <span className="text-xs text-muted-foreground">Blocked (Engaged/Dismissed)</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md bg-primary/10">
              <span className="text-2xl font-bold">{funnel.eligible || 0}</span>
              <span className="text-xs text-primary font-medium">Eligible for Gemini</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-4">
            <div className="flex flex-col border p-3 rounded-md">
              <span className="text-2xl font-bold">{funnel.selected_for_gemini || 0}</span>
              <span className="text-xs text-muted-foreground">Analyzed by Gemini</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{funnel.approved || 0}</span>
              <span className="text-xs text-green-600/80 dark:text-green-400/80">Approved (Worth Replying)</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md">
              <span className="text-2xl font-bold">{funnel.rejected || 0}</span>
              <span className="text-xs text-muted-foreground">Rejected by AI</span>
            </div>
            <div className="flex flex-col border p-3 rounded-md">
              <span className="text-2xl font-bold">{funnel.remaining_queued || 0}</span>
              <span className="text-xs text-muted-foreground">Remaining Queued</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opportunities by Relationship</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mutuals</span>
                <span className="text-sm text-muted-foreground">{mutualCount}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${stats.total > 0 ? (mutualCount/stats.total)*100 : 0}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Following Only</span>
                <span className="text-sm text-muted-foreground">{followingCount}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full opacity-70" style={{ width: `${stats.total > 0 ? (followingCount/stats.total)*100 : 0}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Out of Network</span>
                <span className="text-sm text-muted-foreground">{otherCount}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full opacity-40" style={{ width: `${stats.total > 0 ? (otherCount/stats.total)*100 : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application X API Budget</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Separate from actual X Developer Console credits</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Today&apos;s Spend</span>
                <span className="text-sm text-muted-foreground">
                  ${formatCost(totalTodayCents)} / ${formatCost(dailyBudget)}
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${todayPercent >= 100 ? 'bg-destructive' : todayPercent >= 80 ? 'bg-yellow-500' : 'bg-primary'}`} 
                  style={{ width: `${Math.min(todayPercent, 100)}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {dailyBudget - totalTodayCents > 0 ? `$${formatCost(dailyBudget - totalTodayCents)} application budget remaining` : 'Application budget exhausted'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Monthly Spend</span>
                <span className="text-sm text-muted-foreground">
                  ${formatCost(totalMonthCents)} / ${formatCost(monthBudget)}
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${monthPercent >= 100 ? 'bg-destructive' : monthPercent >= 80 ? 'bg-yellow-500' : 'bg-primary opacity-80'}`} 
                  style={{ width: `${Math.min(monthPercent, 100)}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {monthBudget - totalMonthCents > 0 ? `$${formatCost(monthBudget - totalMonthCents)} application budget remaining` : 'Application budget exhausted'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s X API Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {todayUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No X API requests today.</p>
            ) : (
              <div className="space-y-4">
                {todayUsage.map(u => (
                  <div key={u.endpoint} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate pr-4">{u.endpoint}</span>
                      <span className="text-sm font-bold whitespace-nowrap">${formatCost(u.costCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{u.requests} requests</span>
                      <span>{u.resources} resources</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gemini Usage (Today)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">AI analysis quota and fallback tracking</p>
          </CardHeader>
          <CardContent className="space-y-6">
              {(() => {
                // The daily opportunity-analysis quota should count successful `analyze-opportunity` analyses.
                const todayAnalyses = todayGeminiUsage.filter(u => u.endpoint.startsWith('analyze-opportunity:'));
                const primaryRuns = todayAnalyses.filter(u => u.endpoint.includes(AI_MODEL_PRIMARY)).reduce((acc, u) => acc + u.requests, 0);
                const fallbackRuns = todayAnalyses.filter(u => u.endpoint.includes(AI_MODEL_FALLBACK)).reduce((acc, u) => acc + u.requests, 0);
                const totalRuns = primaryRuns + fallbackRuns;
                
                const configuredMax = userSettings?.maxDailyAiAnalyses || DEFAULT_LIMITS.MAX_DAILY_AI_ANALYSES;
                const primaryLimit = DEFAULT_LIMITS.MAX_GEMINI_DAILY_ANALYSES;
                const fallbackLimit = DEFAULT_LIMITS.MAX_GEMINI_FALLBACK_DAILY_ANALYSES;
                
                const primaryPercent = (primaryRuns / primaryLimit) * 100;
                const fallbackPercent = (fallbackRuns / fallbackLimit) * 100;
                const overallPercent = (totalRuns / configuredMax) * 100;
                
                const totalMonthRuns = geminiUsage.filter(u => u.endpoint.startsWith('analyze-opportunity:')).reduce((acc, u) => acc + u.requests, 0);
                const totalTokens = geminiUsage.filter(u => u.endpoint.startsWith('analyze-opportunity:')).reduce((acc, u) => acc + (u.tokensUsed || 0), 0);

                const isGlobalExhausted = totalRuns >= configuredMax;
                const isAllModelsExhausted = primaryRuns >= primaryLimit && fallbackRuns >= fallbackLimit;
                const isPrimaryExhausted = primaryRuns >= primaryLimit;

              return (
                <>
                  <div className="space-y-6">
                    {isGlobalExhausted && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                        Your configured daily analysis limit of {configuredMax} has been reached.
                      </div>
                    )}
                    {!isGlobalExhausted && isAllModelsExhausted && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
                        All configured Gemini model quotas are exhausted.
                      </div>
                    )}
                    {!isGlobalExhausted && !isAllModelsExhausted && isPrimaryExhausted && (
                      <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-md text-sm mb-4">
                        Primary daily quota reached — using Gemini 3.5 Flash-Lite.
                      </div>
                    )}
                    <div className="text-sm font-medium mb-4">
                      Current model: <span className="font-normal text-muted-foreground">{isPrimaryExhausted ? "Fallback" : "Primary"}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">GLOBAL USER LIMIT</span>
                        <span className="text-sm text-muted-foreground">{totalRuns} / {configuredMax} runs</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${overallPercent >= 100 ? "bg-destructive" : overallPercent >= 80 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${Math.min(overallPercent, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {configuredMax - totalRuns > 0 ? `Remaining: ${configuredMax - totalRuns}` : "Remaining: 0"}
                      </p>
                    </div>
  
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">PRIMARY MODEL<br/><span className="text-xs font-normal text-muted-foreground">{AI_MODEL_PRIMARY}</span></span>
                        <span className="text-sm text-muted-foreground">{primaryRuns} / {primaryLimit} runs</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${primaryPercent >= 100 ? "bg-destructive" : primaryPercent >= 80 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${Math.min(primaryPercent, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {primaryLimit - primaryRuns > 0 ? `Remaining: ${primaryLimit - primaryRuns}` : "Remaining: 0"}
                      </p>
                    </div>
  
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">FALLBACK MODEL<br/><span className="text-xs font-normal text-muted-foreground">{AI_MODEL_FALLBACK}</span></span>
                        <span className="text-sm text-muted-foreground">{fallbackRuns} / {fallbackLimit} runs</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${fallbackPercent >= 100 ? "bg-destructive" : fallbackPercent >= 80 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${Math.min(fallbackPercent, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {fallbackLimit - fallbackRuns > 0 ? `Remaining: ${fallbackLimit - fallbackRuns}` : "Remaining: 0"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Runs This Month</span>
                      <span className="font-bold">{totalMonthRuns}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-muted-foreground">Tokens Processed</span>
                      <span className="font-bold">{totalTokens.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
