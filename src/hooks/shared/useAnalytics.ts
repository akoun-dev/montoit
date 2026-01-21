/**
 * Hook for fetching analytics data
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import type { AnalyticsPeriod } from '@/types/analytics.types';

export function useAnalytics(period: AnalyticsPeriod = '30d') {
  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview', period],
    queryFn: () => analyticsService.getOverviewStats(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const usersQuery = useQuery({
    queryKey: ['analytics', 'users', period],
    queryFn: () => analyticsService.getUserStats(period),
    staleTime: 5 * 60 * 1000,
  });

  const propertiesQuery = useQuery({
    queryKey: ['analytics', 'properties', period],
    queryFn: () => analyticsService.getPropertyStats(period),
    staleTime: 5 * 60 * 1000,
  });

  const transactionsQuery = useQuery({
    queryKey: ['analytics', 'transactions', period],
    queryFn: () => analyticsService.getTransactionStats(period),
    staleTime: 5 * 60 * 1000,
  });

  return {
    overview: overviewQuery.data,
    users: usersQuery.data,
    properties: propertiesQuery.data,
    transactions: transactionsQuery.data,
    isLoading:
      overviewQuery.isLoading ||
      usersQuery.isLoading ||
      propertiesQuery.isLoading ||
      transactionsQuery.isLoading,
    error:
      overviewQuery.error || usersQuery.error || propertiesQuery.error || transactionsQuery.error,
    refetch: () => {
      overviewQuery.refetch();
      usersQuery.refetch();
      propertiesQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}
