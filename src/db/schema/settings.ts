import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { commonColumns } from "./common";
import { DEFAULT_LIMITS, DEFAULT_VOICE_PROFILE } from "@/common/config/constants";

export const settings = pgTable("settings", {
  ...commonColumns,
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  qualityThreshold: integer("quality_threshold").default(DEFAULT_LIMITS.QUALITY_THRESHOLD).notNull(),
  dailyMaxOpportunities: integer("daily_max_opportunities").default(DEFAULT_LIMITS.DAILY_RECOMMENDED_MAX).notNull(),
  dailyMaxPostIdeas: integer("daily_max_post_ideas").default(DEFAULT_LIMITS.DAILY_POST_IDEAS_MAX).notNull(),
  maxDailyXCostCents: integer("max_daily_x_cost_cents").default(DEFAULT_LIMITS.MAX_DAILY_X_COST_CENTS).notNull(),
  maxMonthlyXCostCents: integer("max_monthly_x_cost_cents").default(DEFAULT_LIMITS.MAX_MONTHLY_X_COST_CENTS).notNull(),
  maxAiAnalysesPerRun: integer("max_ai_analyses_per_run").default(DEFAULT_LIMITS.MAX_AI_ANALYSES_PER_RUN).notNull(),
  maxDailyAiAnalyses: integer("max_daily_ai_analyses").default(DEFAULT_LIMITS.MAX_DAILY_AI_ANALYSES).notNull(),
  maxOpportunitiesPerAuthor: integer("max_opportunities_per_author").default(DEFAULT_LIMITS.MAX_OPPORTUNITIES_PER_AUTHOR).notNull(),
  voiceTone: text("voice_tone")
    .array()
    .notNull()
    .default([...DEFAULT_VOICE_PROFILE.voiceTone]),
  voiceStyle: text("voice_style")
    .array()
    .notNull()
    .default([...DEFAULT_VOICE_PROFILE.voiceStyle]),
  voiceAvoid: text("voice_avoid")
    .array()
    .notNull()
    .default([...DEFAULT_VOICE_PROFILE.voiceAvoid]),
});
