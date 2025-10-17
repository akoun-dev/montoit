/**
 * Advanced Security Library for Mon Toit Platform
 *
 * Provides enterprise-grade security functions including:
 * - Secure encryption/decryption
 * - Input sanitization and validation
 * - Security monitoring and threat detection
 * - Rate limiting and abuse prevention
 * - Secure session management
 */

import CryptoJS from 'crypto-js';

// Security configuration
const SECURITY_CONFIG = {
  ENCRYPTION_KEY: import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production',
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: { max: 5, windowMs: 15 * 60 * 1000 }, // 15 minutes
    API_REQUESTS: { max: 100, windowMs: 60 * 1000 }, // 1 minute
    FILE_UPLOADS: { max: 10, windowMs: 60 * 1000 }, // 1 minute
    MESSAGE_SEND: { max: 20, windowMs: 60 * 1000 }, // 1 minute
  },
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  }
} as const;

/**
 * Advanced Encryption Service
 * Uses AES-256 encryption for sensitive data
 */
export class SecureEncryption {
  private static readonly ALGORITHM = 'AES-256';
  private static readonly KEY_SIZE = 32;

  /**
   * Encrypt sensitive data using AES-256
   */
  static encrypt(data: string, customKey?: string): string {
    try {
      const key = customKey || SECURITY_CONFIG.ENCRYPTION_KEY;
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data using AES-256
   */
  static decrypt(encryptedData: string, customKey?: string): string {
    try {
      const key = customKey || SECURITY_CONFIG.ENCRYPTION_KEY;
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      const result = decrypted.toString(CryptoJS.enc.Utf8);

      if (!result) {
        throw new Error('Invalid encryption key or corrupted data');
      }

      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a secure random key
   */
  static generateKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Hash sensitive data (passwords, tokens)
   */
  static hash(data: string, salt?: string): string {
    const saltedData = data + (salt || '');
    return CryptoJS.SHA256(saltedData).toString();
  }
}

/**
 * Input Sanitization and Validation Service
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    return email.toLowerCase().trim();
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhone(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Validate Côte d'Ivoire phone numbers
    if (!/^22[0-9]{8}$/.test(cleaned)) {
      throw new Error('Invalid Côte d\'Ivoire phone number format');
    }

    return cleaned;
  }

  /**
   * Sanitize text input (names, descriptions, etc.)
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();

    // Validate length
    if (sanitized.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }

    return sanitized;
  }

  /**
   * Validate file types and sizes
   */
  static validateFile(file: File, allowedTypes: string[], maxSize: number): void {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Check for malicious file signatures
    this.checkFileSignature(file);
  }

  /**
   * Check file signature to prevent malicious uploads
   */
  private static checkFileSignature(file: File): void {
    const fileSignature = file.name.split('.').pop()?.toLowerCase();
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'jar', 'vbs', 'js', 'ps1'];

    if (dangerousExtensions.includes(fileSignature || '')) {
      throw new Error('Dangerous file type detected');
    }
  }
}

/**
 * Rate Limiting Service
 */
export class RateLimiter {
  private static storage = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if action is allowed based on rate limits
   */
  static isAllowed(
    identifier: string,
    action: keyof typeof SECURITY_CONFIG.RATE_LIMITS
  ): { allowed: boolean; remainingRequests: number; resetTime: number } {
    const limit = SECURITY_CONFIG.RATE_LIMITS[action];
    const key = `${action}:${identifier}`;
    const now = Date.now();

    let record = this.storage.get(key);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      record = {
        count: 1,
        resetTime: now + limit.windowMs
      };
      this.storage.set(key, record);

      return {
        allowed: true,
        remainingRequests: limit.max - 1,
        resetTime: record.resetTime
      };
    }

    if (record.count >= limit.max) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: record.resetTime
      };
    }

    record.count++;
    this.storage.set(key, record);

    return {
      allowed: true,
      remainingRequests: limit.max - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Clean up expired rate limit records
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.storage.entries()) {
      if (now > record.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}

/**
 * Security Monitoring Service
 */
export class SecurityMonitor {
  private static events: Array<{
    type: string;
    timestamp: number;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  /**
   * Log security event
   */
  static logEvent(
    type: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const event = {
      type,
      timestamp: Date.now(),
      details,
      severity
    };

    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Send critical events to external monitoring
    if (severity === 'critical' || severity === 'high') {
      this.sendAlert(event);
    }
  }

  /**
   * Detect suspicious patterns
   */
  static detectSuspiciousActivity(): string[] {
    const alerts: string[] = [];
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Check for multiple failed logins
    const failedLogins = this.events.filter(e =>
      e.type === 'LOGIN_FAILED' && e.timestamp > oneHourAgo
    );

    if (failedLogins.length > 10) {
      alerts.push('Multiple failed login attempts detected');
    }

    // Check for rapid API calls
    const apiCalls = this.events.filter(e =>
      e.type === 'API_CALL' && e.timestamp > oneHourAgo
    );

    if (apiCalls.length > 1000) {
      alerts.push('Unusually high API call volume detected');
    }

    return alerts;
  }

  /**
   * Get security metrics
   */
  static getMetrics(): {
    totalEvents: number;
    criticalEvents: number;
    highSeverityEvents: number;
    recentAlerts: string[];
  } {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > oneDayAgo);

    return {
      totalEvents: this.events.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      highSeverityEvents: recentEvents.filter(e => e.severity === 'high').length,
      recentAlerts: this.detectSuspiciousActivity()
    };
  }

  /**
   * Send alert to external monitoring system
   */
  private static sendAlert(event: any): void {
    // In production, integrate with Sentry, monitoring service, or SIEM
    console.error('SECURITY ALERT:', event);

    // You could integrate with monitoring services here
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureMessage(`Security Event: ${event.type}`, {
        level: 'error',
        extra: event
      });
    }
  }
}

/**
 * Session Security Service
 */
export class SessionSecurity {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly WARNING_TIMEOUT = 25 * 60 * 1000; // 25 minutes

  /**
   * Check if session is still valid
   */
  static isSessionValid(lastActivity: number): boolean {
    return Date.now() - lastActivity < this.SESSION_TIMEOUT;
  }

  /**
   * Check if session should show timeout warning
   */
  static shouldShowWarning(lastActivity: number): boolean {
    return Date.now() - lastActivity > this.WARNING_TIMEOUT;
  }

  /**
   * Get remaining session time
   */
  static getRemainingTime(lastActivity: number): number {
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, this.SESSION_TIMEOUT - elapsed);
  }

  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const data = `${timestamp}:${random}`;
    return SecureEncryption.encrypt(data);
  }

  /**
   * Validate session token
   */
  static validateSessionToken(token: string): boolean {
    try {
      const decrypted = SecureEncryption.decrypt(token);
      const [timestamp] = decrypted.split(':');
      const tokenAge = Date.now() - parseInt(timestamp);

      return tokenAge < this.SESSION_TIMEOUT;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Security Headers Service
 */
export class SecurityHeaders {
  /**
   * Apply security headers to response
   */
  static applyHeaders(headers: Record<string, string>): void {
    Object.assign(headers, SECURITY_CONFIG.SECURITY_HEADERS);

    // Add CSP nonce if available
    if (typeof window !== 'undefined') {
      const nonce = this.generateNonce();
      headers['Content-Security-Policy'] = this.buildCSP(nonce);
    }
  }

  /**
   * Generate CSP nonce
   */
  private static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Build Content Security Policy
   */
  private static buildCSP(nonce: string): string {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' *.supabase.co *.mapbox.com cdnjs.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com *.mapbox.com",
      "img-src 'self' data: blob: *.mapbox.com *.supabase.co *.tile.openstreetmap.org *.unsplash.com",
      "font-src 'self' fonts.gstatic.com fonts.googleapis.com",
      "connect-src 'self' *.mapbox.com *.supabase.co *.supabase.in api.mapbox.com events.mapbox.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
      "block-all-mixed-content"
    ].join('; ');
  }
}

// Auto-cleanup rate limiter every 5 minutes
setInterval(() => {
  RateLimiter.cleanup();
}, 5 * 60 * 1000);

export default {
  SecureEncryption,
  InputSanitizer,
  RateLimiter,
  SecurityMonitor,
  SessionSecurity,
  SecurityHeaders
};