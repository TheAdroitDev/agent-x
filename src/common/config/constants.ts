export const DEFAULT_LIMITS = {
  // X API Budget Limits (in cents)
  MAX_DAILY_X_COST_CENTS: 35, // $0.35/day
  MAX_MONTHLY_X_COST_CENTS: 1000, // $10.00/month (hard cap)

  // AI Limits (Configurable)
  MAX_AI_ANALYSES_PER_RUN: 40,
  MAX_DAILY_AI_ANALYSES: 100,

  // Opportunity & Post Ideas Thresholds
  QUALITY_THRESHOLD: 75,
  DAILY_RECOMMENDED_MAX: 30,
  DAILY_POST_IDEAS_MAX: 3,
  MAX_OPPORTUNITIES_PER_AUTHOR: 3, // Diversity cap per day

  // Pipeline Sync Limits
  MAX_POST_READS_PER_RUN: 100,
  MAX_CANDIDATES_PER_RUN: 50,
} as const;

export const X_API_COSTS = {
  OWNED_RESOURCE_COST_CENTS: 0.1, // $0.001
  STANDARD_POST_COST_CENTS: 0.5, // $0.005
  STANDARD_USER_COST_CENTS: 1.0, // $0.010
} as const;

export const SCORING_WEIGHTS = {
  relationship: 0.3,
  topicRelevance: 0.25,
  freshness: 0.2,
  conversationFit: 0.15,
  authorRelevance: 0.05,
  engagement: 0.05,
} as const;

export const RELATIONSHIP_FACTORS = {
  mutualFollow: 35,
  recentInteraction: 25,
  multipleInteractions: 20,
  bidirectional: 15,
  topicOverlap: 5,
} as const;

export const DEFAULT_VOICE_PROFILE = {
  voiceTone: ["casual", "technical", "concise"],
  voiceStyle: ["short_paragraphs", "specific_examples"],
  voiceAvoid: ["generic_praise", "fake_enthusiasm", "corporate_language"],
} as const;

export const OPPORTUNITY_STATUS = {
  NEW: "NEW",
  VIEWED: "VIEWED",
  OPENED: "OPENED",
  COPIED: "COPIED",
  ENGAGED: "ENGAGED",
  DISMISSED: "DISMISSED",
  EXPIRED: "EXPIRED",
} as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[keyof typeof OPPORTUNITY_STATUS];

export const SYNC_STATUS = {
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  STOPPED: "STOPPED",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];
