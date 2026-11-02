type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private formatMessage(entry: LogEntry): string {
    const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, entry.message];

    if (entry.context) {
      parts.push(JSON.stringify(entry.context));
    }

    return parts.join(' ');
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;

    if (this.isProduction) {
      return level === 'warn' || level === 'error';
    }

    return false;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createEntry('debug', message, context);
    console.debug(this.formatMessage(entry), context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createEntry('info', message, context);
    console.info(this.formatMessage(entry), context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createEntry('warn', message, context);
    console.warn(this.formatMessage(entry), context);

    if (this.isProduction && window.Sentry) {
      window.Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;

    const entry = this.createEntry('error', message, context, error);
    console.error(this.formatMessage(entry), error, context);

    if (this.isProduction && window.Sentry) {
      if (error) {
        window.Sentry.captureException(error, {
          extra: { message, ...context },
        });
      } else {
        window.Sentry.captureMessage(message, {
          level: 'error',
          extra: context,
        });
      }
    }
  }

  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

export const logger = new Logger();

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: Record<string, unknown>) => void;
      captureMessage: (message: string, options?: Record<string, unknown>) => void;
    };
  }
}
