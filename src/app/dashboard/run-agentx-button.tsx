"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

type RunState = "idle" | "running" | "needsFallbackConfirmation" | "resumingFallback" | "canceling" | "completed" | "failed";

export function RunAgentXButton() {
    const [status, setStatus] = useState<RunState>("idle");
    const [runId, setRunId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [runData, setRunData] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [logs, setLogs] = useState<any[]>([]);
    const [panelOpen, setPanelOpen] = useState(false);
    const [logsExpanded, setLogsExpanded] = useState(false);

    const [isUsingFallback, setIsUsingFallback] = useState(false);

    const handleRun = async () => {
        if (status === "running") return;
        
        setStatus("running");
        setIsUsingFallback(false);
        setPanelOpen(true);
        setLogs([]);
        setRunData(null);
        
        try {
            const res = await fetch("/api/sync/run-all", { method: "POST" });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setStatus("failed");
                toast.error("AgentX Run Failed", { description: data.error });
                return;
            }

            setRunId(data.runId);
        } catch {
            setStatus("failed");
            toast.error("AgentX Run Failed", { description: "Network error" });
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (runId && (status === "running" || status === "needsFallbackConfirmation" || status === "resumingFallback" || status === "canceling")) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/sync/run-logs?runId=${runId}`);
                    const data = await res.json();
                    if (data.success) {
                        setRunData(data.run);
                        setLogs(data.logs);
                        if (data.run?.status === "COMPLETED") {
                            setStatus("completed");
                            clearInterval(interval);
                        } else if (data.run?.status === "FAILED") {
                            setStatus("failed");
                            clearInterval(interval);
                        } else if (data.run?.status === "NEEDS_FALLBACK") {
                            if (status !== "needsFallbackConfirmation" && status !== "resumingFallback" && status !== "canceling") {
                                setStatus("needsFallbackConfirmation");
                            }
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [runId, status]);

    const handleContinueFallback = async () => {
        if (!runId) return;
        setStatus("resumingFallback");
        setIsUsingFallback(true);
        try {
            const res = await fetch("/api/sync/resolve-fallback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ runId, confirm: true })
            });
            if (res.ok) {
                setStatus("running");
            } else {
                setStatus("failed");
            }
        } catch {
            setStatus("failed");
        }
    };

    const handleCancelFallback = async () => {
        if (!runId) return;
        setStatus("canceling");
        try {
            const res = await fetch("/api/sync/resolve-fallback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ runId, confirm: false })
            });
            if (res.ok) {
                setStatus("running");
            } else {
                setStatus("failed");
            }
        } catch {
            setStatus("failed");
        }
    };

    const metrics = runData?.funnelMetrics || {};

    const isRunningState = status === "running" || status === "resumingFallback" || status === "canceling" || status === "needsFallbackConfirmation";

    return (
        <>
            <Button 
                variant="default" 
                size="sm" 
                onClick={handleRun}
                disabled={isRunningState}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
                {isRunningState ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>{isRunningState ? "Running..." : "Run AgentX"}</span>
            </Button>

            {panelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-background shadow-xl relative">
                        {status === "needsFallbackConfirmation" && (
                            <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center p-4">
                                <Card className="w-full max-w-md shadow-xl border-border bg-background">
                                    <CardHeader className="flex flex-row items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                        <CardTitle>Primary Gemini quota reached</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Gemini has no remaining daily capacity on the primary model (Gemini 3.6 Flash).<br/><br/>
                                            Would you like to continue with Gemini 3.5 Flash-Lite?
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={handleCancelFallback}>
                                            Stop analysis
                                        </Button>
                                        <Button onClick={handleContinueFallback} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                                            Continue with fallback
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
                            <CardTitle>
                                AgentX Pipeline 
                                {isRunningState && <RefreshCw className="inline ml-2 h-4 w-4 animate-spin" />}
                                {isUsingFallback ? (
                                    <span className="ml-2 text-xs font-normal text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">Using Gemini 3.5 Flash-Lite</span>
                                ) : (
                                    (status === "running" || status === "completed") ? (
                                        <span className="ml-2 text-xs font-normal text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">Using Gemini 3.6 Flash</span>
                                    ) : null
                                )}
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setPanelOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0 flex flex-col">
                            <div className="p-4 space-y-6">
                                {/* Phases Summary */}
                                <div>
                                    <h3 className="font-semibold mb-2">Progress</h3>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span>Owned sync</span>
                                            <span>{status === "completed" || metrics.discovered > 0 ? "✓ complete" : "⟳ running..."}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Pre-filter</span>
                                            <span>{metrics.filtered > 0 || metrics.scored > 0 ? `✓ ${metrics.discovered} → ${metrics.discovered - metrics.filtered}` : (metrics.discovered > 0 ? "⟳ analyzing..." : "-")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Scoring</span>
                                            <span>{metrics.scored > 0 ? `✓ ${metrics.scored} scored / ${metrics.saved} saved` : (metrics.filtered > 0 ? "⟳ scoring..." : "-")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Gemini</span>
                                            <span>{metrics.sentToGemini > 0 ? `✓ ${metrics.sentToGemini} analyzed` : (metrics.saved > 0 ? "⟳ queued/analyzing..." : "-")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Funnel Metrics */}
                                {status === "completed" && (
                                    <div className="bg-secondary/50 p-4 rounded-md text-sm">
                                        <h3 className="font-semibold mb-2">Opportunity Funnel Summary</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p>Discovered: {metrics.discovered || 0}</p>
                                                <p>Filtered: {metrics.filtered || 0}</p>
                                                <div className="pl-4 text-xs text-muted-foreground">
                                                    <p>Own posts: {metrics.filterReasons?.ownPosts || 0}</p>
                                                    <p>Retweets: {metrics.filterReasons?.retweets || 0}</p>
                                                    <p>Stale: {metrics.filterReasons?.stale || 0}</p>
                                                    <p>Spam: {metrics.filterReasons?.spam || 0}</p>
                                                    <p>Weak: {metrics.filterReasons?.weakReplies || 0}</p>
                                                    <p>Nested: {metrics.filterReasons?.nestedReplies || 0}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p>Scored: {metrics.scored || 0}</p>
                                                <p>Saved: {metrics.saved || 0}</p>
                                                <p>Sent to Gemini: {metrics.sentToGemini || 0}</p>
                                                <p>Queued: {metrics.queued || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Live Logs */}
                            <div className="border-t">
                                <div 
                                    className="px-4 py-2 bg-secondary/30 flex items-center justify-between cursor-pointer"
                                    onClick={() => setLogsExpanded(!logsExpanded)}
                                >
                                    <span className="font-medium text-sm">Live Logs</span>
                                    {logsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                                {logsExpanded && (
                                    <div className="bg-black text-green-400 font-mono text-xs p-4 h-64 overflow-y-auto space-y-1">
                                        {logs.map((log) => (
                                            <div key={log.id} className={log.level === "ERROR" ? "text-red-400" : log.level === "WARN" ? "text-yellow-400" : ""}>
                                                [{new Date(log.createdAt).toLocaleTimeString()}] [{log.level}] {log.message}
                                            </div>
                                        ))}
                                        {logs.length === 0 && <div className="text-muted-foreground">Waiting for logs...</div>}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}

