import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  DollarSign,
  Bell,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Users,
  Calendar,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { AddressValue } from '@/shared/utils/address';
import { cn } from '@/shared/lib/utils';

// New Trust Agent UI Components
import {
  KPICard,
  MissionCard,
  ActionCard,
  EmptyState,
  TrustAgentPageHeader,
} from '@/shared/ui/trust-agent';

// Types
interface Dispute {
  id: string;
  contract_id: string;
  type: 'deposit' | 'damage' | 'rent' | 'noise' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  created_at: string;
}

interface DashboardMission {
  id: string;
  property_id: string;
  mission_type: string;
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  property?: {
    title: string;
    address: AddressValue;
    city: string;
  };
}

// Status configurations
const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    variant: 'secondary' as const,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  },
  in_progress: {
    label: 'En cours',
    variant: 'default' as const,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  completed: {
    label: 'Terminée',
    variant: 'secondary' as const,
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  cancelled: {
    label: 'Annulée',
    variant: 'destructive' as const,
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

const MISSION_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  cev: { label: 'CEV Complète', icon: ClipboardList },
  photos: { label: 'Vérification Photos', icon: Camera },
  documents: { label: 'Validation Documents', icon: FileCheck },
  etat_lieux: { label: 'État des Lieux', icon: Home },
};

const DISPUTE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  deposit: { label: 'Dépôt de garantie', icon: DollarSign, color: 'bg-purple-100 text-purple-700' },
  damage: { label: 'Dommages', icon: Home, color: 'bg-orange-100 text-orange-700' },
  rent: { label: 'Loyer impayé', icon: DollarSign, color: 'bg-red-100 text-red-700' },
  noise: { label: 'Bruit', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Autre', icon: MessageSquare, color: 'bg-gray-100 text-gray-700' },
};

export default function TrustAgentDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [missions, setMissions] = useState<DashboardMission[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    missions: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    disputes: { total: 0, open: 0, inProgress: 0, resolved: 0 },
    income: { thisMonth: 0, thisYear: 0 },
    verifications: { properties: 0, users: 0 },
  });

  const loadMissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select('*, property:properties(title, address, city)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const missionData = (data || []) as DashboardMission[];
      setMissions(missionData);

      setStats((prev) => ({
        ...prev,
        missions: {
          total: missionData.length,
          pending: missionData.filter((m) => m.status === 'pending' || m.status === 'assigned')
            .length,
          inProgress: missionData.filter((m) => m.status === 'in_progress').length,
          completed: missionData.filter((m) => m.status === 'completed').length,
        },
      }));
    } catch (error) {
      console.error('Error loading missions:', error);
    }
  }, []);

  const loadDisputes = useCallback(async () => {
    try {
      const { data, error } = (await supabase
        .from('disputes' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)) as unknown as { data: unknown[]; error: { code?: string } | null };

      if (error?.code === 'PGRST204' || error?.code === 'PGRST116') {
        setDisputes([]);
        return;
      }

      if (error) throw error;

      const disputeData = (data || []) as Dispute[];
      setDisputes(disputeData);

      setStats((prev) => ({
        ...prev,
        disputes: {
          total: disputeData.length,
          open: disputeData.filter((d) => d.status === 'open').length,
          inProgress: disputeData.filter((d) => d.status === 'in_progress').length,
          resolved: disputeData.filter((d) => d.status === 'resolved').length,
        },
      }));
    } catch (error) {
      console.error('Error loading disputes:', error);
      setDisputes([]);
    }
  }, []);

  const loadVerifications = useCallback(async () => {
    try {
      // Load certified properties count
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, ansut_verified, status')
        .eq('ansut_verified', true);

      const certifiedPropertiesCount = propertiesData?.length || 0;

      // Load certified users count
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, oneci_verified, aneut_verified')
        .or('oneci_verified.eq.true,aneut_verified.eq.true');

      const certifiedUsersCount = usersData?.length || 0;

      setStats((prev) => ({
        ...prev,
        verifications: {
          properties: certifiedPropertiesCount,
          users: certifiedUsersCount,
        },
      }));
    } catch (error) {
      console.error('Error loading verifications:', error);
    }
  }, []);

  const loadIncome = useCallback(async () => {
    try {
      // Get income from completed missions (honoraires)
      // Note: mission_payments table may not exist in the schema
      // Using default values for now
      const thisMonthIncome = 0;
      const thisYearIncome = 0;

      setStats((prev) => ({
        ...prev,
        income: {
          thisMonth: thisMonthIncome,
          thisYear: thisYearIncome,
        },
      }));
    } catch (error) {
      console.error('Error loading income:', error);
      // Set default values if table doesn't exist
      setStats((prev) => ({
        ...prev,
        income: { thisMonth: 0, thisYear: 0 },
      }));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([loadMissions(), loadDisputes(), loadVerifications(), loadIncome()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadIncome, loadDisputes, loadMissions, loadVerifications]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData]);

  const handleMissionClick = (mission: DashboardMission) => {
    navigate(`/trust-agent/mission/${mission.id}`);
  };

  const handleDisputeClick = (dispute: Dispute) => {
    navigate(`/trust-agent/disputes/${dispute.id}`);
  };

  // Calculate metrics for KPI cards
  const kpiData = useMemo(
    () => [
      {
        title: 'Total Missions',
        value: stats.missions.total,
        icon: <ClipboardList />,
        trend: { value: 12, label: 'vs mois dernier' },
        variant: 'default' as const,
        onClick: () => navigate('/trust-agent/missions'),
      },
      {
        title: 'En attente',
        value: stats.missions.pending,
        icon: <Clock />,
        variant: 'warning' as const,
        onClick: () => navigate('/trust-agent/missions'),
      },
      {
        title: 'En cours',
        value: stats.missions.inProgress,
        icon: <TrendingUp />,
        variant: 'info' as const,
        onClick: () => navigate('/trust-agent/missions'),
      },
      {
        title: 'Terminées',
        value: stats.missions.completed,
        icon: <CheckCircle2 />,
        trend: { value: 8, label: 'vs mois dernier' },
        variant: 'success' as const,
        onClick: () => navigate('/trust-agent/missions'),
      },
    ],
    [stats.missions, navigate]
  );

  const disputeKpiData = useMemo(
    () => [
      {
        title: 'Litiges actifs',
        value: stats.disputes.open + stats.disputes.inProgress,
        icon: <Scale />,
        variant: 'warning' as const,
        onClick: () => navigate('/trust-agent/disputes'),
      },
      {
        title: 'Résolus',
        value: stats.disputes.resolved,
        icon: <CheckCircle2 />,
        trend: { value: 15, label: 'taux de résolution' },
        variant: 'success' as const,
        onClick: () => navigate('/trust-agent/disputes'),
      },
    ],
    [stats.disputes, navigate]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Tableau de Bord"
        subtitle={`${stats.missions.inProgress} mission${stats.missions.inProgress > 1 ? 's' : ''} en cours • ${stats.missions.pending} en attente`}
        badges={[
          { label: `${stats.missions.total} missions`, variant: 'default' },
          ...(stats.disputes.open > 0
            ? [
                {
                  label: `${stats.disputes.open} litige${stats.disputes.open > 1 ? 's' : ''}`,
                  variant: 'destructive' as const,
                },
              ]
            : []),
          ...(stats.missions.pending > 0
            ? [{ label: `${stats.missions.pending} à traiter`, variant: 'warning' as const }]
            : []),
        ]}
        actions={[
          {
            label: 'Nouvelle Mission',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => navigate('/trust-agent/missions/new'),
            variant: 'primary',
          },
          {
            label: 'Calendrier',
            icon: <Calendar className="h-4 w-4" />,
            onClick: () => navigate('/trust-agent/calendar'),
            variant: 'outline',
          },
          {
            label: 'Actualiser',
            icon: <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />,
            onClick: handleRefresh,
            variant: 'ghost',
            disabled: refreshing,
          },
        ]}
        notificationCount={stats.disputes.open}
        onNotificationClick={() => navigate('/trust-agent/disputes')}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Alert Banner for Urgent Items */}
        {(stats.disputes.open > 0 || missions.some((m) => m.urgency === 'urgent')) && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Bell className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Actions requises</p>
                <p className="text-sm text-red-700">
                  {stats.disputes.open} litige(s) ouvert(s) nécessitent votre attention
                </p>
              </div>
              <Button
                variant="outline"
                size="small"
                onClick={() => navigate('/trust-agent/disputes')}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Voir
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* KPI Cards - Missions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpiData[index]} {...kpi} />
          ))}
        </div>

        {/* KPI Cards - Disputes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {disputeKpiData.map((kpi, index) => (
            <KPICard key={`dispute-${index}`} {...kpi} />
          ))}
        </div>

        {/* KPI Cards - Verifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Propriétés certifiées"
            value={stats.verifications.properties}
            icon={<Home />}
            variant="success"
            onClick={() => navigate('/trust-agent/certifications/properties')}
          />
          <KPICard
            title="Utilisateurs certifiés"
            value={stats.verifications.users}
            icon={<Users />}
            variant="info"
            onClick={() => navigate('/trust-agent/certifications/users')}
          />
          <KPICard
            title="Dossiers en attente"
            value={stats.missions.pending}
            icon={<FileCheck />}
            variant="warning"
            onClick={() => navigate('/trust-agent/dossiers')}
          />
          <KPICard
            title="Revenus ce mois"
            value={`${stats.income.thisMonth.toLocaleString()} FCFA`}
            icon={<DollarSign />}
            variant="success"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Missions & Disputes */}
          <div className="lg:col-span-2 space-y-8">
            {/* Missions Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Missions Récentes</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {missions.filter((m) => m.status === 'in_progress').length} en cours
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => navigate('/trust-agent/missions')}
                >
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : missions.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList />}
                  title="Aucune mission"
                  description="Vous n'avez pas encore de missions assignées."
                  actionLabel="Voir toutes les missions"
                  onAction={() => navigate('/trust-agent/missions')}
                  variant="default"
                />
              ) : (
                <div className="space-y-3">
                  {missions.slice(0, 5).map((mission) => {
                    const typeConfig =
                      MISSION_TYPE_CONFIG[mission.mission_type] || MISSION_TYPE_CONFIG.cev;
                    const TypeIcon = typeConfig.icon;
                    const statusConfig =
                      STATUS_CONFIG[mission.status as keyof typeof STATUS_CONFIG] ||
                      STATUS_CONFIG.pending;

                    return (
                      <MissionCard
                        key={mission.id}
                        title={typeConfig.label}
                        type={mission.property?.title || 'Propriété inconnue'}
                        typeIcon={<TypeIcon className="h-6 w-6" />}
                        typeColor="bg-primary/10 text-primary-600"
                        status={mission.status as keyof typeof STATUS_CONFIG}
                        statusLabel={statusConfig.label}
                        urgency={mission.urgency as keyof typeof URGENCY_CONFIG}
                        urgencyLabel={
                          mission.urgency === 'urgent'
                            ? 'Urgente'
                            : mission.urgency === 'high'
                              ? 'Haute'
                              : mission.urgency === 'medium'
                                ? 'Moyenne'
                                : 'Basse'
                        }
                        property={
                          mission.property
                            ? {
                                title: mission.property.title,
                                address: mission.property.address,
                                city: mission.property.city,
                              }
                            : undefined
                        }
                        scheduledDate={
                          mission.scheduled_date ? new Date(mission.scheduled_date) : undefined
                        }
                        progress={
                          mission.status === 'completed'
                            ? 100
                            : mission.status === 'in_progress'
                              ? 50
                              : 0
                        }
                        onClick={() => handleMissionClick(mission)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Disputes Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Scale className="h-5 w-5 text-purple-600" />
                    Litiges en cours
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {stats.disputes.open + stats.disputes.inProgress} actif(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => navigate('/trust-agent/disputes')}
                >
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {disputes.length === 0 ? (
                <EmptyState
                  icon={<Scale />}
                  title="Aucun litige"
                  description="Aucun litige en cours pour le moment."
                  variant="success"
                />
              ) : (
                <div className="space-y-3">
                  {disputes.slice(0, 3).map((dispute) => {
                    const typeConfig =
                      DISPUTE_TYPE_CONFIG[dispute.type] || DISPUTE_TYPE_CONFIG.other;
                    const TypeIcon = typeConfig.icon;

                    return (
                      <Card
                        key={dispute.id}
                        className={cn(
                          'cursor-pointer hover:shadow-md transition-all',
                          dispute.priority === 'high' ? 'border-l-4 border-l-red-500' : ''
                        )}
                        onClick={() => handleDisputeClick(dispute)}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={cn('p-3 rounded-xl', typeConfig.color)}>
                                <TypeIcon className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{dispute.title}</h3>
                                  {dispute.priority === 'high' && (
                                    <Badge className="bg-red-100 text-red-700 border-0">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Prioritaire
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                  {dispute.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                <ActionCard
                  title="Nouvelle Mission CEV"
                  description="Créer une nouvelle mission de vérification"
                  icon={<ClipboardList />}
                  variant="primary"
                  actionLabel="Créer"
                  onAction={() => navigate('/trust-agent/missions/new')}
                />
                <ActionCard
                  title="Valider un Dossier"
                  description="Traiter les dossiers en attente"
                  icon={<FileCheck />}
                  variant="warning"
                  status={stats.missions.pending > 0 ? 'pending' : 'completed'}
                  actionLabel="Voir"
                  onAction={() => navigate('/trust-agent/dossiers')}
                />
                <ActionCard
                  title="Consulter le Calendrier"
                  description="Voir les missions planifiées"
                  icon={<Calendar />}
                  variant="info"
                  actionLabel="Ouvrir"
                  onAction={() => navigate('/trust-agent/calendar')}
                />
              </div>
            </div>

            {/* Upcoming Tasks */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />À venir
                </h3>
                <div className="space-y-3">
                  {missions
                    .filter((m) => m.scheduled_date && new Date(m.scheduled_date) > new Date())
                    .slice(0, 3)
                    .map((mission) => (
                      <div
                        key={mission.id}
                        className="p-3 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors"
                        onClick={() => handleMissionClick(mission)}
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {MISSION_TYPE_CONFIG[mission.mission_type]?.label || 'Mission'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {mission.scheduled_date &&
                            new Date(mission.scheduled_date).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                        </p>
                      </div>
                    ))}
                  {missions.filter(
                    (m) => m.scheduled_date && new Date(m.scheduled_date) > new Date()
                  ).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Aucune mission à venir</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
