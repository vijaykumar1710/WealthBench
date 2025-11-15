type LogLevel = "info" | "error" | "warn" | "debug";

interface Logger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

function log(level: LogLevel, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case "error":
      console.error(prefix, ...args);
      break;
    case "warn":
      console.warn(prefix, ...args);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.log(prefix, ...args);
      }
      break;
    case "info":
    default:
      console.log(prefix, ...args);
      break;
  }
}

export const logger: Logger = {
  info: (...args: unknown[]) => log("info", ...args),
  error: (...args: unknown[]) => log("error", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  debug: (...args: unknown[]) => log("debug", ...args),
};

