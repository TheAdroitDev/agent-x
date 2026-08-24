import { pgTable, text, varchar, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { opportunities } from "./opportunities";

export const generatedReplies = pgTable("generated_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunityId: uuid("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  replyText: text("reply_text").notNull(),
  isAlternative: boolean("is_alternative").default(false).notNull(),
  replyType: varchar("reply_type", { length: 30 }),
  model: varchar("model", { length: 50 }),
  promptVersion: varchar("prompt_version", { length: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
