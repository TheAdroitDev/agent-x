import { pgTable, text, varchar, integer, timestamp, date, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const apiUsage = pgTable("api_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  service: varchar("service", { length: 20 }).notNull(), // x_api | gemini
  endpoint: varchar("endpoint", { length: 100 }).notNull(),
  resourcesCount: integer("resources_count").default(1).notNull(),
  costCents: integer("cost_cents").default(0).notNull(), // in hundredths of a cent for precision (100 = 1 cent)
  tokensUsed: integer("tokens_used"),
  requestDate: date("request_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
