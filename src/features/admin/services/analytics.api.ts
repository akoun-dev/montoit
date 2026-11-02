/**
 * Analytics API pour l'administration
 * Services de récupération des données analytiques
 */

import { supabase } from '@/integrations/supabase/client';
import { requirePermission } from '@/shared/services/roleValidation.service';
import { AnalyticsData, AdminPeriod, DatePoint, UserGrowthMetrics, PropertyMetrics, TransactionMetrics, SystemMetrics, PeriodMetrics } from '@/types/admin';

/**
 * Calcule les dates de début et de fin selon la période
 */
export function getPeriodDates(period: AdminPeriod): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(startDate.getFullYear() - 10);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Récupère les données analytiques pour une période donnée
 */
export async function getAnalyticsData(period: AdminPeriod = '30d'): Promise<AnalyticsData> {
  await requirePermission('canAccessAdminPanel')();

  const { startDate, endDate } = getPeriodDates(period);

  // Calcul de la période précédente pour comparaison
  const periodDuration = new Date(endDate).getTime() - new Date(startDate).getTime();
  const prevEndDate = new Date(startDate).toISOString();
  const prevStartDate = new Date(new Date(startDate).getTime() - periodDuration).toISOString();

  const [currentData, previousData] = await Promise.all([
    getPeriodMetrics(startDate, endDate),
    getPeriodMetrics(prevStartDate, prevEndDate),
  ]);

  const [userGrowth, propertyMetrics, transactionMetrics, systemMetrics] = await Promise.all([
    getUserGrowthMetrics(startDate, endDate),
    getPropertyMetrics(startDate, endDate),
    getTransactionMetrics(startDate, endDate),
    getSystemMetrics(),
  ]);

  return {
    period,
    currentPeriod: currentData,
    previousPeriod: previousData,
    userGrowth,
    propertyMetrics,
    transactionMetrics,
    systemMetrics,
  };
}

/**
 * Récupère les métriques pour une période donnée
 */
async function getPeriodMetrics(startDate: string, endDate: string): Promise<PeriodMetrics> {
  const [usersResult, newUsersResult, propertiesResult, newPropertiesResult, transactionsResult, revenueResult] =
    await Promise.all([
      // Total users
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', endDate),
      // New users in period
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lt('created_at', endDate),
      // Total properties
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', endDate),
      // New properties in period
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lt('created_at', endDate),
      // Total transactions
      supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lt('created_at', endDate),
      // Total revenue
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lt('created_at', endDate),
    ]);

  const totalRevenue = revenueResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return {
    startDate,
    endDate,
    totalUsers: usersResult.count || 0,
    newUsers: newUsersResult.count || 0,
    activeUsers: newUsersResult.count || 0, // Simplification - à améliorer avec les logs de connexion
    totalProperties: propertiesResult.count || 0,
    newProperties: newPropertiesResult.count || 0,
    totalTransactions: transactionsResult.count || 0,
    totalRevenue,
  };
}

/**
 * Récupère les métriques de croissance des utilisateurs
 */
async function getUserGrowthMetrics(startDate: string, endDate: string): Promise<UserGrowthMetrics> {
  // Données par jour
  const { data: dailyData } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .order('created_at');

  const byDay = aggregateByDate(dailyData || [], 'day');

  // Données par type
  const [locataires, proprietaires, agences, trustAgents, admins] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('user_type', 'locataire'),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('user_type', 'proprietaire'),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('user_type', 'agence'),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('user_type', 'trust_agent'),
    supabase.from('profiles').select('id', { count: 'exact' }).in('user_type', ['admin', 'admin_ansut']),
  ]);

  const byType = {
    locataires: locataires.count || 0,
    proprietaires: proprietaires.count || 0,
    agences: agences.count || 0,
    trust_agents: trustAgents.count || 0,
    admins: admins.count || 0,
  };

  return {
    byDay,
    byWeek: aggregateByDate(dailyData || [], 'week'),
    byMonth: aggregateByDate(dailyData || [], 'month'),
    byType,
  };
}

/**
 * Récupère les métriques des propriétés
 */
async function getPropertyMetrics(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startDate: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endDate: string
): Promise<PropertyMetrics> {
  const [byStatusData, byCityData, ansutData, priceData] = await Promise.all([
    supabase.from('properties').select('status'),
    supabase.from('properties').select('city'),
    supabase.from('properties').select('ansut_verified'),
    supabase.from('properties').select('price'),
  ]);

  const byStatus = {
    available: byStatusData.data?.filter((p) => p.status === 'available').length || 0,
    rented: byStatusData.data?.filter((p) => p.status === 'rented').length || 0,
    unavailable: byStatusData.data?.filter((p) => p.status === 'unavailable').length || 0,
    pending: byStatusData.data?.filter((p) => p.status === 'pending').length || 0,
  };

  const cityMap = new Map<string, number>();
  byCityData.data?.forEach((p) => {
    cityMap.set(p.city || 'Inconnu', (cityMap.get(p.city || 'Inconnu') || 0) + 1);
  });

  const total = byCityData.data?.length || 0;
  const byCity: PropertyMetrics['byCity'] = Array.from(cityMap.entries())
    .map(([city, count]) => ({
      city,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Group by price range
  const priceRanges = [
    { label: '< 50 000 FCFA', min: 0, max: 50000 },
    { label: '50 000 - 100 000 FCFA', min: 50000, max: 100000 },
    { label: '100 000 - 200 000 FCFA', min: 100000, max: 200000 },
    { label: '200 000 - 500 000 FCFA', min: 200000, max: 500000 },
    { label: '> 500 000 FCFA', min: 500000, max: Infinity },
  ];

  const byPriceRange = priceRanges.map((range) => {
    const count =
      priceData.data?.filter((p) => p.price >= range.min && p.price < range.max).length || 0;
    return {
      range: range.label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const ansutCertified = ansutData.data?.filter((p) => p.ansut_verified === true).length || 0;
  const ansutPending = ansutData.data?.filter((p) => p.ansut_verified === false).length || 0;

  return {
    byStatus,
    byCity,
    byPriceRange,
    ansutCertified,
    ansutPending,
  };
}

/**
 * Récupère les métriques des transactions
 */
async function getTransactionMetrics(startDate: string, endDate: string): Promise<TransactionMetrics> {
  const { data: transactions } = await supabase
    .from('payments')
    .select('status, amount, created_at')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  const byStatus = {
    pending: transactions?.filter((t) => t.status === 'pending').length || 0,
    processing: transactions?.filter((t) => t.status === 'processing').length || 0,
    completed: transactions?.filter((t) => t.status === 'completed').length || 0,
    failed: transactions?.filter((t) => t.status === 'failed').length || 0,
    refunded: transactions?.filter((t) => t.status === 'refunded').length || 0,
    cancelled: transactions?.filter((t) => t.status === 'cancelled').length || 0,
  };

  const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const completedCount = byStatus.completed;
  const averageAmount = completedCount > 0 ? totalAmount / completedCount : 0;
  const completionRate = transactions?.length > 0 ? (completedCount / transactions.length) * 100 : 0;

  const byMonth = aggregateByDate(transactions || [], 'month');

  return {
    byStatus,
    byMonth,
    totalAmount,
    averageAmount,
    completionRate,
  };
}

/**
 * Récupère les métriques système
 */
async function getSystemMetrics(): Promise<SystemMetrics> {
  // Ces données proviendraient idéalement d'un service de monitoring
  // Pour l'instant, on retourne des valeurs par défaut
  return {
    uptime: 99.9,
    errorRate: 0.1,
    avgResponseTime: 150,
    activeUsers: 0, // À implémenter avec les logs de connexion
    diskUsage: 45,
    memoryUsage: 62,
  };
}

/**
 * Agrège les données par date
 */
function aggregateByDate<T extends { created_at: string | null }>(
  data: T[],
  granularity: 'day' | 'week' | 'month'
): DatePoint[] {
  const map = new Map<string, number>();

  data.forEach((item) => {
    if (!item.created_at) return;

    const date = new Date(item.created_at);
    let key: string;

    switch (granularity) {
      case 'day': {
        key = date.toISOString().split('T')[0];
        break;
      }
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      }
    }

    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value, label: formatLabel(date, granularity) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Formate un label de date
 */
function formatLabel(date: string, granularity: 'day' | 'week' | 'month'): string {
  const d = new Date(date);

  switch (granularity) {
    case 'day':
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    case 'week':
      return `Sem ${getWeekNumber(d)}`;
    case 'month':
      return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  }
}

/**
 * Retourne le numéro de semaine
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
