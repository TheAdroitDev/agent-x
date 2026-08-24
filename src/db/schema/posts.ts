import { pgTable, text, varchar, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  xPostId: varchar("x_post_id", { length: 64 }).notNull().unique(),
  xUserId: varchar("x_user_id", { length: 64 }).notNull(),
  xUsername: varchar("x_username", { length: 64 }).notNull(),
  text: text("text").notNull(),
  conversationId: varchar("conversation_id", { length: 64 }),
  inReplyToId: varchar("in_reply_to_id", { length: 64 }),
  postType: varchar("post_type", { length: 20 }).default("tweet").notNull(), // tweet | reply | quote | retweet
  isOwnPost: boolean("is_own_post").default(false).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  replyCount: integer("reply_count").default(0).notNull(),
  repostCount: integer("repost_count").default(0).notNull(),
  quoteCount: integer("quote_count").default(0).notNull(),
  impressionCount: integer("impression_count").default(0).notNull(),
  postUrl: text("post_url").notNull(),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  aiAnalyzed: boolean("ai_analyzed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
