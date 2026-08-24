import { pgTable, text, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { posts } from "./posts";

export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  xUserId: varchar("x_user_id", { length: 64 }).notNull(),
  interactionType: varchar("interaction_type", { length: 30 }).notNull(), // reply_to_me | i_replied | mentioned_me | quote_me | mutual_reply
  postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
  direction: varchar("direction", { length: 10 }).notNull(), // inbound | outbound
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
