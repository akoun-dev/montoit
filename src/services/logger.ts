/**
 * Centralized logging service for Mon Toit platform
 * 
 * Replaces direct console.* calls with structured logging that:
 * - Provides consistent log formatting with timestamps
 * - Sends logs to Sentry in production for monitoring
 * - Allows environment-specific behavior (dev vs production)
 * - Prevents sensitive data leaks in production logs
 * 
 * @example
 * import { logger } from '@/services/logger';
 * 
 * logger.error('Failed to fetch properties', { userId: '123', endpoint: '/api/properties' });
 * logger.logError(error, { context: 'PropertyCard', action: 'delete' });
 */

import * as Sentry from "@sentry/react";

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  error(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('error', message, context);
    
    if (this.isDevelopment) {
      console.error(formattedMessage, context || '');
    } else {
      // Send to Sentry in production
      Sentry.captureException(new Error(message), {
        level: 'error',
        extra: context,
      });
      console.error(formattedMessage, context || '');
    }
  }

  warn(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('warn', message, context);
    
    if (this.isDevelopment) {
      console.warn(formattedMessage, context || '');
    } else {
      // Send warnings as breadcrumbs to Sentry
      Sentry.addBreadcrumb({
        message,
        level: 'warning',
        data: context,
      });
      console.warn(formattedMessage, context || '');
    }
  }

  info(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('info', message, context);
    
    if (this.isDevelopment) {
      console.info(formattedMessage, context || '');
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('debug', message, context);
      console.debug(formattedMessage, context || '');
    }
  }

  /**
   * Parse and log any error type with full context
   */
  logError(error: unknown, context?: LogContext): void {
    const errorInfo = this.parseError(error);
    
    // Send to Sentry in production with full error object
    if (!this.isDevelopment) {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          errorType: errorInfo.type,
          errorCode: errorInfo.code,
        },
        extra: {
          ...context,
          stack: errorInfo.stack,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });
    }
    
    this.error(errorInfo.message, {
      ...context,
      stack: errorInfo.stack,
      code: errorInfo.code,
      type: errorInfo.type,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  /**
   * Parse error from various formats
   */
  private parseError(error: unknown): { 
    message: string; 
    stack?: string; 
    code?: string; 
    type: string;
  } {
    if (error instanceof Error) {
      return { 
        message: error.message, 
        stack: error.stack,
        code: (error as any).code,
        type: error.name,
      };
    }
    
    if (typeof error === 'string') {
      return { message: error, type: 'string' };
    }
    
    if (error && typeof error === 'object') {
      const err = error as any;
      return {
        message: err.message || err.error_description || JSON.stringify(error),
        code: err.code || err.error,
        type: 'object',
      };
    }
    
    return { message: 'Unknown error', type: 'unknown' };
  }
}

export const logger = new Logger();
