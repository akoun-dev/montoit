import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  Users,
  Home,
  FileText,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Info,
  DollarSign,
  UserPlus,
  RefreshCw,
  Download,
} from 'lucide-react';
import { FormatService } from '@/services/format/formatService';

interface PlatformStats {
  total_users: number;
  total_properties: number;
  total_leases: number;
  active_leases: number;
  total_payments: number;
  total_visits: number;
  pending_verifications: number;
  pending_maintenance: number;
  total_revenue: number;
  monthly_growth: number;
  error_rate: number;
  uptime: number;
  total_conversations?: number;
  total_messages?: number;
  total_feedbacks?: number;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isFormatted?: boolean;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  user_email: string | null;
  created_at: string | null;
  details: unknown;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Check admin access based on user_type instead of RPC
        const userType = profile?.user_type?.toLowerCase() || '';

        // Allow access for admin_ansut or admin user types
        const hasAdminAccess = userType === 'admin_ansut' || userType === 'admin';

        if (!hasAdminAccess) {
          console.error('Access denied: user_type is', profile?.user_type);
          navigate('/');
          return;
        }

        setIsAdmin(true);
        loadDashboardData();
      } catch (err) {
        console.error('Error checking admin access:', err);
        navigate('/');
      }
    };

    if (user && profile) {
      checkAdminAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Try to get stats from RPC, fallback to manual calculation
      let statsData: PlatformStats | null = null;
      try {
        const { data, error: statsError } = await supabase.rpc('get_platform_stats');
        if (!statsError && data && typeof data === 'object' && !Array.isArray(data)) {
          statsData = data as unknown as PlatformStats;
        }
      } catch {
        console.warn('get_platform_stats RPC not available, using manual calculation');
      }

      // Manual calculation if RPC failed
      if (!statsData) {
        const [usersCount, propertiesCount, leasesCount] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('properties').select('id', { count: 'exact', head: true }),
          supabase.from('lease_contracts').select('id', { count: 'exact', head: true }),
        ]);

        statsData = {
          total_users: usersCount.count || 0,
          total_properties: propertiesCount.count || 0,
          total_leases: leasesCount.count || 0,
          active_leases: 0,
          total_payments: 0,
          pending_verification_requests: 0,
          open_disputes: 0,
          monthly_revenue: 0,
        } as PlatformStats;
      }

      setStats(statsData);

      const { data: activitiesData } = await supabase
        .from('admin_audit_logs')
        .select('id, action, entity_type, user_email, created_at, details')
        .order('created_at', { ascending: false })
        .limit(20);

      if (activitiesData) {
        setActivities(activitiesData);
      }

      setAlerts([
        {
          id: '1',
          type: 'warning',
          title: 'Pic de charge détecté',
          message: 'Temps de réponse moyen > 2s sur les 15 dernières minutes',
          timestamp: new Date().toISOString(),
          resolved: false,
        },
        {
          id: '2',
          type: 'error',
          title: 'Échec de paiement Stripe',
          message: '3 échecs de paiement dans les 10 dernières minutes',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          resolved: false,
        },
        {
          id: '3',
          type: 'info',
          title: 'Nouvelle version déployée',
          message: 'Version 2.1.3 déployée avec succès',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          resolved: true,
        },
      ]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-[#6B5A4E]">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  const metricCards: MetricCard[] = [
    {
      title: 'Utilisateurs Actifs',
      value: stats?.total_users || 0,
      change: 12.5,
      changeType: 'increase',
      icon: Users,
      color: 'text-[#F16522]',
      bgColor: 'bg-[#FFF5F0]',
    },
    {
      title: 'Propriétés Totales',
      value: stats?.total_properties || 0,
      change: 8.3,
      changeType: 'increase',
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Transactions (30j)',
      value: stats?.total_leases || 0,
      change: -2.1,
      changeType: 'decrease',
      icon: FileText,
      color: 'text-[#2C1810]',
      bgColor: 'bg-[#E8D4C5]/30',
    },
    {
      title: 'Revenus Mensuels',
      value: FormatService.formatCurrency(stats?.total_revenue || 0),
      change: 15.7,
      changeType: 'increase',
      icon: DollarSign,
      color: 'text-[#F16522]',
      bgColor: 'bg-[#FFF5F0]',
      isFormatted: true,
    },
    {
      title: 'Erreurs Système',
      value: Math.floor((stats?.error_rate || 0) * 100) / 100,
      change: -45.2,
      changeType: 'decrease',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Uptime Platform',
      value: `${(stats?.uptime || 99.9).toFixed(1)}%`,
      change: 0.1,
      changeType: 'increase',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Vérifications En Attente',
      value: stats?.pending_verifications || 0,
      change: 5.8,
      changeType: 'increase',
      icon: CheckCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Nouveaux Comptes (24h)',
      value: 47,
      change: 23.1,
      changeType: 'increase',
      icon: UserPlus,
      color: 'text-[#F16522]',
      bgColor: 'bg-[#FFF5F0]',
    },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-[#6B5A4E] bg-[#FAF7F4] border-[#EFEBE9]';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Administration</h1>
                <p className="text-[#E8D4C5] mt-1">Vue d'ensemble de la plateforme</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              >
                <option value="1h" className="text-[#2C1810]">
                  Dernière heure
                </option>
                <option value="24h" className="text-[#2C1810]">
                  24 heures
                </option>
                <option value="7d" className="text-[#2C1810]">
                  7 jours
                </option>
                <option value="30d" className="text-[#2C1810]">
                  30 jours
                </option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-[#F16522] text-white rounded-xl hover:bg-[#d9571d] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((card, index) => {
            const Icon = card.icon;
            const isPositive = card.changeType === 'increase';
            const isNegative = card.changeType === 'decrease';

            return (
              <div
                key={index}
                className={`bg-white rounded-[20px] border border-[#EFEBE9] p-6 card-animate-in card-hover-premium card-stagger-${Math.min(index + 1, 6)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-[#6B5A4E]'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : isNegative ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : null}
                    <span>{Math.abs(card.change)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#6B5A4E] mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-[#2C1810]">
                    {card.isFormatted
                      ? card.value
                      : typeof card.value === 'number'
                        ? card.value.toLocaleString('fr-FR')
                        : card.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <div className="bg-white rounded-[20px] border border-[#EFEBE9] p-6 card-animate-in card-stagger-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#2C1810]">Performance Système</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F16522] rounded-full"></div>
                    <span className="text-[#6B5A4E]">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-[#6B5A4E]">Mémoire</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#2C1810] rounded-full"></div>
                    <span className="text-[#6B5A4E]">Réseau</span>
                  </div>
                </div>
              </div>
              <div className="h-64 bg-[#FAF7F4] rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-[#6B5A4E] mx-auto mb-2" />
                  <p className="text-[#6B5A4E]">Graphique de performance en temps réel</p>
                  <p className="text-sm text-[#6B5A4E]/70">
                    CPU: 23% | Mémoire: 67% | Réseau: 145 Mbps
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-[20px] border border-[#EFEBE9] p-6 card-animate-in card-hover-premium card-stagger-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#2C1810]">Activité en Temps Réel</h2>
                <button className="text-[#F16522] hover:underline text-sm font-medium">
                  Voir tout
                </button>
              </div>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 bg-[#FAF7F4] rounded-xl"
                    >
                      <div className="w-2 h-2 bg-[#F16522] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C1810]">{activity.action}</p>
                        <p className="text-xs text-[#6B5A4E]">
                          {activity.entity_type} • {activity.user_email || 'Système'}
                        </p>
                        <p className="text-xs text-[#6B5A4E]/70 mt-1">
                          {activity.created_at
                            ? FormatService.formatRelativeTime(activity.created_at)
                            : 'Récemment'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-[#6B5A4E] mx-auto mb-2" />
                    <p className="text-[#6B5A4E]">Aucune activité récente</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* System Alerts */}
            <div className="bg-white rounded-[20px] border border-[#EFEBE9] p-6 card-animate-in card-stagger-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#2C1810]">Alertes Système</h2>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {alerts.filter((a) => !a.resolved).length} actifs
                </span>
              </div>
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const AlertIcon = getAlertIcon(alert.type);
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border ${getAlertColor(alert.type)} ${alert.resolved ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs mt-1 opacity-80">{alert.message}</p>
                          <p className="text-xs mt-2 opacity-60">
                            {FormatService.formatRelativeTime(alert.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] border border-[#EFEBE9] p-6 card-animate-in card-hover-premium card-stagger-6">
              <h2 className="text-lg font-bold text-[#2C1810] mb-6">Actions Rapides</h2>
              <div className="space-y-3">
                {[
                  {
                    name: 'Gérer Utilisateurs',
                    icon: Users,
                    href: '/admin/utilisateurs',
                    color: 'bg-[#FFF5F0] text-[#F16522]',
                  },
                  {
                    name: 'Voir Propriétés',
                    icon: Home,
                    href: '/recherche',
                    color: 'bg-green-50 text-green-700',
                  },
                  {
                    name: 'Gestion CEV',
                    icon: CheckCircle,
                    href: '/admin/cev-management',
                    color: 'bg-[#E8D4C5]/30 text-[#2C1810]',
                  },
                ].map((action, index) => (
                  <Link
                    key={index}
                    to={action.href}
                    className={`flex items-center gap-3 p-3 rounded-xl ${action.color} hover:opacity-80 transition-opacity`}
                  >
                    <action.icon className="w-5 h-5" />
                    <span className="font-medium">{action.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
