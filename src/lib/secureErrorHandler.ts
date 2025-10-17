/**
 * Secure Error Handler
 *
 * Provides secure error handling that prevents information leakage:
 * - Sanitizes error messages for public consumption
 * - Logs detailed errors securely
 * - Provides user-friendly error messages
 * - Prevents sensitive data exposure
 * - Tracks error patterns for security monitoring
 */

import { SecurityMonitor } from './security';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error categories for security classification
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  FILE_UPLOAD = 'file_upload',
  RATE_LIMIT = 'rate_limit',
  SYSTEM = 'system',
  SECURITY = 'security',
  BUSINESS_LOGIC = 'business_logic'
}

// Secure error interface
export interface SecureError {
  code: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  details?: any;
  timestamp: number;
  requestId?: string;
  userId?: string;
  ip?: string;
}

// Error code mappings for security
const ERROR_CODE_MAPPINGS: Record<string, Partial<SecureError>> = {
  // Authentication errors
  'AUTH_REQUIRED': {
    code: 'AUTH_001',
    userMessage: 'Vous devez être connecté pour effectuer cette action',
    category: ErrorCategory.AUTHENTICATION,
    severity: 'medium'
  },
  'AUTH_INVALID_CREDENTIALS': {
    code: 'AUTH_002',
    userMessage: 'Email ou mot de passe incorrect',
    category: ErrorCategory.AUTHENTICATION,
    severity: 'medium'
  },
  'AUTH_SESSION_EXPIRED': {
    code: 'AUTH_003',
    userMessage: 'Votre session a expiré. Veuillez vous reconnecter.',
    category: ErrorCategory.AUTHENTICATION,
    severity: 'medium'
  },
  'AUTH_INSUFFICIENT_PERMISSIONS': {
    code: 'AUTH_004',
    userMessage: "Vous n'avez pas les permissions nécessaires pour effectuer cette action",
    category: ErrorCategory.AUTHORIZATION,
    severity: 'medium'
  },

  // Validation errors
  'VALIDATION_REQUIRED_FIELD': {
    code: 'VAL_001',
    userMessage: 'Ce champ est obligatoire',
    category: ErrorCategory.VALIDATION,
    severity: 'low'
  },
  'VALIDATION_INVALID_FORMAT': {
    code: 'VAL_002',
    userMessage: 'Le format de cette donnée est invalide',
    category: ErrorCategory.VALIDATION,
    severity: 'low'
  },
  'VALIDATION_FILE_TOO_LARGE': {
    code: 'VAL_003',
    userMessage: 'Le fichier est trop volumineux',
    category: ErrorCategory.FILE_UPLOAD,
    severity: 'medium'
  },
  'VALIDATION_INVALID_FILE_TYPE': {
    code: 'VAL_004',
    userMessage: 'Ce type de fichier n\'est pas autorisé',
    category: ErrorCategory.FILE_UPLOAD,
    severity: 'medium'
  },

  // Network errors
  'NETWORK_CONNECTION_FAILED': {
    code: 'NET_001',
    userMessage: 'Erreur de connexion. Veuillez vérifier votre connexion internet.',
    category: ErrorCategory.NETWORK,
    severity: 'medium'
  },
  'NETWORK_TIMEOUT': {
    code: 'NET_002',
    userMessage: 'La requête a expiré. Veuillez réessayer.',
    category: ErrorCategory.NETWORK,
    severity: 'medium'
  },
  'NETWORK_SERVER_ERROR': {
    code: 'NET_003',
    userMessage: 'Erreur serveur. Veuillez réessayer plus tard.',
    category: ErrorCategory.NETWORK,
    severity: 'high'
  },

  // Database errors
  'DATABASE_CONNECTION_FAILED': {
    code: 'DB_001',
    userMessage: 'Service temporairement indisponible. Veuillez réessayer plus tard.',
    category: ErrorCategory.DATABASE,
    severity: 'high'
  },
  'DATABASE_CONSTRAINT_VIOLATION': {
    code: 'DB_002',
    userMessage: 'Données invalides. Veuillez vérifier les informations saisies.',
    category: ErrorCategory.DATABASE,
    severity: 'medium'
  },
  'DATABASE_RECORD_NOT_FOUND': {
    code: 'DB_003',
    userMessage: 'Ressource introuvable',
    category: ErrorCategory.DATABASE,
    severity: 'low'
  },

  // Rate limiting errors
  'RATE_LIMIT_EXCEEDED': {
    code: 'RATE_001',
    userMessage: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
    category: ErrorCategory.RATE_LIMIT,
    severity: 'medium'
  },

  // Business logic errors
  'BUSINESS_PROPERTY_NOT_FOUND': {
    code: 'BIZ_001',
    userMessage: 'Propriété introuvable',
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: 'low'
  },
  'BUSINESS_APPLICATION_EXISTS': {
    code: 'BIZ_002',
    userMessage: 'Vous avez déjà postulé pour cette propriété',
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: 'low'
  },
  'BUSINESS_INVALID_STATUS': {
    code: 'BIZ_003',
    userMessage: 'Cette action n\'est pas possible dans l\'état actuel',
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: 'medium'
  }
};

/**
 * Secure Error Handler Class
 */
export class SecureErrorHandler {
  private static requestIdCounter = 0;

  /**
   * Handle error securely
   */
  static handleError(
    error: Error | string | any,
    context: {
      userId?: string;
      ip?: string;
      endpoint?: string;
      method?: string;
      body?: any;
      userAgent?: string;
    } = {}
  ): SecureError {
    const requestId = this.generateRequestId();
    const errorObj = this.parseError(error);

    // Determine error category and severity
    const category = this.categorizeError(errorObj, context);
    const severity = this.determineSeverity(errorObj, category, context);

    // Create secure error
    const secureError: SecureError = {
      code: this.generateErrorCode(errorObj, category),
      message: this.sanitizeErrorMessage(errorObj.message),
      userMessage: this.generateUserFriendlyMessage(errorObj, category),
      category,
      severity,
      timestamp: Date.now(),
      requestId,
      userId: context.userId,
      ip: context.ip
    };

    // Log securely
    this.logErrorSecurely(secureError, errorObj, context);

    // Track error patterns for security monitoring
    this.trackErrorPattern(secureError, context);

    return secureError;
  }

  /**
   * Create user-friendly response from error
   */
  static createErrorResponse(error: SecureError): {
    error: string;
    code: string;
    message: string;
    requestId: string;
  } {
    return {
      error: error.userMessage,
      code: error.code,
      message: error.userMessage,
      requestId: error.requestId || ''
    };
  }

  /**
   * Check if error should be exposed to user
   */
  static shouldExposeError(error: SecureError): boolean {
    // Don't expose system errors or security-sensitive errors
    const sensitiveCategories = [
      ErrorCategory.DATABASE,
      ErrorCategory.SYSTEM,
      ErrorCategory.SECURITY
    ];

    return !sensitiveCategories.includes(error.category) || error.severity === 'low';
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(timeWindowMs: number = 24 * 60 * 60 * 1000): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: Array<{ code: string; count: number; message: string }>;
  } {
    const metrics = SecurityMonitor.getMetrics();

    // This would typically query your error tracking system
    // For now, return placeholder data
    return {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      topErrors: []
    };
  }

  // Private helper methods

  private static parseError(error: Error | string | any): {
    message: string;
    stack?: string;
    code?: string;
    type: string;
    details?: any;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        type: error.name,
        details: (error as any).details
      };
    }

    if (typeof error === 'string') {
      return { message: error, type: 'string' };
    }

    if (error && typeof error === 'object') {
      return {
        message: error.message || error.error_description || JSON.stringify(error),
        code: error.code || error.error,
        type: 'object',
        details: error
      };
    }

    return { message: 'Unknown error', type: 'unknown' };
  }

  private static categorizeError(
    errorObj: any,
    context: any
  ): ErrorCategory {
    const message = errorObj.message.toLowerCase();
    const code = errorObj.code?.toLowerCase();

    // Check for authentication errors
    if (message.includes('auth') || message.includes('login') || message.includes('session') ||
        code?.includes('auth') || context.endpoint?.includes('/auth')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Check for authorization errors
    if (message.includes('permission') || message.includes('unauthorized') ||
        code?.includes('permission') || code?.includes('403')) {
      return ErrorCategory.AUTHORIZATION;
    }

    // Check for validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required') ||
        code?.includes('validation') || code?.includes('400')) {
      return ErrorCategory.VALIDATION;
    }

    // Check for network errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout') ||
        code?.includes('network') || code?.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }

    // Check for database errors
    if (message.includes('database') || message.includes('sql') || message.includes('constraint') ||
        code?.includes('database') || code?.includes('sql')) {
      return ErrorCategory.DATABASE;
    }

    // Check for file upload errors
    if (message.includes('file') || message.includes('upload') || context.endpoint?.includes('/upload')) {
      return ErrorCategory.FILE_UPLOAD;
    }

    // Check for rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests') ||
        code?.includes('rate') || code?.includes('429')) {
      return ErrorCategory.RATE_LIMIT;
    }

    // Check for security errors
    if (message.includes('security') || message.includes('blocked') || message.includes('suspicious') ||
        code?.includes('security') || code?.includes('blocked')) {
      return ErrorCategory.SECURITY;
    }

    // Default to system error
    return ErrorCategory.SYSTEM;
  }

  private static determineSeverity(
    errorObj: any,
    category: ErrorCategory,
    context: any
  ): ErrorSeverity {
    // High severity categories
    if ([ErrorCategory.SECURITY, ErrorCategory.DATABASE].includes(category)) {
      return 'high';
    }

    // Critical errors
    if (errorObj.message.includes('critical') || errorObj.code?.includes('critical')) {
      return 'critical';
    }

    // Medium severity categories
    if ([ErrorCategory.AUTHENTICATION, ErrorCategory.AUTHORIZATION, ErrorCategory.NETWORK].includes(category)) {
      return 'medium';
    }

    // Low severity by default
    return 'low';
  }

  private static generateErrorCode(errorObj: any, category: ErrorCategory): string {
    // Try to find existing mapping
    const messageKey = this.findMessageKey(errorObj.message);
    if (messageKey && ERROR_CODE_MAPPINGS[messageKey]) {
      return ERROR_CODE_MAPPINGS[messageKey].code || `${category.toUpperCase()}_999`;
    }

    // Generate generic code
    const categoryPrefix = category.toUpperCase().substring(0, 3);
    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    return `${categoryPrefix}_${randomSuffix}`;
  }

  private static findMessageKey(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    for (const [key, mapping] of Object.entries(ERROR_CODE_MAPPINGS)) {
      if (lowerMessage.includes(key.toLowerCase()) ||
          lowerMessage.includes(mapping.userMessage?.toLowerCase() || '')) {
        return key;
      }
    }

    return null;
  }

  private static sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    let sanitized = message;

    // Remove file paths
    sanitized = sanitized.replace(/\/[^\s]+/g, '[path]');

    // Remove email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]');

    // Remove phone numbers
    sanitized = sanitized.replace(/\b\d{10,}\b/g, '[phone]');

    // Remove database connection strings
    sanitized = sanitized.replace(/postgresql:\/\/[^\s]+/g, '[database]');

    // Remove API keys and tokens
    sanitized = sanitized.replace(/\b[A-Za-z0-9]{20,}\b/g, '[token]');

    return sanitized;
  }

  private static generateUserFriendlyMessage(errorObj: any, category: ErrorCategory): string {
    const messageKey = this.findMessageKey(errorObj.message);
    if (messageKey && ERROR_CODE_MAPPINGS[messageKey]) {
      return ERROR_CODE_MAPPINGS[messageKey].userMessage || 'Une erreur est survenue';
    }

    // Default messages by category
    const defaultMessages: Record<ErrorCategory, string> = {
      [ErrorCategory.AUTHENTICATION]: 'Erreur d\'authentification',
      [ErrorCategory.AUTHORIZATION]: 'Erreur d\'autorisation',
      [ErrorCategory.VALIDATION]: 'Données invalides',
      [ErrorCategory.NETWORK]: 'Erreur de connexion',
      [ErrorCategory.DATABASE]: 'Service temporairement indisponible',
      [ErrorCategory.FILE_UPLOAD]: 'Erreur lors du téléchargement',
      [ErrorCategory.RATE_LIMIT]: 'Veuillez patienter avant de réessayer',
      [ErrorCategory.SYSTEM]: 'Erreur système',
      [ErrorCategory.SECURITY]: 'Erreur de sécurité',
      [ErrorCategory.BUSINESS_LOGIC]: 'Action non autorisée'
    };

    return defaultMessages[category] || 'Une erreur est survenue';
  }

  private static generateRequestId(): string {
    return `ERR_${Date.now()}_${++this.requestIdCounter}`;
  }

  private static logErrorSecurely(
    secureError: SecureError,
    originalError: any,
    context: any
  ): void {
    // Log to security monitoring system
    SecurityMonitor.logEvent('SECURE_ERROR', {
      errorId: secureError.requestId,
      code: secureError.code,
      category: secureError.category,
      severity: secureError.severity,
      sanitizedMessage: secureError.message,
      userId: context.userId,
      ip: context.ip,
      endpoint: context.endpoint,
      method: context.method,
      userAgent: context.userAgent
    }, secureError.severity);

    // Log detailed error information (only in development or secure logging)
    if (import.meta.env.DEV) {
      console.error('Detailed Error:', {
        secureError,
        originalError,
        context
      });
    } else {
      // In production, log minimal information
      console.error('Error:', {
        code: secureError.code,
        requestId: secureError.requestId,
        category: secureError.category,
        severity: secureError.severity
      });
    }
  }

  private static trackErrorPattern(error: SecureError, context: any): void {
    // Track error patterns for security monitoring
    if (error.severity === 'high' || error.severity === 'critical') {
      SecurityMonitor.logEvent('HIGH_SEVERITY_ERROR', {
        code: error.code,
        category: error.category,
        userId: context.userId,
        ip: context.ip,
        endpoint: context.endpoint
      }, 'high');
    }

    // Track repeated errors from same IP or user
    if (context.ip || context.userId) {
      const identifier = context.userId || context.ip;
      SecurityMonitor.logEvent('REPEATED_ERROR', {
        code: error.code,
        category: error.category,
        identifier,
        timestamp: error.timestamp
      }, 'medium');
    }
  }
}

/**
 * Global error handler wrapper
 */
export function handleSecureError(
  error: Error | string | any,
  context: {
    userId?: string;
    ip?: string;
    endpoint?: string;
    method?: string;
    body?: any;
    userAgent?: string;
  } = {}
): SecureError {
  return SecureErrorHandler.handleError(error, context);
}

/**
 * Express middleware for secure error handling
 */
export function secureErrorHandlerMiddleware() {
  return (error: Error, req: any, res: any, next: any) => {
    const secureError = SecureErrorHandler.handleError(error, {
      userId: req.user?.id,
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });

    const errorResponse = SecureErrorHandler.createErrorResponse(secureError);

    // Set appropriate status code based on error category
    let statusCode = 500;
    switch (secureError.category) {
      case ErrorCategory.AUTHENTICATION:
        statusCode = 401;
        break;
      case ErrorCategory.AUTHORIZATION:
        statusCode = 403;
        break;
      case ErrorCategory.VALIDATION:
        statusCode = 400;
        break;
      case ErrorCategory.RATE_LIMIT:
        statusCode = 429;
        break;
      case ErrorCategory.DATABASE:
        statusCode = 503;
        break;
      case ErrorCategory.NETWORK:
        statusCode = 502;
        break;
    }

    res.status(statusCode).json(errorResponse);
  };
}

export default SecureErrorHandler;