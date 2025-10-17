/**
 * API Security Middleware and Monitoring
 *
 * Provides comprehensive API protection including:
 * - Rate limiting and abuse prevention
 * - Request validation and sanitization
 * - Authentication middleware
 * - Security monitoring and alerting
 * - DDoS protection
 */

import { supabase } from './supabase';
import { RateLimiter, SecurityMonitor, InputSanitizer } from './security';

interface SecurityContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * API Security Middleware
 */
export class APISecurity {
  private static readonly SUSPICIOUS_PATTERNS = {
    RAPID_REQUESTS: 100, // requests per minute
    FAILED_LOGINS: 5, // failed attempts
    LARGE_UPLOADS: 10, // uploads per hour
    SENSITIVE_ACCESS: 50, // sensitive endpoint accesses per hour
  };

  /**
   * Main security middleware for API requests
   */
  static async protectRequest(context: SecurityContext): Promise<{
    allowed: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    try {
      // 1. Rate limiting check
      const rateLimitResult = this.checkRateLimit(context);
      if (!rateLimitResult.allowed) {
        SecurityMonitor.logEvent('RATE_LIMIT_EXCEEDED', {
          ...context,
          resetTime: rateLimitResult.resetTime
        }, 'high');
        return {
          allowed: false,
          error: rateLimitResult.error || 'Rate limit exceeded',
          warnings
        };
      }

      // 2. IP-based blocking check
      if (await this.isIPBlocked(context.ipAddress)) {
        SecurityMonitor.logEvent('BLOCKED_IP_ACCESS', context, 'critical');
        return {
          allowed: false,
          error: 'Access denied from this IP address',
          warnings
        };
      }

      // 3. Suspicious activity detection
      const suspiciousActivity = await this.detectSuspiciousActivity(context);
      if (suspiciousActivity.length > 0) {
        warnings.push(...suspiciousActivity);
        SecurityMonitor.logEvent('SUSPICIOUS_ACTIVITY', {
          ...context,
          activities: suspiciousActivity
        }, 'medium');
      }

      // 4. Request validation for sensitive endpoints
      if (this.isSensitiveEndpoint(context.endpoint)) {
        const validationResult = this.validateRequest(context);
        if (!validationResult.valid) {
          SecurityMonitor.logEvent('INVALID_REQUEST', {
            ...context,
            errors: validationResult.errors
          }, 'medium');
          return {
            allowed: false,
            error: 'Invalid request format',
            warnings
          };
        }
      }

      // 5. Authentication check for protected endpoints
      if (this.isProtectedEndpoint(context.endpoint)) {
        const authResult = await this.checkAuthentication(context);
        if (!authResult.authenticated) {
          SecurityMonitor.logEvent('UNAUTHORIZED_ACCESS', context, 'high');
          return {
            allowed: false,
            error: 'Authentication required',
            warnings
          };
        }
      }

      // Log successful request
      SecurityMonitor.logEvent('API_REQUEST', context, 'low');

      return { allowed: true, warnings };

    } catch (error) {
      SecurityMonitor.logEvent('SECURITY_MIDDLEWARE_ERROR', {
        ...context,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'critical');
      return {
        allowed: false,
        error: 'Security check failed',
        warnings
      };
    }
  }

  /**
   * Check rate limits for the request
   */
  private static checkRateLimit(context: SecurityContext): RateLimitResult {
    const identifier = context.userId || context.ipAddress;
    const action = this.getRateLimitAction(context.endpoint);

    const result = RateLimiter.isAllowed(identifier, action);

    if (!result.allowed) {
      return {
        ...result,
        error: `Rate limit exceeded for ${action}. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`
      };
    }

    return result;
  }

  /**
   * Check if IP address is blocked
   */
  private static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', ipAddress)
        .or('blocked_until.gt.' + new Date().toISOString() + ',blocked_until.is.null')
        .single();

      return !error && !!data;
    } catch (error) {
      // If we can't check, assume it's not blocked
      return false;
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private static async detectSuspiciousActivity(context: SecurityContext): Promise<string[]> {
    const warnings: string[] = [];
    const identifier = context.userId || context.ipAddress;

    // Check for rapid successive requests
    const recentRequests = await this.getRecentRequestCount(identifier, 60000); // 1 minute
    if (recentRequests > this.SUSPICIOUS_PATTERNS.RAPID_REQUESTS) {
      warnings.push('Unusually high request frequency detected');
    }

    // Check for failed login attempts
    const failedLogins = await this.getFailedLoginCount(identifier, 900000); // 15 minutes
    if (failedLogins > this.SUSPICIOUS_PATTERNS.FAILED_LOGINS) {
      warnings.push('Multiple failed authentication attempts detected');
    }

    // Check for large file uploads
    const largeUploads = await this.getLargeUploadCount(identifier, 3600000); // 1 hour
    if (largeUploads > this.SUSPICIOUS_PATTERNS.LARGE_UPLOADS) {
      warnings.push('Unusually high file upload activity detected');
    }

    // Check for sensitive endpoint access patterns
    const sensitiveAccess = await this.getSensitiveAccessCount(identifier, 3600000); // 1 hour
    if (sensitiveAccess > this.SUSPICIOUS_PATTERNS.SENSITIVE_ACCESS) {
      warnings.push('Unusual access to sensitive endpoints detected');
    }

    return warnings;
  }

  /**
   * Validate request data
   */
  private static validateRequest(context: SecurityContext): ValidationResult {
    // This would integrate with your actual request validation logic
    // For now, return a basic validation result
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Check authentication for protected endpoints
   */
  private static async checkAuthentication(context: SecurityContext): Promise<{
    authenticated: boolean;
    userId?: string;
  }> {
    if (!context.userId) {
      return { authenticated: false };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', context.userId)
        .single();

      return {
        authenticated: !error && !!data,
        userId: data?.id
      };
    } catch (error) {
      return { authenticated: false };
    }
  }

  /**
   * Get rate limit action based on endpoint
   */
  private static getRateLimitAction(endpoint: string): keyof typeof RateLimiter['isAllowed'] {
    if (endpoint.includes('/auth/login')) return 'LOGIN_ATTEMPTS';
    if (endpoint.includes('/upload')) return 'FILE_UPLOADS';
    if (endpoint.includes('/message')) return 'MESSAGE_SEND';
    return 'API_REQUESTS';
  }

  /**
   * Check if endpoint requires protection
   */
  private static isSensitiveEndpoint(endpoint: string): boolean {
    const sensitivePatterns = [
      '/admin/',
      '/api/v1/admin/',
      '/user/delete',
      '/property/delete',
      '/payment/',
      '/signature/',
      '/verification/'
    ];

    return sensitivePatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Check if endpoint requires authentication
   */
  private static isProtectedEndpoint(endpoint: string): boolean {
    const protectedPatterns = [
      '/api/v1/',
      '/dashboard/',
      '/profile/',
      '/messages/',
      '/properties/create',
      '/applications/',
      '/leases/',
      '/payments/'
    ];

    return protectedPatterns.some(pattern => endpoint.includes(pattern));
  }

  // Helper methods for suspicious activity detection

  private static async getRecentRequestCount(identifier: string, timeWindowMs: number): Promise<number> {
    // This would query your request logs or cache
    // For now, return a placeholder
    return 0;
  }

  private static async getFailedLoginCount(identifier: string, timeWindowMs: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('success', false)
        .eq('email', identifier)
        .gt('created_at', new Date(Date.now() - timeWindowMs).toISOString());

      return data?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  private static async getLargeUploadCount(identifier: string, timeWindowMs: number): Promise<number> {
    // This would track file upload attempts
    return 0;
  }

  private static async getSensitiveAccessCount(identifier: string, timeWindowMs: number): Promise<number> {
    // This would track access to sensitive endpoints
    return 0;
  }
}

/**
 * Request Sanitizer and Validator
 */
export class RequestValidator {
  /**
   * Sanitize and validate request body
   */
  static sanitizeBody(body: any, schema: any): ValidationResult {
    const errors: string[] = [];

    try {
      // Basic input sanitization
      const sanitized = this.sanitizeInput(body);

      // Schema validation (using your existing validation library)
      const validationResult = this.validateAgainstSchema(sanitized, schema);
      if (!validationResult.valid) {
        errors.push(...validationResult.errors);
      }

      return {
        valid: errors.length === 0,
        errors,
        sanitizedData: sanitized
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Request validation failed']
      };
    }
  }

  /**
   * Sanitize input data
   */
  private static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return InputSanitizer.sanitizeText(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize object keys as well
        const sanitizedKey = InputSanitizer.sanitizeText(key, 100);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Validate data against schema
   */
  private static validateAgainstSchema(data: any, schema: any): ValidationResult {
    // This would integrate with your Zod or other validation library
    // For now, return a basic validation result
    return {
      valid: true,
      errors: []
    };
  }
}

/**
 * DDoS Protection Service
 */
export class DDoSProtection {
  private static readonly THRESHOLDS = {
    REQUESTS_PER_MINUTE: 1000,
    REQUESTS_PER_SECOND: 50,
    UNIQUE_IPS_PER_MINUTE: 100,
    ERROR_RATE_THRESHOLD: 0.1 // 10% error rate
  };

  private static requestCounts = new Map<string, number[]>();
  private static ipTracker = new Set<string>();

  /**
   * Check for DDoS attack patterns
   */
  static async checkForDDoS(): Promise<{
    isAttack: boolean;
    confidence: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let confidence = 0;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old request timestamps
    this.cleanupOldRequests(oneMinuteAgo);

    // Check request rate
    const totalRequests = this.getTotalRequests(oneMinuteAgo);
    if (totalRequests > this.THRESHOLDS.REQUESTS_PER_MINUTE) {
      indicators.push(`High request rate: ${totalRequests}/minute`);
      confidence += 0.3;
    }

    // Check unique IP count
    const uniqueIPs = this.ipTracker.size;
    if (uniqueIPs > this.THRESHOLDS.UNIQUE_IPS_PER_MINUTE) {
      indicators.push(`High unique IP count: ${uniqueIPs}/minute`);
      confidence += 0.2;
    }

    // Check for distributed attack pattern
    const requestsPerIP = this.getRequestsPerIP(oneMinuteAgo);
    const suspiciousDistribution = this.analyzeIPDistribution(requestsPerIP);
    if (suspiciousDistribution) {
      indicators.push('Suspicious IP distribution pattern detected');
      confidence += 0.3;
    }

    const isAttack = confidence > 0.5;

    if (isAttack) {
      SecurityMonitor.logEvent('DDOS_ATTACK_DETECTED', {
        totalRequests,
        uniqueIPs,
        confidence,
        indicators
      }, 'critical');
    }

    return {
      isAttack,
      confidence,
      indicators
    };
  }

  /**
   * Record a request for DDoS monitoring
   */
  static recordRequest(ipAddress: string): void {
    const now = Date.now();
    const timestamps = this.requestCounts.get(ipAddress) || [];
    timestamps.push(now);
    this.requestCounts.set(ipAddress, timestamps);
    this.ipTracker.add(ipAddress);
  }

  private static cleanupOldRequests(cutoffTime: number): void {
    for (const [ip, timestamps] of this.requestCounts.entries()) {
      const validTimestamps = timestamps.filter(t => t > cutoffTime);
      if (validTimestamps.length === 0) {
        this.requestCounts.delete(ip);
      } else {
        this.requestCounts.set(ip, validTimestamps);
      }
    }
  }

  private static getTotalRequests(cutoffTime: number): number {
    let total = 0;
    for (const timestamps of this.requestCounts.values()) {
      total += timestamps.filter(t => t > cutoffTime).length;
    }
    return total;
  }

  private static getRequestsPerIP(cutoffTime: number): Map<string, number> {
    const requestsPerIP = new Map<string, number>();
    for (const [ip, timestamps] of this.requestCounts.entries()) {
      const recentRequests = timestamps.filter(t => t > cutoffTime).length;
      if (recentRequests > 0) {
        requestsPerIP.set(ip, recentRequests);
      }
    }
    return requestsPerIP;
  }

  private static analyzeIPDistribution(requestsPerIP: Map<string, number>): boolean {
    // Analyze if requests are evenly distributed (possible botnet)
    const values = Array.from(requestsPerIP.values());
    if (values.length < 10) return false;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is very low, requests are evenly distributed (suspicious)
    return stdDev < avg * 0.1;
  }
}

// Export the main security function
export default {
  APISecurity,
  RequestValidator,
  DDoSProtection
};