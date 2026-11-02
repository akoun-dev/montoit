/**
 * Service de monitoring de sécurité
 *
 * Ce service centralise la collecte et l'analyse des événements de sécurité
 * pour détecter les menaces et générer des alertes.
 */

import { SecurityLogger } from '@/shared/middleware/security.middleware';
import { supabase } from '@/services/supabase/client';

interface SecurityEvent {
  id: string;
  timestamp: Date;
  type:
    | 'AUTH_FAILURE'
    | 'RATE_LIMIT_EXCEEDED'
    | 'UNAUTHORIZED_ACCESS'
    | 'MALICIOUS_UPLOAD'
    | 'PRIVILEGE_ESCALATION'
    | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  details: Record<string, any>;
  resolved: boolean;
  createdAt: Date;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByHour: Record<string, number>;
  topOffenders: Array<{
    userId?: string;
    ip?: string;
    count: number;
  }>;
  blockedIPs: Array<{
    ip: string;
    blockedAt: Date;
    reason: string;
  }>;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    eventTypes?: string[];
    timeWindow: number; // minutes
    threshold: number;
    aggregation: 'count' | 'unique_ips' | 'unique_users';
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'LOG' | 'ALERT' | 'BLOCK';
  enabled: boolean;
}

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  private eventBuffer: SecurityEvent[] = [];
  private alertRules: AlertRule[] = [];
  private blockedIPs = new Map<string, { blockedAt: Date; reason: string; duration: number }>();

  private constructor() {
    this.initializeAlertRules();
    this.startMonitoring();
  }

  static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  /**
   * Initialise les règles d'alerte par défaut
   */
  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'multiple-login-failures',
        name: 'Échecs de connexion multiples',
        description: 'Détecte les tentatives de connexion par force brute',
        condition: {
          eventTypes: ['AUTH_FAILURE'],
          timeWindow: 15,
          threshold: 5,
          aggregation: 'count',
        },
        severity: 'HIGH',
        action: 'ALERT',
        enabled: true,
      },
      {
        id: 'rapid-api-calls',
        name: 'Appels API rapides',
        description: 'Détecte les activités de type DOS',
        condition: {
          timeWindow: 1,
          threshold: 100,
          aggregation: 'count',
        },
        severity: 'MEDIUM',
        action: 'BLOCK',
        enabled: true,
      },
      {
        id: 'unauthorized-access-attempts',
        name: "Tentatives d'accès non autorisées",
        description: "Détecte les tentatives d'accès à des ressources protégées",
        condition: {
          eventTypes: ['UNAUTHORIZED_ACCESS'],
          timeWindow: 10,
          threshold: 3,
          aggregation: 'count',
        },
        severity: 'HIGH',
        action: 'ALERT',
        enabled: true,
      },
      {
        id: 'privilege-escalation',
        name: "Tentatives d'élévation de privilèges",
        description: 'Détecte les tentatives de modification de rôle non autorisées',
        condition: {
          eventTypes: ['PRIVILEGE_ESCALATION'],
          timeWindow: 60,
          threshold: 1,
          aggregation: 'count',
        },
        severity: 'CRITICAL',
        action: 'BLOCK',
        enabled: true,
      },
      {
        id: 'malicious-uploads',
        name: 'Téléchargements de fichiers malveillants',
        description: "Détecte les tentatives d'upload de fichiers dangereux",
        condition: {
          eventTypes: ['MALICIOUS_UPLOAD'],
          timeWindow: 5,
          threshold: 1,
          aggregation: 'count',
        },
        severity: 'HIGH',
        action: 'BLOCK',
        enabled: true,
      },
    ];
  }

  /**
   * Démarre le monitoring en arrière-plan
   */
  private startMonitoring(): void {
    // Exécuter les vérifications toutes les minutes
    setInterval(() => {
      this.processEventBuffer();
      this.checkAlertRules();
      this.cleanupExpiredBlocks();
    }, 60000);

    // Persister les événements toutes les 5 minutes
    setInterval(() => {
      this.persistEvents();
    }, 5 * 60000);
  }

  /**
   * Enregistre un événement de sécurité
   */
  async logSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: Record<string, any>,
    userId?: string,
    ip?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    const event: SecurityEvent = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      severity,
      userId,
      ip,
      userAgent,
      endpoint,
      details,
      resolved: false,
      createdAt: new Date(),
    };

    // Ajouter au buffer
    this.eventBuffer.push(event);

    // Logger pour développement
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY] ${type}:`, { severity, userId, ip, details });
    }

    // Actions immédiates pour les événements critiques
    if (severity === 'CRITICAL') {
      await this.handleCriticalEvent(event);
    }

    // Envoyer à Sentry si configuré
    if (window.Sentry) {
      window.Sentry.captureMessage(`Security Event: ${type}`, {
        level: severity.toLowerCase(),
        extra: { event },
      });
    }
  }

  /**
   * Traite les événements dans le buffer
   */
  private async processEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Agréger les événements pour l'analyse
      const aggregatedEvents = this.aggregateEvents(eventsToProcess);

      // Détecter les patterns suspects
      const suspiciousPatterns = this.detectSuspiciousPatterns(aggregatedEvents);

      if (suspiciousPatterns.length > 0) {
        await this.handleSuspiciousPatterns(suspiciousPatterns);
      }

      // Mettre à jour les métriques
      await this.updateMetrics(aggregatedEvents);
    } catch (error) {
      console.error('Error processing security events:', error);
      // Remettre les événements dans le buffer en cas d'erreur
      this.eventBuffer.unshift(...eventsToProcess);
    }
  }

  /**
   * Agrège les événements pour analyse
   */
  private aggregateEvents(events: SecurityEvent[]): SecurityEvent[] {
    // Pour l'instant, retourne les événements tels quels
    // En production, implémenter une logique d'agrégation plus sophistiquée
    return events;
  }

  /**
   * Détecte les patterns suspects
   */
  private detectSuspiciousPatterns(events: SecurityEvent[]): Array<{
    type: string;
    severity: string;
    description: string;
    events: SecurityEvent[];
  }> {
    const patterns = [];

    // Pattern 1: Plusieurs échecs d'auth du même IP
    const authFailuresByIP = events
      .filter((e) => e.type === 'AUTH_FAILURE')
      .reduce(
        (acc, event) => {
          const key = event.ip || 'unknown';
          acc[key] = acc[key] || [];
          acc[key].push(event);
          return acc;
        },
        {} as Record<string, SecurityEvent[]>
      );

    Object.entries(authFailuresByIP).forEach(([ip, failures]) => {
      if (failures.length >= 5) {
        patterns.push({
          type: 'BRUTE_FORCE_ATTACK',
          severity: 'HIGH',
          description: `Échecs de connexion multiples depuis l'IP: ${ip}`,
          events: failures,
        });
      }
    });

    // Pattern 2: Tentatives d'accès depuis différentes IPs pour le même utilisateur
    const accessByUser = events
      .filter((e) => e.type === 'UNAUTHORIZED_ACCESS' && e.userId)
      .reduce(
        (acc, event) => {
          const key = event.userId!;
          acc[key] = acc[key] || new Set();
          acc[key].add(event.ip || 'unknown');
          return acc;
        },
        {} as Record<string, Set<string>>
      );

    Object.entries(accessByUser).forEach(([userId, ips]) => {
      if (ips.size >= 3) {
        patterns.push({
          type: 'ACCOUNT_TAKEOVER_ATTEMPT',
          severity: 'CRITICAL',
          description: `Tentatives d'accès depuis multiples IPs pour l'utilisateur: ${userId}`,
          events: events.filter((e) => e.userId === userId),
        });
      }
    });

    return patterns;
  }

  /**
   * Gère les patterns suspects
   */
  private async handleSuspiciousPatterns(patterns: any[]): Promise<void> {
    for (const pattern of patterns) {
      // Logger le pattern
      await this.persistSecurityAlert({
        type: pattern.type,
        severity: pattern.severity,
        description: pattern.description,
        events: pattern.events,
        createdAt: new Date(),
      });

      // Prendre des actions automatiques
      if (pattern.type === 'BRUTE_FORCE_ATTACK') {
        const ip = pattern.events[0].ip;
        if (ip) {
          this.blockIP(ip, 'Brute force attack detected', 60); // 1 heure
        }
      }

      if (pattern.type === 'ACCOUNT_TAKEOVER_ATTEMPT') {
        const userId = pattern.events[0].userId;
        if (userId) {
          await this.notifySuspiciousActivity(userId, pattern);
        }
      }
    }
  }

  /**
   * Vérifie les règles d'alerte
   */
  private async checkAlertRules(): Promise<void> {
    for (const rule of this.alertRules.filter((r) => r.enabled)) {
      const matchingEvents = this.getEventsForRule(rule);

      if (matchingEvents.length >= rule.condition.threshold) {
        await this.triggerAlert(rule, matchingEvents);
      }
    }
  }

  /**
   * Récupère les événements correspondant à une règle
   */
  private getEventsForRule(rule: AlertRule): SecurityEvent[] {
    const now = Date.now();
    const windowStart = now - rule.condition.timeWindow * 60 * 1000;

    let events = this.eventBuffer.filter((e) => e.timestamp.getTime() >= windowStart);

    if (rule.condition.eventTypes) {
      events = events.filter((e) => rule.condition.eventTypes!.includes(e.type));
    }

    // Appliquer l'agrégation
    switch (rule.condition.aggregation) {
      case 'unique_ips':
        const uniqueIPs = new Set(events.map((e) => e.ip));
        return Array.from(uniqueIPs).length >= rule.condition.threshold ? events : [];

      case 'unique_users':
        const uniqueUsers = new Set(events.map((e) => e.userId).filter(Boolean));
        return Array.from(uniqueUsers).length >= rule.condition.threshold ? events : [];

      default:
        return events;
    }
  }

  /**
   * Déclenche une alerte
   */
  private async triggerAlert(rule: AlertRule, events: SecurityEvent[]): Promise<void> {
    await this.persistSecurityAlert({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      eventCount: events.length,
      timeWindow: rule.condition.timeWindow,
      events: events.slice(0, 10), // Limiter à 10 événements
      createdAt: new Date(),
    });

    // Exécuter l'action
    switch (rule.action) {
      case 'BLOCK':
        if (events[0]?.ip) {
          this.blockIP(events[0].ip!, rule.name, 60);
        }
        break;

      case 'ALERT':
        await this.sendAlertNotification(rule, events);
        break;
    }
  }

  /**
   * Bloque une adresse IP
   */
  blockIP(ip: string, reason: string, durationMinutes: number): void {
    this.blockedIPs.set(ip, {
      blockedAt: new Date(),
      reason,
      duration: durationMinutes * 60 * 1000,
    });

    // Logger le blocage
    SecurityLogger.logSecurityEvent('IP_BLOCKED', undefined, ip, {
      reason,
      duration: durationMinutes,
    });
  }

  /**
   * Vérifie si une IP est bloquée
   */
  isIPBlocked(ip: string): boolean {
    const block = this.blockedIPs.get(ip);
    if (!block) return false;

    const now = Date.now();
    if (now > block.blockedAt.getTime() + block.duration) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Nettoie les blocages expirés
   */
  private cleanupExpiredBlocks(): void {
    const now = Date.now();
    for (const [ip, block] of this.blockedIPs.entries()) {
      if (now > block.blockedAt.getTime() + block.duration) {
        this.blockedIPs.delete(ip);
      }
    }
  }

  /**
   * Persiste les événements en base de données
   */
  private async persistEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const eventsToPersist = this.eventBuffer.splice(0, 100); // Limiter à 100 par batch

      await supabase.from('security_events').insert(
        eventsToPersist.map((event) => ({
          id: event.id,
          type: event.type,
          severity: event.severity,
          user_id: event.userId,
          ip_address: event.ip,
          user_agent: event.userAgent,
          endpoint: event.endpoint,
          details: event.details,
          created_at: event.createdAt,
        }))
      );
    } catch (error) {
      console.error('Error persisting security events:', error);
    }
  }

  /**
   * Persiste une alerte de sécurité
   */
  private async persistSecurityAlert(alert: any): Promise<void> {
    try {
      await supabase.from('security_alerts').insert({
        ...alert,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('Error persisting security alert:', error);
    }
  }

  /**
   * Envoie une notification d'alerte
   */
  private async sendAlertNotification(rule: AlertRule, events: SecurityEvent[]): Promise<void> {
    // Envoyer via email, Slack, etc.
    console.error(`SECURITY ALERT: ${rule.name}`, {
      severity: rule.severity,
      eventCount: events.length,
      details: events.slice(0, 3),
    });

    // TODO: Implémenter l'envoi réel via le service de notification
  }

  /**
   * Gère les événements critiques
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    // Bloquer immédiatement si nécessaire
    if (event.ip) {
      this.blockIP(event.ip, `Critical security event: ${event.type}`, 1440); // 24 heures
    }

    // Notifier les admins immédiatement
    await this.notifyAdmins(event);
  }

  /**
   * Notifie les administrateurs
   */
  private async notifyAdmins(event: SecurityEvent): Promise<void> {
    // TODO: Implémenter la notification aux admins
    console.error('CRITICAL SECURITY EVENT - NOTIFICATION SENT TO ADMINS', event);
  }

  /**
   * Notifie une activité suspecte
   */
  private async notifySuspiciousActivity(userId: string, pattern: any): Promise<void> {
    // TODO: Envoyer un email à l'utilisateur et aux admins
    console.warn(`Suspicious activity detected for user ${userId}:`, pattern);
  }

  /**
   * Met à jour les métriques
   */
  private async updateMetrics(events: SecurityEvent[]): Promise<void> {
    // TODO: Implémenter la mise à jour des métriques
  }

  /**
   * Récupère les métriques de sécurité
   */
  async getSecurityMetrics(hours = 24): Promise<SecurityMetrics> {
    try {
      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

      if (!events) {
        return {
          totalEvents: 0,
          eventsByType: {},
          eventsBySeverity: {},
          eventsByHour: {},
          topOffenders: [],
          blockedIPs: [],
        };
      }

      const metrics: SecurityMetrics = {
        totalEvents: events.length,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByHour: {},
        topOffenders: [],
        blockedIPs: Array.from(this.blockedIPs.entries()).map(([ip, block]) => ({
          ip,
          blockedAt: block.blockedAt,
          reason: block.reason,
        })),
      };

      // Agréger par type
      events.forEach((event) => {
        metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
        metrics.eventsBySeverity[event.severity] =
          (metrics.eventsBySeverity[event.severity] || 0) + 1;

        const hour = new Date(event.created_at).getHours();
        metrics.eventsByHour[hour] = (metrics.eventsByHour[hour] || 0) + 1;
      });

      // Calculer les top offenders
      const offenderMap = new Map<string, number>();
      events.forEach((event) => {
        const key = event.ip || event.userId || 'unknown';
        offenderMap.set(key, (offenderMap.get(key) || 0) + 1);
      });

      metrics.topOffenders = Array.from(offenderMap.entries())
        .map(([identifier, count]) => ({
          identifier,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(({ identifier, count }) => {
          if (identifier.includes('.')) {
            return { ip: identifier, count };
          } else {
            return { userId: identifier, count };
          }
        });

      return metrics;
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      throw error;
    }
  }

  /**
   * Exporte les événements pour audit
   */
  async exportEvents(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      return events || [];
    } catch (error) {
      console.error('Error exporting security events:', error);
      throw error;
    }
  }
}

// Singleton export
export const securityMonitoring = SecurityMonitoringService.getInstance();
