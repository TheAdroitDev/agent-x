import { pgTable, text, varchar, integer, real, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { posts } from "./posts";
import { commonColumns } from "./common";

export const opportunities = pgTable("opportunities", {
  ...commonColumns,
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  xUserId: varchar("x_user_id", { length: 64 }).notNull(),

  // Scoring
  totalScore: integer("total_score").notNull(),
  relationshipScore: integer("relationship_score").default(0).notNull(),
  topicRelevanceScore: integer("topic_relevance_score").default(0).notNull(),
  conversationFitScore: integer("conversation_fit_score").default(0).notNull(),
  freshnessScore: integer("freshness_score").default(0).notNull(),
  authorRelevanceScore: integer("author_relevance_score").default(0).notNull(),
  engagementScore: integer("engagement_score").default(0).notNull(),
  scoringVersion: varchar("scoring_version", { length: 10 }).default("1.0").notNull(),

  // AI Analysis
  worthReplying: boolean("worth_replying"),
  aiConfidence: real("ai_confidence"),
  aiReason: text("ai_reason"),
  conversationAngle: text("conversation_angle"),
  replyType: varchar("reply_type", { length: 30 }),
  riskFlags: text("risk_flags").array().notNull().default([]),
  topicTags: text("topic_tags").array().notNull().default([]),
  aiModel: varchar("ai_model", { length: 50 }),
  aiPromptVersion: varchar("ai_prompt_version", { length: 10 }),

  // Status
  status: varchar("status", { length: 20 }).default("NEW").notNull(), // NEW | VIEWED | OPENED | COPIED | ENGAGED | DISMISSED | EXPIRED

  // Timestamps
  scoredAt: timestamp("scored_at", { withTimezone: true }),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
