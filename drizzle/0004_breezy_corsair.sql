CREATE TABLE "sync_run_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"level" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "quality_threshold" SET DEFAULT 40;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "max_daily_x_cost_cents" SET DEFAULT 140;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "max_daily_ai_analyses" SET DEFAULT 30;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD COLUMN "funnel_metrics" jsonb;--> statement-breakpoint
ALTER TABLE "sync_run_logs" ADD CONSTRAINT "sync_run_logs_run_id_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."sync_runs"("id") ON DELETE cascade ON UPDATE no action;