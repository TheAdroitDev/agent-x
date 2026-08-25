"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function SyncButton() {
    const [status, setStatus] = useState<"idle" | "syncing" | "completed" | "failed">("idle");

    const handleSync = async () => {
        if (status === "syncing") return;
        
        setStatus("syncing");
        try {
            const res = await fetch("/api/sync/trigger", {
                method: "POST",
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Sync failed");
            }

            setStatus("completed");
            
            const summary = data.data?.summary;
            if (summary) {
                toast.success("Sync completed successfully", {
                    description: `${summary.interactionsNew || 0} interactions, ${summary.ownPostsNew || 0} posts found.`,
                });
            } else {
                toast.success("Sync completed successfully");
            }

            setTimeout(() => setStatus("idle"), 3000);
        } catch (error) {
            setStatus("failed");
            toast.error("Manual sync failed", {
                description: error instanceof Error ? error.message : "An unknown error occurred",
            });
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync}
            disabled={status === "syncing"}
            className="flex items-center gap-2"
        >
            {status === "idle" && (
                <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Start Sync</span>
                </>
            )}
            {status === "syncing" && (
                <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Syncing...</span>
                </>
            )}
            {status === "completed" && (
                <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Completed</span>
                </>
            )}
            {status === "failed" && (
                <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>Failed</span>
                </>
            )}
        </Button>
    );
}
