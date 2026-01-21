/**
 * Structured logger for Deno Edge Functions
 * Provides consistent logging format with context support
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: string;
  stack?: string;
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ];

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }

  if (entry.error) {
    parts.push(`Error: ${entry.error}`);
  }

  return parts.join(' ');
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    error: error?.message,
    stack: error?.stack,
  };
}

export const edgeLogger = {
  debug(message: string, context?: LogContext): void {
    const entry = createEntry('debug', message, context);
    console.debug(formatEntry(entry));
  },

  info(message: string, context?: LogContext): void {
    const entry = createEntry('info', message, context);
    console.info(formatEntry(entry));
  },

  warn(message: string, context?: LogContext): void {
    const entry = createEntry('warn', message, context);
    console.warn(formatEntry(entry));
  },

  error(message: string, error?: Error, context?: LogContext): void {
    const entry = createEntry('error', message, context, error);
    console.error(formatEntry(entry));
    if (error?.stack) {
      console.error(error.stack);
    }
  },
};

export default edgeLogger;
