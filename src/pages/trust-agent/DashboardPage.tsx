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

// New Tiers de confiance UI Components
import { MissionCard, ActionCard, EmptyState, TrustAgentPageHeader } from '@/shared/ui/trust-agent';

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
  created_at?: string;
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

const URGENCY_CONFIG = {
  low: { label: 'Basse', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  medium: { label: 'Moyenne', color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
  high: { label: 'Haute', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
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

const buildLinePath = (values: number[], max: number, width: number, height: number) => {
  if (!values.length) return '';
  const safeMax = Math.max(1, max);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = step * index;
      const y = height - (value / safeMax) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const buildAreaPath = (values: number[], max: number, width: number, height: number) => {
  const line = buildLinePath(values, max, width, height);
  if (!line) return '';
  return `${line} L ${width} ${height} L 0 ${height} Z`;
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
    verifications: { properties: 0, users: 0, pendingProperties: 0 },
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

      // Load pending properties to validate
      const { data: pendingPropertiesData } = await supabase
        .from('properties')
        .select('id, ansut_verified')
        .or('ansut_verified.is.null,ansut_verified.eq.false');

      const pendingPropertiesCount = pendingPropertiesData?.length || 0;

      // Load certified users count
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, oneci_verified, cnam_verified, is_verified, facial_verification_status')
        .or(
          'oneci_verified.eq.true,cnam_verified.eq.true,is_verified.eq.true,facial_verification_status.eq.verified'
        );

      const certifiedUsersCount = usersData?.length || 0;

      setStats((prev) => ({
        ...prev,
        verifications: {
          properties: certifiedPropertiesCount,
          users: certifiedUsersCount,
          pendingProperties: pendingPropertiesCount,
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

  const chartMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('fr-FR', { month: 'short' }),
        full: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      };
    });
  }, []);

  const missionSeries = useMemo(() => {
    const bucket = new Map(chartMonths.map((m) => [m.key, 0]));
    missions.forEach((mission) => {
      const dateSource = mission.created_at || mission.scheduled_date;
      if (!dateSource) return;
      const date = new Date(dateSource);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (bucket.has(key)) {
        bucket.set(key, (bucket.get(key) || 0) + 1);
      }
    });
    return chartMonths.map((m) => bucket.get(m.key) || 0);
  }, [chartMonths, missions]);

  const disputeSeries = useMemo(() => {
    const bucket = new Map(chartMonths.map((m) => [m.key, 0]));
    disputes.forEach((dispute) => {
      const date = new Date(dispute.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (bucket.has(key)) {
        bucket.set(key, (bucket.get(key) || 0) + 1);
      }
    });
    return chartMonths.map((m) => bucket.get(m.key) || 0);
  }, [chartMonths, disputes]);

  const chartMax = useMemo(() => {
    return Math.max(1, ...missionSeries, ...disputeSeries);
  }, [missionSeries, disputeSeries]);

  const resolutionRate = useMemo(() => {
    if (!stats.disputes.total) return 0;
    return Math.round((stats.disputes.resolved / stats.disputes.total) * 100);
  }, [stats.disputes]);

  const summaryTiles = useMemo(
    () => [
      {
        label: 'Propriétés certifiées',
        value: stats.verifications.properties,
        icon: Home,
        accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      },
      {
        label: 'Propriétés à valider',
        value: stats.verifications.pendingProperties,
        icon: Home,
        accent: 'text-orange-700 bg-orange-50 border-orange-200',
      },
      {
        label: 'Utilisateurs certifiés',
        value: stats.verifications.users,
        icon: Users,
        accent: 'text-blue-700 bg-blue-50 border-blue-200',
      },
      {
        label: 'Dossiers en attente',
        value: stats.missions.pending,
        icon: FileCheck,
        accent: 'text-amber-700 bg-amber-50 border-amber-200',
      },
      {
        label: 'Revenus ce mois',
        value: `${stats.income.thisMonth.toLocaleString()} FCFA`,
        icon: DollarSign,
        accent: 'text-green-700 bg-green-50 border-green-200',
      },
    ],
    [stats]
  );

  const missionBuckets = useMemo(
    () => ({
      pending: missions.filter((m) => m.status === 'pending' || m.status === 'assigned'),
      inProgress: missions.filter((m) => m.status === 'in_progress'),
      completed: missions.filter((m) => m.status === 'completed'),
    }),
    [missions]
  );

  const upcomingMissions = useMemo(
    () =>
      missions.filter((m) => m.scheduled_date && new Date(m.scheduled_date) > new Date()),
    [missions]
  );

  const chartWidth = 120;
  const chartHeight = 40;
  const missionLinePath = useMemo(
    () => buildLinePath(missionSeries, chartMax, chartWidth, chartHeight),
    [missionSeries, chartMax]
  );
  const disputeLinePath = useMemo(
    () => buildLinePath(disputeSeries, chartMax, chartWidth, chartHeight),
    [disputeSeries, chartMax]
  );
  const missionAreaPath = useMemo(
    () => buildAreaPath(missionSeries, chartMax, chartWidth, chartHeight),
    [missionSeries, chartMax]
  );
  const pipelineColumns = useMemo(
    () => [
      {
        id: 'pending',
        label: 'À traiter',
        accent: 'bg-amber-50 border-amber-200 text-amber-700',
        items: missionBuckets.pending.slice(0, 3),
      },
      {
        id: 'in_progress',
        label: 'En cours',
        accent: 'bg-blue-50 border-blue-200 text-blue-700',
        items: missionBuckets.inProgress.slice(0, 3),
      },
      {
        id: 'completed',
        label: 'Terminées',
        accent: 'bg-green-50 border-green-200 text-green-700',
        items: missionBuckets.completed.slice(0, 3),
      },
    ],
    [missionBuckets]
  );

  return (
    <div className="min-h-screen bg-[#F7F4F1]">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Tableau de Bord"
        subtitle={`${stats.missions.inProgress} mission${stats.missions.inProgress > 1 ? 's' : ''} en cours • ${stats.missions.pending} en attente`}
        badges={[
          { label: `${stats.missions.total} missions`, variant: 'default' },
          ...(stats.verifications.pendingProperties > 0
            ? [
                {
                  label: `${stats.verifications.pendingProperties} propriété${stats.verifications.pendingProperties > 1 ? 's' : ''} à valider`,
                  variant: 'warning' as const,
                },
              ]
            : []),
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
        className="bg-white/90 backdrop-blur border-b border-[#EFEBE9]"
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-8">
        {(stats.disputes.open > 0 || missions.some((m) => m.urgency === 'urgent')) && (
          <div className="p-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 w-fit">
                <Bell className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Actions prioritaires</p>
                <p className="text-sm text-red-700">
                  {stats.disputes.open} litige(s) ouverts et {stats.missions.pending} mission(s) en attente.
                </p>
              </div>
              <Button
                variant="outline"
                size="small"
                onClick={() => navigate('/trust-agent/disputes')}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Traiter
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <section className="grid xl:grid-cols-[1.7fr,1fr] gap-6">
          <div className="rounded-2xl border border-[#EFEBE9] bg-white p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(241,101,34,0.08),_transparent_55%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#A69B95]">Vue Décap</p>
                  <h2 className="text-xl font-semibold text-[#2C1810]">Récapitulatif des actions</h2>
                  <p className="text-sm text-[#6B5A4E]">
                    Vue d’ensemble des validations, missions et litiges
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6B5A4E]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F16522]" />
                    Missions
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2C1810]/70" />
                    Litiges
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {summaryTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div
                      key={tile.label}
                      className={`rounded-xl border p-3 ${tile.accent} bg-white/70`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{tile.label}</p>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-lg font-semibold mt-2 text-[#2C1810]">{tile.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-[#F1E7DE] bg-[#FFF9F4] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#9C3D0D]">Tendance 6 mois</p>
                  <span className="text-[11px] text-[#A69B95]">Max: {chartMax}</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[520px]">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28">
                      <defs>
                        <linearGradient id="missionArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#F16522" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#F16522" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <path d={missionAreaPath} fill="url(#missionArea)" />
                      <path
                        d={missionLinePath}
                        stroke="#F16522"
                        strokeWidth="2.5"
                        fill="none"
                      />
                      <path
                        d={disputeLinePath}
                        stroke="#2C1810"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="4 4"
                      />
                      {missionSeries.map((value, index) => {
                        const step =
                          missionSeries.length > 1 ? chartWidth / (missionSeries.length - 1) : 0;
                        const x = step * index;
                        const y = chartHeight - (value / chartMax) * chartHeight;
                        return <circle key={`m-${index}`} cx={x} cy={y} r={2} fill="#F16522" />;
                      })}
                      {disputeSeries.map((value, index) => {
                        const step =
                          disputeSeries.length > 1 ? chartWidth / (disputeSeries.length - 1) : 0;
                        const x = step * index;
                        const y = chartHeight - (value / chartMax) * chartHeight;
                        return <circle key={`d-${index}`} cx={x} cy={y} r={2} fill="#2C1810" />;
                      })}
                    </svg>
                    <div className="grid grid-cols-6 text-[11px] uppercase tracking-wide text-[#A69B95] mt-2">
                      {chartMonths.map((month) => (
                        <span key={month.key} className="text-center">
                          {month.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#EFEBE9] bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-[#A69B95]">Focus du jour</p>
              <h3 className="text-lg font-semibold text-[#2C1810] mt-1">Priorités</h3>
              <p className="text-sm text-[#6B5A4E] mt-2">
                {stats.missions.pending > 0
                  ? `${stats.missions.pending} mission(s) à traiter immédiatement.`
                  : "Aucune mission en attente, continuez l'excellent rythme."}
              </p>
              <button
                onClick={() => navigate('/trust-agent/missions')}
                className="mt-3 text-xs font-semibold text-[#F16522] hover:underline"
              >
                Accéder aux missions →
              </button>
            </div>

            <div className="rounded-2xl border border-[#F5D9C6] bg-[#FFF2E6] p-4">
              <p className="text-xs uppercase tracking-wider text-[#A69B95]">Qualité</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-semibold text-[#2C1810]">
                  Taux de résolution: {resolutionRate}%
                </span>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#FAE7D9] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F16522] to-[#D95318] transition-all"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#EFEBE9] bg-white p-4">
              <h3 className="text-lg font-semibold text-[#2C1810] mb-3">Actions rapides</h3>
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
                  title="Certifier une Propriété"
                  description={`${stats.verifications.pendingProperties} propriété${stats.verifications.pendingProperties > 1 ? 's' : ''} à valider`}
                  icon={<Home />}
                  variant="success"
                  status={stats.verifications.pendingProperties > 0 ? 'pending' : 'completed'}
                  actionLabel="Ouvrir"
                  onAction={() => navigate('/trust-agent/certifications/properties')}
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
          </div>
        </section>

        <section className="grid lg:grid-cols-[1.1fr,1.9fr] gap-6">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#EFEBE9] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#A69B95]">Pipeline</p>
                  <h3 className="text-lg font-semibold text-[#2C1810]">Missions</h3>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => navigate('/trust-agent/missions')}
                >
                  Tout voir
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                {pipelineColumns.map((column) => (
                  <div key={column.id} className={`rounded-xl border p-3 ${column.accent}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{column.label}</span>
                      <span className="text-xs font-semibold">{column.items.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {column.items.length === 0 && (
                        <p className="text-xs text-[#8B7355]">Aucune mission</p>
                      )}
                      {column.items.map((mission) => (
                        <button
                          key={mission.id}
                          onClick={() => handleMissionClick(mission)}
                          className="w-full text-left rounded-lg border border-white/60 bg-white/70 px-3 py-2 hover:border-[#F16522]/30 hover:bg-white transition-colors"
                        >
                          <p className="text-xs font-semibold text-[#2C1810] truncate">
                            {mission.property?.title || 'Mission'}
                          </p>
                          <p className="text-[11px] text-[#8B7355]">
                            {MISSION_TYPE_CONFIG[mission.mission_type]?.label || 'Mission'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  À venir
                </h3>
                <div className="space-y-3">
                  {upcomingMissions.slice(0, 3).map((mission) => (
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
                  {upcomingMissions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Aucune mission à venir
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#2C1810]">Missions récentes</h2>
                  <p className="text-sm text-[#6B5A4E] mt-0.5">
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
                  {missions.slice(0, 4).map((mission) => {
                    const typeConfig =
                      MISSION_TYPE_CONFIG[mission.mission_type] || MISSION_TYPE_CONFIG.cev;
                    const TypeIcon = typeConfig.icon;
                    const statusConfig =
                      STATUS_CONFIG[mission.status as keyof typeof STATUS_CONFIG] ||
                      STATUS_CONFIG.pending;
                    const urgencyConfig =
                      URGENCY_CONFIG[mission.urgency as keyof typeof URGENCY_CONFIG] ||
                      URGENCY_CONFIG.medium;

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
                        urgencyLabel={urgencyConfig.label}
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

            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                    <Scale className="h-5 w-5 text-purple-600" />
                    Litiges en cours
                  </h2>
                  <p className="text-sm text-[#6B5A4E] mt-0.5">
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
        </section>
      </main>
    </div>
  );
}
