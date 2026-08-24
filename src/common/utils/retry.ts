import { logger } from "./logger";

interface RetryOptions {
  retries?: number;
  minTimeoutMs?: number;
  maxTimeoutMs?: number;
  factor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  context = "Operation",
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minTimeoutMs = 1000,
    maxTimeoutMs = 10000,
    factor = 2,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;
  let delay = minTimeoutMs;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries || !shouldRetry(error)) {
        logger.error(`Retry exhausted after ${attempt - 1} retries for ${context}`, "Retry", error);
        throw error;
      }

      logger.warn(
        `Attempt ${attempt} failed for ${context}. Retrying in ${delay}ms...`,
        "Retry",
        error instanceof Error ? error.message : error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxTimeoutMs);
    }
  }

  throw new Error(`Unexpected retry exit for ${context}`);
}
