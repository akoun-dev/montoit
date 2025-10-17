/**
 * Middleware de sécurité pour les hooks et services de la plateforme Mon Toit
 * Fournit des protections contre les attaques communes et la validation des données
 */

import { detectSuspiciousContent } from './sanitize';

/**
 * Types d'attaques de sécurité détectées
 */
export type SecurityThreatType =
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'csrf_attempt'
  | 'rate_limit_exceeded'
  | 'brute_force_attempt'
  | 'privilege_escalation'
  | 'data_tampering'
  | 'session_hijacking';

/**
 * Interface pour les événements de sécurité
 */
export interface SecurityEvent {
  type: SecurityThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  userId?: string;
  details: Record<string, any>;
  timestamp: Date;
  userAgent: string;
  ipAddress: string;
  blocked: boolean;
}

/**
 * Middleware de sécurité pour les données utilisateur
 */
export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private securityEvents: SecurityEvent[] = [];
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private blockedIPs = new Set<string>();
  private suspiciousUsers = new Set<string>();

  private constructor() {
    // Initialisation du middleware
    this.setupEventListeners();
    this.cleanupExpiredEntries();
  }

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  /**
   * Configure les écouteurs d'événements pour la sécurité
   */
  private setupEventListeners() {
    // Surveiller les erreurs JavaScript pour détecter des attaques potentielles
    window.addEventListener('error', (event) => {
      if (event.message) {
        this.analyzeErrorForSecurityThreats(event.message, event.filename || '');
      }
    });

    // Surveiller les messages non autorisés
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin && event.data) {
        this.recordSecurityEvent({
          type: 'csrf_attempt',
          severity: 'medium',
          source: event.origin,
          details: { data: event.data },
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          ipAddress: this.getClientIP(),
          blocked: true
        });
      }
    });

    // Surveiller les changements de localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key, value) => {
      if (this.isSuspiciousLocalStorageAccess(key, value)) {
        this.recordSecurityEvent({
          type: 'data_tampering',
          severity: 'high',
          source: 'localStorage',
          details: { key, valueLength: value.length },
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          ipAddress: this.getClientIP(),
          blocked: false
        });
      }
      return originalSetItem.call(localStorage, key, value);
    };
  }

  /**
   * Nettoie les entrées expirées périodiquement
   */
  private cleanupExpiredEntries() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.rateLimitMap.entries()) {
        if (now > data.resetTime) {
          this.rateLimitMap.delete(key);
        }
      }
    }, 60000); // Nettoyer chaque minute
  }

  /**
   * Analyse les erreurs pour détecter des menaces de sécurité
   */
  private analyzeErrorForSecurityThreats(message: string, source: string) {
    const suspiciousPatterns = [
      { pattern: /script.*error/i, type: 'xss_attempt' as SecurityThreatType },
      { pattern: /sql.*syntax/i, type: 'sql_injection_attempt' as SecurityThreatType },
      { pattern: /blocked.*content/i, type: 'privilege_escalation' as SecurityThreatType },
      { pattern: /unauthorized/i, type: 'privilege_escalation' as SecurityThreatType }
    ];

    for (const { pattern, type } of suspiciousPatterns) {
      if (pattern.test(message)) {
        this.recordSecurityEvent({
          type,
          severity: 'medium',
          source,
          details: { message },
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          ipAddress: this.getClientIP(),
          blocked: false
        });
        break;
      }
    }
  }

  /**
   * Détecte les accès suspects au localStorage
   */
  private isSuspiciousLocalStorageAccess(key: string, value: string): boolean {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth'];
    const suspiciousValues = ['<script', 'javascript:', 'data:text/html'];

    return (
      sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive)) ||
      suspiciousValues.some(suspicious => value.toLowerCase().includes(suspicious))
    );
  }

  /**
   * Obtient l'adresse IP du client (approximation)
   */
  private getClientIP(): string {
    // En production, ceci devrait être fourni par le backend
    return localStorage.getItem('client_ip') || 'unknown';
  }

  /**
   * Enregistre un événement de sécurité
   */
  public recordSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'userAgent' | 'ipAddress'>) {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      ipAddress: this.getClientIP()
    };

    this.securityEvents.push(fullEvent);

    // Garder seulement les 1000 derniers événements
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Logger l'événement pour monitoring
    console.warn('Security Event:', fullEvent);

    // Envoyer à Sentry si disponible
    if (window.Sentry && event.severity !== 'low') {
      window.Sentry.captureMessage(`Security Event: ${event.type}`, {
        level: event.severity === 'critical' ? 'fatal' : event.severity,
        tags: { security: 'true', threat_type: event.type },
        extra: fullEvent
      });
    }

    // Bloquer l'accès si nécessaire
    if (event.blocked || event.severity === 'critical') {
      this.blockAccess(event.source);
    }
  }

  /**
   * Bloque l'accès pour une source spécifique
   */
  private blockAccess(source: string) {
    const clientIP = this.getClientIP();
    this.blockedIPs.add(clientIP);

    // Rediriger vers une page d'erreur de sécurité
    if (window.location.pathname !== '/security-error') {
      window.location.href = '/security-error';
    }
  }

  /**
   * Vérifie le rate limiting pour une action
   */
  public checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= maxRequests) {
      this.recordSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        source: 'rate_limiter',
        details: { key, count: current.count, maxRequests },
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ipAddress: this.getClientIP(),
        blocked: false
      });
      return false;
    }

    current.count++;
    return true;
  }

  /**
   * Valide et nettoie les données entrantes
   */
  public validateInput(data: any, context: string): { isValid: boolean; cleaned: any; threats: string[] } {
    const threats: string[] = [];
    let cleaned = data;

    // Si c'est une chaîne de caractères, vérifier le contenu suspect
    if (typeof data === 'string') {
      const detection = detectSuspiciousContent(data);
      if (detection.isSuspicious) {
        threats.push(...detection.reasons);
        this.recordSecurityEvent({
          type: 'xss_attempt',
          severity: 'high',
          source: context,
          details: { content: data.substring(0, 200), threats: detection.reasons },
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          ipAddress: this.getClientIP(),
          blocked: false
        });
        cleaned = detection.sanitized;
      }
    }

    // Si c'est un objet, valider récursivement
    if (typeof data === 'object' && data !== null) {
      cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        const validation = this.validateInput(value, `${context}.${key}`);
        if (validation.threats.length > 0) {
          threats.push(...validation.threats);
        }
        cleaned[key] = validation.cleaned;
      }
    }

    return {
      isValid: threats.length === 0,
      cleaned,
      threats
    };
  }

  /**
   * Vérifie si un utilisateur est autorisé à effectuer une action
   */
  public checkAuthorization(userRole: string, requiredRole: string, action: string): boolean {
    const roleHierarchy = {
      'locataire': 0,
      'proprietaire': 1,
      'agence': 2,
      'tiers_de_confiance': 3,
      'admin': 4,
      'super_admin': 5
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    const isAuthorized = userLevel >= requiredLevel;

    if (!isAuthorized) {
      this.recordSecurityEvent({
        type: 'privilege_escalation',
        severity: 'high',
        source: 'authorization_check',
        details: { userRole, requiredRole, action },
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ipAddress: this.getClientIP(),
        blocked: false
      });
    }

    return isAuthorized;
  }

  /**
   * Détecte les comportements de brute force
   */
  public detectBruteForce(identifier: string, maxAttempts: number, windowMs: number): boolean {
    const key = `brute_force_${identifier}`;
    return !this.checkRateLimit(key, maxAttempts, windowMs);
  }

  /**
   * Génère un token CSRF
   */
  public generateCSRFToken(): string {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    sessionStorage.setItem('csrf_token', token);
    return token;
  }

  /**
   * Valide un token CSRF
   */
  public validateCSRFToken(token: string): boolean {
    const storedToken = sessionStorage.getItem('csrf_token');
    if (!storedToken || storedToken !== token) {
      this.recordSecurityEvent({
        type: 'csrf_attempt',
        severity: 'high',
        source: 'csrf_validation',
        details: { providedToken: token.substring(0, 10) + '...' },
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ipAddress: this.getClientIP(),
        blocked: false
      });
      return false;
    }
    return true;
  }

  /**
   * Obtient les événements de sécurité récents
   */
  public getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Obtient les statistiques de sécurité
   */
  public getSecurityStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = this.securityEvents.filter(e => e.timestamp > last24h);

    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: recentEvents.length,
      blockedIPs: this.blockedIPs.size,
      suspiciousUsers: this.suspiciousUsers.size,
      eventsByType,
      eventsBySeverity,
      rateLimitEntries: this.rateLimitMap.size
    };
  }
}

/**
 * Hook React pour utiliser le middleware de sécurité
 */
export const useSecurity = () => {
  const middleware = SecurityMiddleware.getInstance();

  return {
    validateInput: middleware.validateInput.bind(middleware),
    checkRateLimit: middleware.checkRateLimit.bind(middleware),
    checkAuthorization: middleware.checkAuthorization.bind(middleware),
    detectBruteForce: middleware.detectBruteForce.bind(middleware),
    generateCSRFToken: middleware.generateCSRFToken.bind(middleware),
    validateCSRFToken: middleware.validateCSRFToken.bind(middleware),
    recordSecurityEvent: middleware.recordSecurityEvent.bind(middleware),
    getSecurityStats: middleware.getSecurityStats.bind(middleware),
    getRecentEvents: middleware.getRecentEvents.bind(middleware)
  };
};

export default SecurityMiddleware;