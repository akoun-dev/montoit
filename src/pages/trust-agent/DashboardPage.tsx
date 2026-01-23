import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Scale,
  DollarSign,
  AlertCircle,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import ValidationMetrics from '../../features/trust-agent/components/ValidationMetrics';
import QuickActionsPanel from '../../features/trust-agent/components/QuickActionsPanel';
import WeekCalendarWidget from '../../features/trust-agent/components/WeekCalendarWidget';
import { AddressValue, formatAddress } from '@/shared/utils/address';

// Type for WeekCalendarWidget missions (compatible with its interface)
interface WeekCalendarWidgetMission {
  id: string;
  property_id: string;
  mission_type: string;
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  property?: {
    title: string;
    address: string;
    city: string;
  };
}

// Dispute interfaces
interface Dispute {
  id: string;
  contract_id: string;
  type: 'deposit' | 'damage' | 'rent' | 'noise' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolution_notes?: string;
  // Related data
  contract?: {
    property: {
      title: string;
      address: AddressValue;
      city: string;
    };
    tenant: {
      full_name: string;
      email: string;
    };
    owner: {
      full_name: string;
      email: string;
    };
  };
}

interface Alert {
  id: string;
  type: 'mission' | 'dispute' | 'verification' | 'payment';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  action_url?: string;
  created_at: string;
  read: boolean;
}

interface DashboardMission {
  id: string;
  property_id: string;
  mission_type: string;
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  property?: {
    title: string;
    address: AddressValue;
    city: string;
  };
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'En attente', variant: 'secondary' },
  assigned: { label: 'Assignée', variant: 'outline' },
  in_progress: { label: 'En cours', variant: 'default' },
  completed: { label: 'Terminée', variant: 'secondary' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-muted-foreground' },
  medium: { label: 'Moyenne', color: 'text-amber-600' },
  high: { label: 'Haute', color: 'text-orange-600' },
  urgent: { label: 'Urgente', color: 'text-destructive' },
};

const missionTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  cev: { label: 'CEV Complète', icon: ClipboardList },
  photos: { label: 'Vérification Photos', icon: Camera },
  documents: { label: 'Validation Documents', icon: FileCheck },
  etat_lieux: { label: 'État des Lieux', icon: Home },
  verification: { label: 'Vérification', icon: CheckCircle2 },
};

// Dispute type configuration
const disputeTypeConfig: Record<Dispute['type'], { label: string; icon: React.ElementType; color: string }> = {
  deposit: { label: 'Dépôt de garantie', icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
  damage: { label: 'Dommages', icon: Home, color: 'text-orange-600 bg-orange-50' },
  rent: { label: 'Loyer impayé', icon: DollarSign, color: 'text-red-600 bg-red-50' },
  noise: { label: 'Bruit', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
  other: { label: 'Autre', icon: MessageSquare, color: 'text-gray-600 bg-gray-50' },
};

// Dispute status configuration
const disputeStatusConfig: Record<Dispute['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon?: React.ElementType }> = {
  open: { label: 'Ouvert', variant: 'destructive' },
  in_progress: { label: 'En cours', variant: 'default' },
  resolved: { label: 'Résolu', variant: 'secondary', icon: CheckCircle2 },
  escalated: { label: 'Escaladé', variant: 'outline', icon: AlertTriangle },
};

// Dispute priority configuration
const disputePriorityConfig: Record<Dispute['priority'], { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-gray-500' },
  medium: { label: 'Moyenne', color: 'text-amber-600' },
  high: { label: 'Haute', color: 'text-orange-600' },
};

// Alert type configuration
const alertTypeConfig: Record<Alert['type'], { label: string; icon: React.ElementType }> = {
  mission: { label: 'Mission', icon: ClipboardList },
  dispute: { label: 'Litige', icon: Scale },
  verification: { label: 'Vérification', icon: CheckCircle2 },
  payment: { label: 'Paiement', icon: DollarSign },
};

export default function TrustAgentDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState<DashboardMission[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    missions: {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    },
    disputes: {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      escalated: 0,
    },
    income: {
      thisMonth: 0,
      thisYear: 0,
    },
    verifications: {
      properties: 0,
      users: 0,
    },
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      await Promise.all([loadMissions(), loadDisputes(), loadAlerts()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select(
          `
          *,
          property:properties(title, address, city)
        `
        )
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const missionData = (data || []) as DashboardMission[];
      setMissions(missionData);

      setStats((prev) => ({
        ...prev,
        missions: {
          total: missionData.length,
          pending: missionData.filter((m) => m.status === 'pending' || m.status === 'assigned').length,
          inProgress: missionData.filter((m) => m.status === 'in_progress').length,
          completed: missionData.filter((m) => m.status === 'completed').length,
        },
      }));
    } catch (error) {
      console.error('Error loading missions:', error);
    }
  };

  const loadDisputes = async () => {
    try {
      // Simplified query to avoid deep type instantiation
      // Note: 'disputes' table may not exist in database types yet
      const { data, error } = await supabase
        .from('disputes' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5) as unknown as { data: unknown[]; error: { code?: string; message?: string } | null };

      if (error) {
        // If disputes table doesn't exist or other error, just set empty array
        if (error.code === 'PGRST204' || error.code === 'PGRST116') {
          setDisputes([]);
          return;
        }
        throw error;
      }

      // Use unknown cast for type safety
      setDisputes((data || []) as unknown as Dispute[]);

      setStats((prev) => ({
        ...prev,
        disputes: {
          total: (data || []).length,
          open: (data || []).filter((d: unknown) => (d as Dispute).status === 'open').length,
          inProgress: (data || []).filter((d: unknown) => (d as Dispute).status === 'in_progress').length,
          resolved: (data || []).filter((d: unknown) => (d as Dispute).status === 'resolved').length,
          escalated: (data || []).filter((d: unknown) => (d as Dispute).status === 'escalated').length,
        },
      }));
    } catch (error) {
      console.error('Error loading disputes:', error);
      setDisputes([]);
    }
  };

  const loadAlerts = () => {
    // Generate alerts based on current state
    const generatedAlerts: Alert[] = [];

    // Mission alerts
    missions.forEach((mission) => {
      if (mission.status === 'pending' && mission.urgency === 'urgent') {
        generatedAlerts.push({
          id: `mission-${mission.id}`,
          type: 'mission',
          priority: 'urgent',
          title: 'Mission urgente',
          description: `${missionTypeConfig[mission.mission_type]?.label || 'Mission'} nécessite une attention immédiate`,
          action_url: `/trust-agent/mission/${mission.id}`,
          created_at: mission.created_at,
          read: false,
        });
      }
    });

    // Dispute alerts
    disputes.forEach((dispute) => {
      if (dispute.status === 'open' && dispute.priority === 'high') {
        generatedAlerts.push({
          id: `dispute-${dispute.id}`,
          type: 'dispute',
          priority: 'urgent',
          title: 'Nouveau litige prioritaire',
          description: dispute.title,
          action_url: `/trust-agent/disputes/${dispute.id}`,
          created_at: dispute.created_at,
          read: false,
        });
      }
    });

    setAlerts(generatedAlerts);
  };

  const handleMissionClick = (mission: DashboardMission) => {
    navigate(`/trust-agent/mission/${mission.id}`);
  };

  const handleDisputeClick = (dispute: Dispute) => {
    navigate(`/trust-agent/disputes/${dispute.id}`);
  };

  const markAlertAsRead = async (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  // Computed metrics
  const metricsStats = useMemo(() => ({
    activeDisputes: stats.disputes.open + stats.disputes.inProgress,
    resolvedDisputes: stats.disputes.resolved,
    avgResolutionTime: 2.5,
    satisfactionScore: 4.2,
    pendingValidations: stats.missions.inProgress,
    underReview: 0,
    escalationRate: stats.disputes.total > 0 ? Math.round((stats.disputes.escalated / stats.disputes.total) * 100) : 0,
    successRate: stats.disputes.total > 0 ? Math.round((stats.disputes.resolved / stats.disputes.total) * 100) : 0,
  }), [stats]);

  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader
        title="Tableau de Bord Agent"
        subtitle={`${stats.missions.total} missions • ${stats.disputes.open} litiges ouverts`}
      />

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Alertes ({unreadAlerts})
              </h3>
              <Button
                variant="ghost"
                size="small"
                onClick={() => navigate('/trust-agent/alerts')}
                className="text-sm"
              >
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.slice(0, 6).map((alert) => {
                const AlertIcon = alertTypeConfig[alert.type].icon;
                const isUrgent = alert.priority === 'urgent' || alert.priority === 'high';

                return (
                  <Card
                    key={alert.id}
                    className={`${isUrgent ? 'border-l-4 border-l-amber-500' : ''} ${!alert.read ? 'bg-amber-50/50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isUrgent ? 'bg-amber-100' : 'bg-muted'}`}>
                          <AlertIcon className={`h-4 w-4 ${isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{alert.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                        </div>
                        {alert.action_url && (
                          <Button
                            variant="ghost"
                            size="small"
                            className="p-1 h-auto w-auto flex-shrink-0"
                            onClick={() => {
                              markAlertAsRead(alert.id);
                              navigate(alert.action_url!);
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Cards - Enhanced */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Missions Stats */}
          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/missions')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.missions.total}</p>
                  <p className="text-sm text-muted-foreground">Total Missions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/missions')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.missions.pending}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/missions')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.missions.inProgress}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/missions')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.missions.completed}</p>
                  <p className="text-sm text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row - Disputes & Income */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Disputes Stats */}
          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/disputes')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Scale className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.disputes.open + stats.disputes.inProgress}</p>
                  <p className="text-sm text-muted-foreground">Litiges actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/disputes')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.disputes.resolved}</p>
                  <p className="text-sm text-muted-foreground">Litiges résolus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income Stats */}
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.income.thisMonth.toLocaleString()} FCFA</p>
                  <p className="text-sm text-muted-foreground">Ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Stats */}
          <Card className="bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trust-agent/certifications/properties')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100">
                  <CheckCircle2 className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.verifications.properties}</p>
                  <p className="text-sm text-muted-foreground">Vérifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Missions & Disputes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Missions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Mes Missions</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{missions.length} mission(s)</Badge>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => navigate('/trust-agent/missions')}
                  >
                    Voir tout
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="h-32" />
                    </Card>
                  ))}
                </div>
              ) : missions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune mission assignée pour le moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {missions.slice(0, 5).map((mission) => {
                    const MissionIcon =
                      missionTypeConfig[mission.mission_type]?.icon || ClipboardList;
                    const typeLabel =
                      missionTypeConfig[mission.mission_type]?.label || mission.mission_type;
                    const statusInfo = statusConfig[mission.status] ?? {
                      label: mission.status,
                      variant: 'secondary' as const,
                    };
                    const urgencyInfo = urgencyConfig[mission.urgency] ?? {
                      label: mission.urgency,
                      color: 'text-muted-foreground',
                    };

                    return (
                      <Card
                        key={mission.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleMissionClick(mission)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-lg bg-primary/10">
                                <MissionIcon className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{typeLabel}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {mission.property?.title || 'Propriété inconnue'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatAddress(mission.property?.address, mission.property?.city)}
                                </p>
                                {mission.scheduled_date && (
                                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Planifiée le{' '}
                                    {new Date(mission.scheduled_date).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                              <span className={`text-xs font-medium ${urgencyInfo.color}`}>
                                {mission.urgency === 'urgent' && (
                                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                                )}
                                {urgencyInfo.label}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Disputes Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-600" />
                  Litiges en cours
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stats.disputes.open + stats.disputes.inProgress} actif(s)</Badge>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => navigate('/trust-agent/disputes')}
                  >
                    Voir tout
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              {disputes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun litige en cours</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {disputes.slice(0, 3).map((dispute) => {
                    const TypeIcon = disputeTypeConfig[dispute.type].icon;
                    const typeConfig = disputeTypeConfig[dispute.type];
                    const statusConfig = disputeStatusConfig[dispute.status];
                    const priorityConfig = disputePriorityConfig[dispute.priority];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <Card
                        key={dispute.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${
                          dispute.priority === 'high' ? 'border-l-4 border-l-red-500' : ''
                        }`}
                        onClick={() => handleDisputeClick(dispute)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-lg ${typeConfig.color}`}>
                                <TypeIcon className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{dispute.title}</h3>
                                  <span className={`text-xs font-medium ${priorityConfig.color}`}>
                                    {dispute.priority === 'high' && (
                                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    )}
                                    {priorityConfig.label}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {dispute.description}
                                </p>
                                {dispute.contract_id && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <Home className="h-3 w-3 inline mr-1" />
                                    Contrat #{dispute.contract_id.slice(0, 8)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={statusConfig.variant} className="gap-1">
                                {StatusIcon && <StatusIcon className="h-3 w-3" />}
                                {statusConfig.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ValidationMetrics stats={metricsStats} />
            <WeekCalendarWidget missions={missions as unknown as WeekCalendarWidgetMission[]} />
            <QuickActionsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
