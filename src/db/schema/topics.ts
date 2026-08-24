import { pgTable, text, varchar, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  keywords: text("keywords").array().notNull().default([]),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
