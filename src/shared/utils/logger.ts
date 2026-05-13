/**
 * Production-safe logger utility
 *
 * Strips console output in production to prevent:
 * - Performance degradation from unnecessary logging
 * - Information leakage via browser console
 * - Sensitive data exposure
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

// In production or test mode, create no-op logger
// In development, use actual console
const createNoOpLogger = () => ({
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
});

const createDevLogger = () => {
  const originalConsole = console;
  const timestamp = () => new Date().toISOString();

  return {
    log: (...args: unknown[]) => originalConsole.log(`[${timestamp()}]`, ...args),
    info: (...args: unknown[]) => originalConsole.info(`[${timestamp()}] [INFO]`, ...args),
    warn: (...args: unknown[]) => originalConsole.warn(`[${timestamp()}] [WARN]`, ...args),
    error: (...args: unknown[]) => originalConsole.error(`[${timestamp()}] [ERROR]`, ...args),
    debug: (...args: unknown[]) => originalConsole.debug(`[${timestamp()}] [DEBUG]`, ...args),
  };
};

/**
 * Production-safe logger
 *
 * In development: Logs with timestamps and log levels
 * In production: All methods are no-ops
 * In tests: All methods are no-ops
 */
export const logger = (isDev || isTest) ? createDevLogger() : createNoOpLogger();

// Export individual methods for convenience
export const log = logger.log.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);

/**
 * Assert-like function that throws in production
 *
 * @param condition - If false, throws an error
 * @param message - Error message to throw
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Log error and rethrow
 *
 * Useful for adding context to errors
 *
 * @param error - The error to log and rethrow
 * @param context - Additional context to log
 * @throws The original error
 */
export function logAndThrow(error: unknown, context?: string): never {
  if (context) {
    logger.error(context, error);
  } else {
    logger.error(error);
  }
  throw error;
}

/**
 * Create a scoped logger with a prefix
 *
 * @param prefix - Prefix to add to all log messages
 * @returns A logger with the prefix applied
 */
export function createScopedLogger(prefix: string) {
  return {
    log: (...args: unknown[]) => logger.log(`[${prefix}]`, ...args),
    info: (...args: unknown[]) => logger.info(`[${prefix}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${prefix}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${prefix}]`, ...args),
    debug: (...args: unknown[]) => logger.debug(`[${prefix}]`, ...args),
  };
}

export default logger;
