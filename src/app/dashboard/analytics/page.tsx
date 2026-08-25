import { db } from "@/db";
import { opportunities } from "@/db/schema/opportunities";
import { xUsers } from "@/db/schema/x-users";
import { eq, sql } from "drizzle-orm";
import { getCachedSession } from "@/features/auth/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle2, XCircle, Activity } from "lucide-react";

import { getUserUsageStats } from "@/features/usage/services";

export const metadata = {
  title: "Analytics - AgentX",
};

export default async function AnalyticsPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Aggregate stats in parallel
  const [statsResult, relStats, usageStats] = await Promise.all([
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
      .innerJoin(xUsers, eq(opportunities.xUserId, xUsers.xUserId))
      .where(eq(opportunities.userId, userId))
      .groupBy(xUsers.isMutual, xUsers.isFollowing),

    getUserUsageStats(userId),
  ]);

  const stats = statsResult[0] || { total: 0, engaged: 0, dismissed: 0, avgScore: 0, worthReplying: 0 };
  const { totalTodayCents, totalMonthCents, dailyBudget, monthBudget, todayPercent, monthPercent, todayUsage, geminiUsage } = usageStats;

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
                  ${(totalTodayCents / 100).toFixed(2)} / ${(dailyBudget / 100).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${todayPercent >= 100 ? 'bg-destructive' : todayPercent >= 80 ? 'bg-yellow-500' : 'bg-primary'}`} 
                  style={{ width: `${Math.min(todayPercent, 100)}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {dailyBudget - totalTodayCents > 0 ? `$${((dailyBudget - totalTodayCents) / 100).toFixed(2)} application budget remaining` : 'Application budget exhausted'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Monthly Spend</span>
                <span className="text-sm text-muted-foreground">
                  ${(totalMonthCents / 100).toFixed(2)} / ${(monthBudget / 100).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${monthPercent >= 100 ? 'bg-destructive' : monthPercent >= 80 ? 'bg-yellow-500' : 'bg-primary opacity-80'}`} 
                  style={{ width: `${Math.min(monthPercent, 100)}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {monthBudget - totalMonthCents > 0 ? `$${((monthBudget - totalMonthCents) / 100).toFixed(2)} application budget remaining` : 'Application budget exhausted'}
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
                      <span className="text-sm font-bold whitespace-nowrap">${(u.costCents / 100).toFixed(2)}</span>
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
            <CardTitle className="text-base">Gemini Usage (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {geminiUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Gemini analyses this month.</p>
            ) : (
              <div className="space-y-4">
                {geminiUsage.map(u => (
                  <div key={u.endpoint} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate pr-4">{u.endpoint}</span>
                      <span className="text-sm font-bold whitespace-nowrap">{u.requests} runs</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Tokens processed</span>
                      <span>{u.tokensUsed?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
