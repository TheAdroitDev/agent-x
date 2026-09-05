export interface ApiResponse<T> {
    success: true;
    data: T;
    meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        details?: unknown;
    };
}

export type BudgetCategory = "OWNED" | "NICHE" | "NETWORK" | "FOLLOWING_SYNC";

export interface OperationEstimate {
    operation: string;
    category: BudgetCategory;
    estimatedPosts: number;
    postCostCents: number;
    estimatedNewUsers: number;
    userCostCents: number;
    estimatedCostCents: number;
}

export interface BudgetDecision {
    approved: boolean;
    reason: string;
    remainingDaily: number;
    remainingMonthly: number;
}

export interface ScoreBreakdown {
    relationship: number;
    topicRelevance: number;
    freshness: number;
    conversationFit: number;
    authorRelevance: number;
    engagement: number;
    total: number;
}

export interface StructuredReplyAnalysis {
    worthReplying: boolean;
    confidence: number;
    reason: string;
    conversationAngle: string;
    suggestedReply: string;
    alternativeReply?: string;
    replyType:
        "experience" | "question" | "contrarian" | "value_add" | "insight";
    riskFlags: string[];
    topicTags: string[];
}

export interface StructuredPostIdea {
    hook: string;
    coreIdea: string;
    angle: string;
    draft: string;
    whyNow: string;
    sourcePostIds?: string[];
}
