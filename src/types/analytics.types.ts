/**
 * Types for Analytics Dashboard
 */

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  color?: string;
}

export interface OverviewStats {
  totalUsers: number;
  totalProperties: number;
  totalContracts: number;
  totalRevenue: number;
  usersGrowth: number;
  propertiesGrowth: number;
  contractsGrowth: number;
  revenueGrowth: number;
}

export interface UserStats {
  byType: ChartDataPoint[];
  monthlyRegistrations: ChartDataPoint[];
  verificationRate: number;
  activeUsers: number;
}

export interface PropertyStats {
  byCity: ChartDataPoint[];
  byType: ChartDataPoint[];
  byStatus: ChartDataPoint[];
  monthlyListings: ChartDataPoint[];
  occupancyRate: number;
}

export interface TransactionStats {
  monthlyRevenue: ChartDataPoint[];
  byPaymentMethod: ChartDataPoint[];
  byStatus: ChartDataPoint[];
  totalPending: number;
  totalCompleted: number;
}

export interface AnalyticsData {
  overview: OverviewStats;
  users: UserStats;
  properties: PropertyStats;
  transactions: TransactionStats;
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y';
