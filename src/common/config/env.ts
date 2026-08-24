import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection URL"),
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 characters long"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  TWITTER_CLIENT_ID: z.string().min(1, "TWITTER_CLIENT_ID is required"),
  TWITTER_CLIENT_SECRET: z.string().min(1, "TWITTER_CLIENT_SECRET is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-3.7-flash"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // During build / client evaluation, allow fallback if in non-server context
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    // Only throw in runtime, not during static analysis if values are missing in dev
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables. Check logs for details.");
    }
  }

  return (parsed.data || process.env) as Env;
}

export const env = validateEnv();
