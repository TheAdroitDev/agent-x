import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { commonColumns } from "./common";

export const xUsers = pgTable("x_users", {
  ...commonColumns,
  xUserId: varchar("x_user_id", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  profileImage: text("profile_image"),
  bio: text("bio"),
  followersCount: integer("followers_count").default(0).notNull(),
  followingCount: integer("following_count").default(0).notNull(),
  isFollowing: boolean("is_following").default(false).notNull(),
  isFollower: boolean("is_follower").default(false).notNull(),
  isMutual: boolean("is_mutual").default(false).notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  relationshipScore: integer("relationship_score").default(0).notNull(),
});
