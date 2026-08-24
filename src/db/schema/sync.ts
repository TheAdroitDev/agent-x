import { pgTable, text, varchar, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobName: varchar("job_name", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // RUNNING | COMPLETED | FAILED | STOPPED
  postsFetched: integer("posts_fetched").default(0).notNull(),
  postsNew: integer("posts_new").default(0).notNull(),
  usersFetched: integer("users_fetched").default(0).notNull(),
  errors: integer("errors").default(0).notNull(),
  errorLog: text("error_log"),
  xCostCents: integer("x_cost_cents").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
