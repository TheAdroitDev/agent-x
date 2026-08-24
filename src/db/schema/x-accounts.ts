import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { commonColumns } from "./common";

export const xAccounts = pgTable("x_accounts", {
  ...commonColumns,
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  xUserId: varchar("x_user_id", { length: 64 }).notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  profileImage: text("profile_image"),
  bio: text("bio"),
  followersCount: integer("followers_count").default(0).notNull(),
  followingCount: integer("following_count").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  followingSyncedAt: timestamp("following_synced_at", { withTimezone: true }),
});
