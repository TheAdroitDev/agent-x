import { pgTable, varchar, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { topics } from "./topics";

export const xUserTopics = pgTable(
  "x_user_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    xUserId: varchar("x_user_id", { length: 64 }).notNull(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("x_user_topics_user_topic_idx").on(table.xUserId, table.topicId),
  ]
);
