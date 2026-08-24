import { pgTable, text, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { topics } from "./topics";

export const userTopics = pgTable(
  "user_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    weight: integer("weight").default(50).notNull(), // 0-100
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_topics_user_topic_idx").on(table.userId, table.topicId),
  ]
);
