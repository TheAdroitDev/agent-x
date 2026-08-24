type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private format(level: LogLevel, message: string, context?: string, data?: unknown): string {
    const payload: LogPayload = {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(payload);
  }

  debug(message: string, context?: string, data?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[DEBUG][${context || "App"}] ${message}`, data !== undefined ? data : "");
    }
  }

  info(message: string, context?: string, data?: unknown) {
    console.log(`[INFO][${context || "App"}] ${message}`, data !== undefined ? data : "");
  }

  warn(message: string, context?: string, data?: unknown) {
    console.warn(`[WARN][${context || "App"}] ${message}`, data !== undefined ? data : "");
  }

  error(message: string, context?: string, error?: unknown) {
    console.error(`[ERROR][${context || "App"}] ${message}`, error !== undefined ? error : "");
  }
}

export const logger = new Logger();
