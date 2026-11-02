/**
 * Analytics Service - Fetches platform statistics from Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  OverviewStats,
  UserStats,
  PropertyStats,
  TransactionStats,
  ChartDataPoint,
  AnalyticsPeriod,
} from '@/types/analytics.types';

const MONTHS_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

function getDateRange(period: AnalyticsPeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { start, end };
}

function getPreviousPeriodRange(period: AnalyticsPeriod): { start: Date; end: Date } {
  const { start: currentStart, end: currentEnd } = getDateRange(period);
  const duration = currentEnd.getTime() - currentStart.getTime();

  return {
    start: new Date(currentStart.getTime() - duration),
    end: new Date(currentStart.getTime()),
  };
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getOverviewStats(period: AnalyticsPeriod = '30d'): Promise<OverviewStats> {
  const { start, end } = getDateRange(period);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(period);

  // Current period counts
  const [usersResult, propertiesResult, contractsResult, paymentsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('lease_contracts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
  ]);

  // Previous period counts
  const [prevUsersResult, prevPropertiesResult, prevContractsResult, prevPaymentsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
      supabase
        .from('lease_contracts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
    ]);

  // Total counts (all time)
  const [totalUsersResult, totalPropertiesResult, totalContractsResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('properties').select('id', { count: 'exact', head: true }),
    supabase.from('lease_contracts').select('id', { count: 'exact', head: true }),
  ]);

  const currentRevenue = (paymentsResult.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const prevRevenue = (prevPaymentsResult.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    totalUsers: totalUsersResult.count ?? 0,
    totalProperties: totalPropertiesResult.count ?? 0,
    totalContracts: totalContractsResult.count ?? 0,
    totalRevenue: currentRevenue,
    usersGrowth: calculateGrowth(usersResult.count ?? 0, prevUsersResult.count ?? 0),
    propertiesGrowth: calculateGrowth(propertiesResult.count ?? 0, prevPropertiesResult.count ?? 0),
    contractsGrowth: calculateGrowth(contractsResult.count ?? 0, prevContractsResult.count ?? 0),
    revenueGrowth: calculateGrowth(currentRevenue, prevRevenue),
  };
}

export async function getUserStats(_period: AnalyticsPeriod = '30d'): Promise<UserStats> {
  // Get users by type
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_type, is_verified, created_at');

  const byType: ChartDataPoint[] = [
    { label: 'Locataires', value: 0, color: 'hsl(var(--primary))' },
    { label: 'Propriétaires', value: 0, color: 'hsl(var(--chart-2))' },
    { label: 'Agents', value: 0, color: 'hsl(var(--chart-3))' },
  ];

  let verifiedCount = 0;
  const monthlyData: Record<string, number> = {};

  (profiles ?? []).forEach((profile) => {
    const byType0 = byType[0];
    const byType1 = byType[1];
    const byType2 = byType[2];
    if (profile.user_type === 'tenant' && byType0) byType0.value++;
    else if (profile.user_type === 'owner' && byType1) byType1.value++;
    else if (profile.user_type === 'agent' && byType2) byType2.value++;

    if (profile.is_verified) verifiedCount++;

    if (profile.created_at) {
      const date = new Date(profile.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = (monthlyData[key] ?? 0) + 1;
    }
  });

  // Get last 6 months
  const monthlyRegistrations: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = MONTHS_FR[d.getMonth()] ?? '';
    monthlyRegistrations.push({
      label: monthLabel,
      value: monthlyData[key] ?? 0,
      date: key,
    });
  }

  const totalUsers = profiles?.length ?? 0;

  return {
    byType,
    monthlyRegistrations,
    verificationRate: totalUsers > 0 ? Math.round((verifiedCount / totalUsers) * 100) : 0,
    activeUsers: totalUsers,
  };
}

export async function getPropertyStats(_period: AnalyticsPeriod = '30d'): Promise<PropertyStats> {
  const { data: properties } = await supabase
    .from('properties')
    .select('city, property_type, status, created_at');

  const cityCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  const monthlyData: Record<string, number> = {};

  (properties ?? []).forEach((prop) => {
    if (prop.city) cityCount[prop.city] = (cityCount[prop.city] ?? 0) + 1;
    if (prop.property_type)
      typeCount[prop.property_type] = (typeCount[prop.property_type] ?? 0) + 1;
    if (prop.status) statusCount[prop.status] = (statusCount[prop.status] ?? 0) + 1;

    if (prop.created_at) {
      const date = new Date(prop.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = (monthlyData[key] ?? 0) + 1;
    }
  });

  // Top 5 cities
  const byCity: ChartDataPoint[] = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const typeLabels: Record<string, string> = {
    appartement: 'Appartement',
    maison: 'Maison',
    villa: 'Villa',
    studio: 'Studio',
    duplex: 'Duplex',
    chambre: 'Chambre',
  };

  const byType: ChartDataPoint[] = Object.entries(typeCount).map(([key, value]) => ({
    label: typeLabels[key] ?? key,
    value,
  }));

  const statusLabels: Record<string, string> = {
    disponible: 'Disponible',
    loue: 'Loué',
    reserve: 'Réservé',
  };

  const byStatus: ChartDataPoint[] = Object.entries(statusCount).map(([key, value]) => ({
    label: statusLabels[key] ?? key,
    value,
  }));

  // Get last 6 months
  const monthlyListings: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = MONTHS_FR[d.getMonth()] ?? '';
    monthlyListings.push({
      label: monthLabel,
      value: monthlyData[key] ?? 0,
      date: key,
    });
  }

  const total = properties?.length ?? 0;
  const rented = statusCount['loue'] ?? 0;

  return {
    byCity,
    byType,
    byStatus,
    monthlyListings,
    occupancyRate: total > 0 ? Math.round((rented / total) * 100) : 0,
  };
}

export async function getTransactionStats(
  _period: AnalyticsPeriod = '30d'
): Promise<TransactionStats> {
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_method, status, created_at');

  const monthlyRevenue: Record<string, number> = {};
  const methodCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  let totalPending = 0;
  let totalCompleted = 0;

  (payments ?? []).forEach((payment) => {
    if (payment.created_at && payment.status === 'completed') {
      const date = new Date(payment.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + (payment.amount ?? 0);
    }

    if (payment.payment_method) {
      methodCount[payment.payment_method] = (methodCount[payment.payment_method] ?? 0) + 1;
    }

    if (payment.status) {
      statusCount[payment.status] = (statusCount[payment.status] ?? 0) + 1;
      if (payment.status === 'en_attente') totalPending += payment.amount ?? 0;
      if (payment.status === 'completed') totalCompleted += payment.amount ?? 0;
    }
  });

  // Get last 6 months revenue
  const monthlyRevenueData: ChartDataPoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = MONTHS_FR[d.getMonth()] ?? '';
    monthlyRevenueData.push({
      label: monthLabel,
      value: monthlyRevenue[key] ?? 0,
      date: key,
    });
  }

  const methodLabels: Record<string, string> = {
    mobile_money: 'Mobile Money',
    bank_transfer: 'Virement',
    cash: 'Espèces',
    card: 'Carte',
  };

  const byPaymentMethod: ChartDataPoint[] = Object.entries(methodCount).map(([key, value]) => ({
    label: methodLabels[key] ?? key,
    value,
  }));

  const statusLabels: Record<string, string> = {
    en_attente: 'En attente',
    completed: 'Complété',
    failed: 'Échoué',
    refunded: 'Remboursé',
  };

  const byStatus: ChartDataPoint[] = Object.entries(statusCount).map(([key, value]) => ({
    label: statusLabels[key] ?? key,
    value,
  }));

  return {
    monthlyRevenue: monthlyRevenueData,
    byPaymentMethod,
    byStatus,
    totalPending,
    totalCompleted,
  };
}

export const analyticsService = {
  getOverviewStats,
  getUserStats,
  getPropertyStats,
  getTransactionStats,
};
