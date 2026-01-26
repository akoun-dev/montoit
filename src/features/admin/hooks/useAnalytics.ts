/**
 * Hook useAnalytics - Hook personnalisé pour les données analytiques
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAnalyticsData, getPeriodDates } from '../services/analytics.api';
import type { AdminPeriod } from '@/types/admin';

export function useAnalytics(period: AdminPeriod = '30d') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: () => getAnalyticsData(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const prefetchPeriod = async (newPeriod: AdminPeriod) => {
    await queryClient.prefetchQuery({
      queryKey: ['admin', 'analytics', newPeriod],
      queryFn: () => getAnalyticsData(newPeriod),
    });
  };

  const getGrowthRate = (current: number, previous: number | undefined): number => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    ...query,
    getGrowthRate,
    prefetchPeriod,
    periodDates: getPeriodDates(period),
  };
}

export function useUserGrowth(period: AdminPeriod = '30d') {
  return useQuery({
    queryKey: ['admin', 'analytics', 'user-growth', period],
    queryFn: async () => {
      const data = await getAnalyticsData(period);
      return data.userGrowth;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePropertyMetrics(period: AdminPeriod = '30d') {
  return useQuery({
    queryKey: ['admin', 'analytics', 'properties', period],
    queryFn: async () => {
      const data = await getAnalyticsData(period);
      return data.propertyMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransactionMetrics(period: AdminPeriod = '30d') {
  return useQuery({
    queryKey: ['admin', 'analytics', 'transactions', period],
    queryFn: async () => {
      const data = await getAnalyticsData(period);
      return data.transactionMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}
