"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ThumbsUp, X, Check, BrainCircuit } from "lucide-react";
import { updateOpportunityStatus } from "@/features/scoring/actions/opportunity-actions";
import { toast } from "sonner";
import { SCORING_WEIGHTS } from "@/common/config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OpportunityCard({ data }: { data: Record<string, any> }) {
  const [isCopied, setIsCopied] = useState(false);
  const [isAltCopied, setIsAltCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { opportunity, post, author, generatedReplies } = data as any;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryReply = (generatedReplies as Record<string, any>[]).find((r) => !r.isAlternative);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const altReply = (generatedReplies as Record<string, any>[]).find((r) => r.isAlternative);

  const handleCopy = async (text: string, isAlt: boolean) => {
    await navigator.clipboard.writeText(text);
    if (isAlt) {
      setIsAltCopied(true);
      setTimeout(() => setIsAltCopied(false), 2000);
    } else {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    toast.success("Reply copied to clipboard");
    await updateOpportunityStatus(opportunity.id, "COPIED");
  };

  const handleOpen = async () => {
    const urlHandle = author.username === "[unknown]" ? "i" : author.username;
    const url = `https://x.com/${urlHandle}/status/${post.xPostId}`;
    window.open(url, "_blank");
    await updateOpportunityStatus(opportunity.id, "OPENED");
  };

  const handleDismiss = async () => {
    await updateOpportunityStatus(opportunity.id, "DISMISSED");
    toast.info("Opportunity dismissed");
  };

  const handleEngaged = async () => {
    await updateOpportunityStatus(opportunity.id, "ENGAGED");
    toast.success("Marked as engaged");
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {author.username === "[unknown]" ? "Unknown author" : author.displayName}
              </CardTitle>
              {author.username !== "[unknown]" && (
                <span className="text-sm text-muted-foreground">@{author.username}</span>
              )}
              {author.isMutual && <Badge variant="secondary" className="text-xs">Mutual</Badge>}
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(post.postedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono bg-primary/5">Score: {opportunity.totalScore}</Badge>
              {opportunity.topicTags?.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} title="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        <div className="text-sm mb-4 p-3 bg-muted/30 rounded-md border-l-2 border-primary/40">
          {post.text}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-sm mt-4">
          <div className="flex flex-col gap-2 p-3 bg-blue-500/5 rounded-md border border-blue-500/10">
            <div className="font-semibold text-blue-500 flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" />
              Why AgentX Selected This
            </div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              <p>
                <strong>Relationship:</strong> {opportunity.relationshipScore}/100 
                <span className="text-muted-foreground/70 ml-1">
                  ({(opportunity.relationshipScore * SCORING_WEIGHTS.relationship).toFixed(1)} pts)
                </span>
              </p>
              <p>
                <strong>Topic Match:</strong> {opportunity.topicRelevanceScore}/100
                <span className="text-muted-foreground/70 ml-1">
                  ({(opportunity.topicRelevanceScore * SCORING_WEIGHTS.topicRelevance).toFixed(1)} pts)
                </span>
              </p>
              <p>
                <strong>Freshness:</strong> {opportunity.freshnessScore}/100
                <span className="text-muted-foreground/70 ml-1">
                  ({(opportunity.freshnessScore * SCORING_WEIGHTS.freshness).toFixed(1)} pts)
                </span>
              </p>
              <p>
                <strong>Fit:</strong> {opportunity.conversationFitScore}/100
                <span className="text-muted-foreground/70 ml-1">
                  ({(opportunity.conversationFitScore * SCORING_WEIGHTS.conversationFit).toFixed(1)} pts)
                </span>
              </p>
            </div>
          </div>

          {opportunity.aiReason && (
            <div className="flex flex-col gap-2 p-3 bg-purple-500/5 rounded-md border border-purple-500/10">
              <div className="font-semibold text-purple-500 flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5" />
                Gemini&apos;s Judgment
              </div>
              <div className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                <p>{opportunity.aiReason}</p>
                {opportunity.conversationAngle && (
                  <p><span className="font-medium text-foreground">Angle:</span> {opportunity.conversationAngle}</p>
                )}
                {opportunity.riskFlags?.length > 0 && (
                  <div className="text-destructive font-medium mt-1">
                    Risks: {opportunity.riskFlags.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {primaryReply && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Reply</div>
              <div className="p-3 bg-background border rounded-md text-sm shadow-sm relative group">
                {primaryReply.replyText}
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(primaryReply.replyText, false)}
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {altReply && (
              <div className="flex flex-col gap-2 mt-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alternative Approach</div>
                <div className="p-3 bg-background border border-dashed rounded-md text-sm relative group">
                  {altReply.replyText}
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(altReply.replyText, true)}
                  >
                    {isAltCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex flex-wrap gap-2">
        <Button variant="default" size="sm" onClick={handleOpen} className="gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          Open in X
        </Button>
        <Button variant="outline" size="sm" onClick={handleEngaged} className="gap-1.5 ml-auto">
          <Check className="h-3.5 w-3.5" />
          Mark Engaged
        </Button>
      </CardFooter>
    </Card>
  );
}
