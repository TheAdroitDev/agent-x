import { db, interactions } from "@/db";
import { opportunities } from "@/db/schema/opportunities";
import { posts } from "@/db/schema/posts";
import { xUsers } from "@/db/schema/x-users";
import { generatedReplies } from "@/db/schema/generated-replies";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCachedSession } from "@/features/auth/lib/session";
import { OpportunityCard } from "./opportunity-card";
import { BulkMarkEngagedButton } from "./bulk-mark-engaged-button";
import { AnalyzeQueuedButton } from "./analyze-queued-button";
import { redirect } from "next/navigation";
import { LightbulbIcon } from "lucide-react";

export const metadata = {
  title: "Opportunities - AgentX",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const { normalizeOpportunityFilter, buildOpportunityFilter } = await import("@/features/scoring/lib/filters");
  const filter = normalizeOpportunityFilter(params.filter);

  // Find posts the user has already engaged with (outbound interaction)
  const outboundInteractions = await db
    .select({ postId: interactions.postId })
    .from(interactions)
    .where(and(eq(interactions.userId, session.user.id), eq(interactions.direction, "outbound")));
  
  const engagedPostIds = outboundInteractions
    .map(i => i.postId)
    .filter((id): id is string => id !== null);

  const finalCondition = buildOpportunityFilter(session.user.id, filter, engagedPostIds);

  const rawOpportunities = await db
    .select({
      opportunity: opportunities,
      post: posts,
      author: xUsers,
    })
    .from(opportunities)
    .innerJoin(posts, eq(opportunities.postId, posts.id))
    .leftJoin(xUsers, eq(opportunities.xUserId, xUsers.xUserId))
    .where(finalCondition)
    .orderBy(desc(opportunities.totalScore))
    .limit(50);

  // If there are opportunities, fetch their generated replies
  let repliesData: (typeof generatedReplies.$inferSelect)[] = [];
  if (rawOpportunities.length > 0) {
    const oppIds = rawOpportunities.map((r) => r.opportunity.id);
    repliesData = await db
      .select()
      .from(generatedReplies)
      .where(inArray(generatedReplies.opportunityId, oppIds));
  }

  // Map them together
  const formattedData = rawOpportunities.map((row) => {
    const validPostUsername = (row.post.xUsername && row.post.xUsername !== "[unknown]") ? row.post.xUsername : null;
    const finalUsername = row.author?.username || validPostUsername || row.author?.displayName || "[unknown]";
    const finalDisplayName = row.author?.displayName || validPostUsername || "[unknown]";

    return {
      opportunity: row.opportunity,
      post: row.post,
      author: {
        ...(row.author || {}),
        username: finalUsername,
        displayName: finalDisplayName,
        isMutual: row.author?.isMutual || false
      },
      generatedReplies: repliesData.filter((r) => r.opportunityId === row.opportunity.id),
    };
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
        <p className="text-muted-foreground mt-1">High-value conversations curated by Phase 4 and analyzed by Gemini.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex gap-2">
          <a href="/dashboard?filter=ACTIVE" className={`px-4 py-2 rounded-md text-sm font-medium border ${filter === 'ACTIVE' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background hover:bg-muted'}`}>Active</a>
          <a href="/dashboard?filter=IGNORED" className={`px-4 py-2 rounded-md text-sm font-medium border ${filter === 'IGNORED' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background hover:bg-muted'}`}>Ignored / Rejected</a>
          <a href="/dashboard?filter=ENGAGED" className={`px-4 py-2 rounded-md text-sm font-medium border ${filter === 'ENGAGED' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background hover:bg-muted'}`}>Engaged</a>
          <a href="/dashboard?filter=ALL" className={`px-4 py-2 rounded-md text-sm font-medium border ${filter === 'ALL' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background hover:bg-muted'}`}>All</a>
        </div>
        <AnalyzeQueuedButton />
        {filter === "ACTIVE" && formattedData.length > 0 && (
          <BulkMarkEngagedButton opportunityIds={formattedData.map(d => d.opportunity.id)} />
        )}
      </div>

      {formattedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/20 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <LightbulbIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No active opportunities</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            There are currently no new opportunities that Gemini deemed worth replying to. Try running a sync later.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {formattedData.map((item) => (
            <OpportunityCard key={item.opportunity.id} data={item} />
          ))}
        </div>
      )}
    </div>
  );
}
