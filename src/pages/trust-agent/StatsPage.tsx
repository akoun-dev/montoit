/**
 * Page de statistiques pour l'agent de confiance
 *
 * Affiche les statistiques avancées avec graphiques Recharts.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Briefcase,
  Scale,
  Home,
  CheckCircle2,
  Clock,
  Award,
  FileText,
  ChevronDown,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { TrustAgentPageHeader, KPICard, EmptyState } from '@/shared/ui/trust-agent';
import { cn } from '@/shared/lib/utils';
import { toast } from '@/hooks/shared/useSafeToast';
import {
  statsService,
  type MissionStats,
  type DisputeStats,
  type CertificationStats,
  type OverviewStats,
  type TimeSeriesData,
} from '@/features/trust-agent/services/stats.service';

// Périodes de filtre
const PERIOD_FILTERS = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
];

// Onglets de statistiques
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
  { id: 'missions', label: 'Missions', icon: Briefcase },
  { id: 'disputes', label: 'Litiges', icon: Scale },
  { id: 'certifications', label: 'Certifications', icon: Award },
];

// Couleurs pour les graphiques
const COLORS = {
  primary: '#FF6C2F',
  secondary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  pink: '#EC4899',
};

type PeriodFilter = 'week' | 'month' | 'quarter' | 'year';
type TabId = 'overview' | 'missions' | 'disputes' | 'certifications';

export default function StatsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);

  // États pour les données
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [missionStats, setMissionStats] = useState<MissionStats | null>(null);
  const [disputeStats, setDisputeStats] = useState<DisputeStats | null>(null);
  const [certificationStats, setCertificationStats] = useState<CertificationStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  // Charger les données au montage et quand la période change
  useEffect(() => {
    loadStatsData();
  }, [period]);

  const loadStatsData = async () => {
    try {
      setLoading(true);

      // Charger toutes les statistiques en parallèle
      const [overview, missions, disputes, certifications, timeSeries] = await Promise.all([
        statsService.getOverviewStats(period),
        statsService.getMissionStats(),
        statsService.getDisputeStats(),
        statsService.getCertificationStats(),
        statsService.getTimeSeriesData(),
      ]);

      setOverviewStats(overview);
      setMissionStats(missions);
      setDisputeStats(disputes);
      setCertificationStats(certifications);
      setTimeSeriesData(timeSeries);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // KPIs pour la vue d'ensemble
  const overviewKPIs = useMemo(() => {
    if (!overviewStats) return [];

    return [
      {
        title: 'Taux de complétion',
        value: `${overviewStats.missionCompletionRate}%`,
        icon: <CheckCircle2 />,
        trend: overviewStats.monthlyTrend > 0 ? `+${overviewStats.monthlyTrend}%` : `${overviewStats.monthlyTrend}%`,
        trendUp: overviewStats.monthlyTrend > 0,
        variant: (overviewStats.missionCompletionRate >= 80 ? 'success' : overviewStats.missionCompletionRate >= 50 ? 'warning' : 'danger') as const,
      },
      {
        title: 'Temps moyen de résolution',
        value: `${overviewStats.avgResolutionTime}j`,
        icon: <Clock />,
        trend: '-12%',
        trendUp: true,
        variant: 'info' as const,
      },
      {
        title: 'Dossiers traités',
        value: overviewStats.totalDossiers.toString(),
        icon: <FileText />,
        trend: '+18%',
        trendUp: true,
        variant: 'default' as const,
      },
      {
        title: 'Certifications ANSUT',
        value: overviewStats.totalCertifications.toString(),
        icon: <Award />,
        trend: '+8%',
        trendUp: true,
        variant: 'warning' as const,
      },
    ];
  }, [overviewStats]);

  const renderOverviewTab = () => {
    if (!overviewStats || !missionStats) return null;

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewKPIs.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              Tendances mensuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="missions" stroke={COLORS.primary} strokeWidth={2} name="Missions" />
                <Line type="monotone" dataKey="disputes" stroke={COLORS.danger} strokeWidth={2} name="Litiges" />
                <Line type="monotone" dataKey="certifications" stroke={COLORS.success} strokeWidth={2} name="Certifications" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Taux de complétion par statut</CardTitle>
            </CardHeader>
            <CardContent>
              {missionStats.byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={missionStats.byStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {missionStats.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volume d'activité</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="missions" fill={COLORS.primary} name="Missions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderMissionsTab = () => {
    if (!missionStats) return null;

    return (
      <div className="space-y-6">
        {/* Mission KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Total missions"
            value={missionStats.total.toString()}
            icon={<Briefcase />}
            variant="default"
          />
          <KPICard
            title="Complétées"
            value={missionStats.completed.toString()}
            icon={<CheckCircle2 />}
            variant="success"
          />
          <KPICard
            title="Taux de complétion"
            value={`${missionStats.completionRate}%`}
            icon={<Award />}
            variant={missionStats.completionRate >= 80 ? 'success' : missionStats.completionRate >= 50 ? 'warning' : 'danger'}
          />
        </div>

        {/* Missions by Type */}
        {missionStats.byType.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Missions par type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={missionStats.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill={COLORS.success} name="Complétées" />
                  <Bar dataKey="pending" fill={COLORS.warning} name="En attente" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12">
              <EmptyState
                icon={<Briefcase />}
                title="Aucune mission"
                description="Aucune mission n'a été trouvée"
                variant="filter"
              />
            </CardContent>
          </Card>
        )}

        {/* Average Time by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Temps moyen par type de mission</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={missionStats.avgTimeByType} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={100} />
                <Tooltip formatter={(value) => `${value} heures`} />
                <Bar dataKey="hours" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Missions Status Distribution */}
        {missionStats.byStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribution par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={missionStats.byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {missionStats.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDisputesTab = () => {
    if (!disputeStats) return null;

    return (
      <div className="space-y-6">
        {/* Disputes KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Total litiges"
            value={disputeStats.total.toString()}
            icon={<Scale />}
            variant="default"
          />
          <KPICard
            title="Taux de résolution"
            value={`${disputeStats.resolutionRate}%`}
            icon={<CheckCircle2 />}
            variant={disputeStats.resolutionRate >= 80 ? 'success' : disputeStats.resolutionRate >= 50 ? 'warning' : 'danger'}
          />
          <KPICard
            title="Durée moyenne"
            value={`${disputeStats.avgDuration}j`}
            icon={<Clock />}
            variant="info"
          />
          <KPICard
            title="Escaladés"
            value={disputeStats.escalated.toString()}
            icon={<TrendingUp />}
            variant="danger"
          />
        </div>

        {/* Disputes by Type */}
        {disputeStats.byType.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Litiges par type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={disputeStats.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" fill={COLORS.success} name="Résolus" />
                  <Bar dataKey="escalated" fill={COLORS.danger} name="Escaladés" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12">
              <EmptyState
                icon={<Scale />}
                title="Aucun litige"
                description="Aucun litige n'a été trouvé"
                variant="filter"
              />
            </CardContent>
          </Card>
        )}

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={disputeStats.byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="resolved" stroke={COLORS.success} strokeWidth={2} name="Résolus" />
                <Line type="monotone" dataKey="escalated" stroke={COLORS.danger} strokeWidth={2} name="Escaladés" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCertificationsTab = () => {
    if (!certificationStats) return null;

    return (
      <div className="space-y-6">
        {/* Certifications KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Utilisateurs certifiés"
            value={certificationStats.totalUsers.toString()}
            icon={<Users />}
            variant="success"
          />
          <KPICard
            title="Propriétés ANSUT"
            value={certificationStats.totalProperties.toString()}
            icon={<Home />}
            variant="warning"
          />
          <KPICard
            title="Dossiers approuvés"
            value={certificationStats.dossiers.approved.toString()}
            icon={<CheckCircle2 />}
            variant="success"
          />
          <KPICard
            title="En attente"
            value={certificationStats.dossiers.pending.toString()}
            icon={<Clock />}
            variant="info"
          />
        </div>

        {/* Users and Properties Trend */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs certifiés par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={certificationStats.usersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke={COLORS.primary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propriétés certifiées par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={certificationStats.propertiesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="properties" stroke={COLORS.success} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Dossiers Status */}
        <Card>
          <CardHeader>
            <CardTitle>Statut des dossiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50">
                <p className="text-3xl font-bold text-green-600">{certificationStats.dossiers.approved}</p>
                <p className="text-sm text-green-700">Approuvés</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50">
                <p className="text-3xl font-bold text-yellow-600">{certificationStats.dossiers.pending}</p>
                <p className="text-sm text-yellow-700">En attente</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50">
                <p className="text-3xl font-bold text-red-600">{certificationStats.dossiers.rejected}</p>
                <p className="text-sm text-red-700">Rejetés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Statistiques"
        subtitle="Analyse approfondie de vos activités"
        actions={[
          {
            label: 'Actualiser',
            icon: <Calendar />,
            onClick: loadStatsData,
            variant: 'outline',
          },
        ]}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Period Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Période:</span>
                <div className="relative">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                    className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {PERIOD_FILTERS.map((filter) => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Stats Summary */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-gray-600">{overviewStats?.totalMissions || 0} missions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-gray-600">{overviewStats?.totalDisputes || 0} litiges</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">{overviewStats?.totalCertifications || 0} certifications</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 py-4 px-1 border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'missions' && renderMissionsTab()}
            {activeTab === 'disputes' && renderDisputesTab()}
            {activeTab === 'certifications' && renderCertificationsTab()}
          </>
        )}
      </main>
    </div>
  );
}
