import { db } from "@/db";
import { settings } from "@/db/schema/settings";
import { topics } from "@/db/schema/topics";
import { userTopics } from "@/db/schema/user-topics";
import { eq } from "drizzle-orm";
import { getCachedSession } from "@/features/auth/lib/session";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { TopicEditor } from "./topic-editor";

export const metadata = {
  title: "Settings - AgentX",
};

export default async function SettingsPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userSettings = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.user.id))
    .limit(1);

  const row = userSettings[0];
  const currentSettings = row ? {
    ...row,
    dailyXBudgetCents: row.maxDailyXCostCents,
    monthlyXBudgetCents: row.maxMonthlyXCostCents,
  } : {
    qualityThreshold: 75,
    dailyMaxOpportunities: 30,
    dailyMaxPostIdeas: 3,
    dailyXBudgetCents: 35,
    monthlyXBudgetCents: 1000,
    maxAiAnalysesPerRun: 40,
    maxDailyAiAnalyses: 100,
    maxOpportunitiesPerAuthor: 3,
    voiceTone: ["casual", "technical", "concise"],
    voiceStyle: ["short_paragraphs", "specific_examples"],
    voiceAvoid: ["generic_praise", "fake_enthusiasm", "corporate_language"],
  };

  const configuredTopics = await db
    .select({
      id: topics.id,
      name: topics.name,
      weight: userTopics.weight,
    })
    .from(userTopics)
    .innerJoin(topics, eq(topics.id, userTopics.topicId))
    .where(eq(userTopics.userId, session.user.id))
    .orderBy(topics.name);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AgentX&apos;s behavior, limits, and your AI voice profile.
        </p>
      </div>

      <TopicEditor initialTopics={configuredTopics} />
      <SettingsForm initialSettings={currentSettings} />
    </div>
  );
}
