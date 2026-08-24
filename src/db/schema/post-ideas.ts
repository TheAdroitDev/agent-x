import { pgTable, text, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const postIdeas = pgTable("post_ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  hook: text("hook").notNull(),
  coreIdea: text("core_idea").notNull(),
  angle: text("angle"),
  draft: text("draft").notNull(),
  whyNow: text("why_now"),
  sourcePostIds: text("source_post_ids").array().notNull().default([]),
  status: varchar("status", { length: 20 }).default("NEW").notNull(),
  model: varchar("model", { length: 50 }),
  promptVersion: varchar("prompt_version", { length: 10 }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
