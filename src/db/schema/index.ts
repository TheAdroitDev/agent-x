import { relations } from "drizzle-orm";
import { user, session, account } from "./auth";
import { xAccounts } from "./x-accounts";
import { topics } from "./topics";
import { userTopics } from "./user-topics";
import { xUserTopics } from "./x-user-topics";
import { posts } from "./posts";
import { interactions } from "./interactions";
import { opportunities } from "./opportunities";
import { generatedReplies } from "./generated-replies";
import { postIdeas } from "./post-ideas";
import { syncRuns } from "./sync";
import { apiUsage } from "./usage";
import { settings } from "./settings";

// Re-export all tables
export * from "./common";
export * from "./auth";
export * from "./x-accounts";
export * from "./x-users";
export * from "./topics";
export * from "./user-topics";
export * from "./x-user-topics";
export * from "./posts";
export * from "./interactions";
export * from "./opportunities";
export * from "./generated-replies";
export * from "./post-ideas";
export * from "./sync";
export * from "./usage";
export * from "./settings";

// Relations
export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  xAccount: one(xAccounts, {
    fields: [user.id],
    references: [xAccounts.userId],
  }),
  settings: one(settings, {
    fields: [user.id],
    references: [settings.userId],
  }),
  userTopics: many(userTopics),
  opportunities: many(opportunities),
  interactions: many(interactions),
  postIdeas: many(postIdeas),
  syncRuns: many(syncRuns),
  apiUsage: many(apiUsage),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const xAccountsRelations = relations(xAccounts, ({ one }) => ({
  user: one(user, {
    fields: [xAccounts.userId],
    references: [user.id],
  }),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  userTopics: many(userTopics),
  xUserTopics: many(xUserTopics),
}));

export const userTopicsRelations = relations(userTopics, ({ one }) => ({
  user: one(user, {
    fields: [userTopics.userId],
    references: [user.id],
  }),
  topic: one(topics, {
    fields: [userTopics.topicId],
    references: [topics.id],
  }),
}));

export const xUserTopicsRelations = relations(xUserTopics, ({ one }) => ({
  topic: one(topics, {
    fields: [xUserTopics.topicId],
    references: [topics.id],
  }),
}));

export const postsRelations = relations(posts, ({ many }) => ({
  interactions: many(interactions),
  opportunities: many(opportunities),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  user: one(user, {
    fields: [interactions.userId],
    references: [user.id],
  }),
  post: one(posts, {
    fields: [interactions.postId],
    references: [posts.id],
  }),
}));

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  user: one(user, {
    fields: [opportunities.userId],
    references: [user.id],
  }),
  post: one(posts, {
    fields: [opportunities.postId],
    references: [posts.id],
  }),
  generatedReplies: many(generatedReplies),
}));

export const generatedRepliesRelations = relations(generatedReplies, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [generatedReplies.opportunityId],
    references: [opportunities.id],
  }),
}));

export const postIdeasRelations = relations(postIdeas, ({ one }) => ({
  user: one(user, {
    fields: [postIdeas.userId],
    references: [user.id],
  }),
}));

export const syncRunsRelations = relations(syncRuns, ({ one }) => ({
  user: one(user, {
    fields: [syncRuns.userId],
    references: [user.id],
  }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  user: one(user, {
    fields: [apiUsage.userId],
    references: [user.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, {
    fields: [settings.userId],
    references: [user.id],
  }),
}));
