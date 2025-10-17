/**
 * Security Dashboard Component
 *
 * Provides real-time security monitoring for administrators:
 * - Security metrics and KPIs
 * - Active threat detection
 * - Incident management
 * - Security event logs
 * - System health monitoring
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  Lock,
  Eye,
  AlertCircle,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import { SecurityMonitor, RateLimiter } from '@/lib/security';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  recentAlerts: string[];
  rateLimitViolations: number;
  blockedIPs: number;
  activeSessions: number;
  failedLogins: number;
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: any;
  resolved?: boolean;
}

interface ThreatIndicator {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  affectedUsers?: number;
  affectedIPs?: string[];
}

const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    highSeverityEvents: 0,
    recentAlerts: [],
    rateLimitViolations: 0,
    blockedIPs: 0,
    activeSessions: 0,
    failedLogins: 0
  });

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threats, setThreats] = useState<ThreatIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load security metrics
  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Get metrics from security monitor
      const securityMetrics = SecurityMonitor.getMetrics();

      // Simulate API calls for additional metrics
      const additionalMetrics = await fetchAdditionalSecurityMetrics();

      setMetrics({
        totalEvents: securityMetrics.totalEvents,
        criticalEvents: securityMetrics.criticalEvents,
        highSeverityEvents: securityMetrics.highSeverityEvents,
        recentAlerts: securityMetrics.recentAlerts,
        ...additionalMetrics
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load security events
  const loadEvents = async () => {
    try {
      // In a real implementation, this would fetch from your security API
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          type: 'RATE_LIMIT_EXCEEDED',
          severity: 'high',
          timestamp: Date.now() - 300000, // 5 minutes ago
          details: { ip: '192.168.1.100', endpoint: '/api/v1/properties' },
          resolved: false
        },
        {
          id: '2',
          type: 'MULTIPLE_FAILED_LOGINS',
          severity: 'medium',
          timestamp: Date.now() - 600000, // 10 minutes ago
          details: { email: 'user@example.com', attempts: 6 },
          resolved: true
        },
        {
          id: '3',
          type: 'SUSPICIOUS_FILE_UPLOAD',
          severity: 'high',
          timestamp: Date.now() - 900000, // 15 minutes ago
          details: { userId: 'user-123', file: 'suspicious.exe' },
          resolved: false
        }
      ];

      setEvents(mockEvents);
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  };

  // Load threat indicators
  const loadThreats = async () => {
    try {
      const suspiciousActivity = SecurityMonitor.detectSuspiciousActivity();

      const mockThreats: ThreatIndicator[] = [
        {
          type: 'BRUTE_FORCE_ATTACK',
          description: 'Multiple login attempts detected from same IP',
          severity: 'high',
          count: 15,
          affectedIPs: ['192.168.1.100', '10.0.0.50']
        },
        {
          type: 'UNUSUAL_API_USAGE',
          description: 'High volume of API requests from automated sources',
          severity: 'medium',
          count: 1500,
          affectedUsers: 3
        },
        {
          type: 'FILE_UPLOAD_ABUSE',
          description: 'Attempt to upload malicious files detected',
          severity: 'critical',
          count: 5,
          affectedUsers: 2
        }
      ];

      setThreats([...mockThreats, ...suspiciousActivity.map(alert => ({
        type: 'SUSPICIOUS_ACTIVITY',
        description: alert,
        severity: 'medium' as const,
        count: 1
      }))]);
    } catch (error) {
      console.error('Failed to load threat indicators:', error);
    }
  };

  // Fetch additional security metrics (mock implementation)
  const fetchAdditionalSecurityMetrics = async (): Promise<Partial<SecurityMetrics>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      rateLimitViolations: 23,
      blockedIPs: 8,
      activeSessions: 156,
      failedLogins: 47
    };
  };

  // Resolve security event
  const resolveEvent = async (eventId: string) => {
    try {
      // In a real implementation, this would call your security API
      setEvents(prev => prev.map(event =>
        event.id === eventId ? { ...event, resolved: true } : event
      ));

      // Log the resolution
      SecurityMonitor.logEvent('SECURITY_EVENT_RESOLVED', {
        eventId,
        resolvedBy: 'admin',
        timestamp: Date.now()
      }, 'medium');
    } catch (error) {
      console.error('Failed to resolve event:', error);
    }
  };

  // Block IP address
  const blockIP = async (ip: string, reason: string) => {
    try {
      // In a real implementation, this would call your security API
      SecurityMonitor.logEvent('IP_BLOCKED', {
        ip,
        reason,
        blockedBy: 'admin',
        timestamp: Date.now()
      }, 'high');

      await loadMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Failed to block IP:', error);
    }
  };

  // Export security report
  const exportReport = async () => {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        metrics,
        events: events.slice(0, 100), // Last 100 events
        threats: threats.slice(0, 50), // Top 50 threats
        generatedBy: 'security-dashboard'
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      SecurityMonitor.logEvent('SECURITY_REPORT_EXPORTED', {
        generatedBy: 'admin',
        timestamp: Date.now()
      }, 'low');
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Get severity badge variant
  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMetrics();
      loadEvents();
      loadThreats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    loadMetrics();
    loadEvents();
    loadThreats();
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  const timeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord sécurité</h1>
            <p className="text-muted-foreground">
              Surveillance et gestion de la sécurité de la plateforme
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-rafraîchissement' : 'Manuel'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={loadMetrics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Last refresh info */}
        <div className="text-sm text-muted-foreground">
          Dernière actualisation: {lastRefresh.toLocaleTimeString('fr-FR')}
        </div>

        {/* Critical Alerts */}
        {(metrics.criticalEvents > 0 || threats.some(t => t.severity === 'critical')) && (
          <Alert className="border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alerte critique de sécurité</AlertTitle>
            <AlertDescription>
              {metrics.criticalEvents} événement{metrics.criticalEvents > 1 ? 's' : ''} critique{metrics.criticalEvents > 1 ? 's' : ''} détecté{metrics.criticalEvents > 1 ? 's' : ''}.
              Intervention immédiate requise.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Événements totaux</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.highSeverityEvents} à haute priorité
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions actives</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                Utilisateurs connectés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IPs bloquées</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blockedIPs}</div>
              <p className="text-xs text-muted-foreground">
                Adresses malveillantes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connexions échouées</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.failedLogins}</div>
              <p className="text-xs text-muted-foreground">
                Dernières 24 heures
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="threats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="threats">Menaces actives</TabsTrigger>
            <TabsTrigger value="events">Événements récents</TabsTrigger>
            <TabsTrigger value="metrics">Métriques détaillées</TabsTrigger>
          </TabsList>

          <TabsContent value="threats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menaces détectées</CardTitle>
                <CardDescription>
                  Indicateurs de menaces et activités suspectes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threats.map((threat, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(threat.severity)}`} />
                        <div>
                          <h4 className="font-medium">{threat.type}</h4>
                          <p className="text-sm text-muted-foreground">{threat.description}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Compteur: {threat.count}
                            </span>
                            {threat.affectedUsers && (
                              <span className="text-xs text-muted-foreground">
                                {threat.affectedUsers} utilisateur{threat.affectedUsers > 1 ? 's' : ''} affecté{threat.affectedUsers > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityBadgeVariant(threat.severity)}>
                          {threat.severity}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Handle threat response
                            SecurityMonitor.logEvent('THREAT_RESPONDED', {
                              threatType: threat.type,
                              severity: threat.severity,
                              respondedBy: 'admin'
                            }, 'medium');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Examiner
                        </Button>
                      </div>
                    </div>
                  ))}
                  {threats.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune menace détectée</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Événements de sécurité</CardTitle>
                <CardDescription>
                  Journal des événements de sécurité récents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className={`h-4 w-4 ${getSeverityColor(event.severity).replace('bg-', 'text-')}`} />
                        <div>
                          <h4 className="font-medium">{event.type}</h4>
                          <p className="text-sm text-muted-foreground">
                            {timeAgo(event.timestamp)}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(event.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityBadgeVariant(event.severity)}>
                          {event.severity}
                        </Badge>
                        {event.resolved ? (
                          <Badge variant="outline">Résolu</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveEvent(event.id)}
                          >
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun événement récent</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Métriques de sécurité détaillées</CardTitle>
                <CardDescription>
                  Analyse approfondie des indicateurs de sécurité
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Distribution par sévérité</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Critique</span>
                        <Badge variant="destructive">{metrics.criticalEvents}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Élevée</span>
                        <Badge variant="destructive">{metrics.highSeverityEvents}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Moyenne</span>
                        <Badge variant="secondary">0</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Faible</span>
                        <Badge variant="outline">{metrics.totalEvents - metrics.criticalEvents - metrics.highSeverityEvents}</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Activité récente</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Violations de rate limit</span>
                        <Badge>{metrics.rateLimitViolations}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Tentatives de connexion échouées</span>
                        <Badge variant="destructive">{metrics.failedLogins}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Adresses IP bloquées</span>
                        <Badge>{metrics.blockedIPs}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Sessions actives</span>
                        <Badge variant="outline">{metrics.activeSessions}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Recommendations */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Recommandations de sécurité</h4>
                  <ul className="text-sm space-y-1">
                    {metrics.criticalEvents > 0 && (
                      <li>• Traiter immédiatement les {metrics.criticalEvents} événement{metrics.criticalEvents > 1 ? 's' : ''} critique{metrics.criticalEvents > 1 ? 's' : ''}</li>
                    )}
                    {metrics.failedLogins > 10 && (
                      <li>• Surveiller les tentatives de connexion échouées ({metrics.failedLogins} échecs)</li>
                    )}
                    {metrics.blockedIPs > 0 && (
                      <li>• {metrics.blockedIPs} adresse{metrics.blockedIPs > 1 ? 's' : ''} IP bloquée{metrics.blockedIPs > 1 ? 's' : ''} - vérifier la légitimité</li>
                    )}
                    {threats.length === 0 && metrics.criticalEvents === 0 && (
                      <li>• ✅ Aucune action immédiate requise - système sécurisé</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
};

export default SecurityDashboard;