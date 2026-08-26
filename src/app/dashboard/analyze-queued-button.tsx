
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AnalyzeQueuedButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleAnalyze = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const res = await fetch("/api/sync/analyze-queued", { method: "POST" });
            const data = await res.json();
            
            if (!res.ok) {
                setMessage(data.error || "Analysis failed - try again");
                return;
            }

            if (data.quotaExhausted) {
                setMessage("No Gemini analyses remaining today");
            } else if (data.analyzedCount === 0) {
                setMessage("No queued opportunities");
            } else {
                setMessage(`Analyzed ${data.analyzedCount} opportunities`);
            }
            router.refresh();
        } catch (_err) {
            setMessage("Analysis failed - try again");
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                )}
                {isLoading ? "Analyzing..." : "Analyze Queued"}
            </Button>
            {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
    );
}

