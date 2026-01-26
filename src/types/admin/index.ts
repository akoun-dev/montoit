/**
 * Types pour l'interface d'administration MonToit
 * Ce fichier contient toutes les interfaces TypeScript pour les pages admin
 */

import { Json } from '@/integrations/supabase/types';

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type AdminPeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

export type AdminStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export type UserRole =
  | 'admin'
  | 'admin_ansut'
  | 'moderator'
  | 'trust_agent'
  | 'user'
  | 'locataire'
  | 'proprietaire'
  | 'agence'
  | 'owner'
  | 'agent'
  | 'tenant';

export type UserType = 'locataire' | 'proprietaire' | 'agence' | 'admin' | 'admin_ansut' | 'trust_agent' | 'moderator';

export type VerificationStatus = 'not_started' | 'pending' | 'in_review' | 'verified' | 'rejected';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export type PropertyStatus = 'available' | 'rented' | 'unavailable' | 'pending';

export type CEVMissionStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type ServiceStatusType = 'operational' | 'degraded' | 'down' | 'unknown';

// =============================================================================
// ANALYTICS & STATISTIQUES
// =============================================================================

export interface AdminStats {
  total_users: number;
  total_properties: number;
  total_contracts: number;
  active_listings: number;
  pending_applications: number;
  verification_requests: number;
}

export interface PlatformStats {
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

export interface AnalyticsData {
  period: AdminPeriod;
  currentPeriod: PeriodMetrics;
  previousPeriod?: PeriodMetrics;
  userGrowth: UserGrowthMetrics;
  propertyMetrics: PropertyMetrics;
  transactionMetrics: TransactionMetrics;
  systemMetrics: SystemMetrics;
}

export interface PeriodMetrics {
  startDate: string;
  endDate: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalProperties: number;
  newProperties: number;
  totalTransactions: number;
  totalRevenue: number;
}

export interface UserGrowthMetrics {
  byDay: DatePoint[];
  byWeek: DatePoint[];
  byMonth: DatePoint[];
  byType: UserTypeBreakdown;
}

export interface DatePoint {
  date: string;
  value: number;
  label?: string;
}

export interface UserTypeBreakdown {
  locataires: number;
  proprietaires: number;
  agences: number;
  trust_agents: number;
  admins: number;
}

export interface PropertyMetrics {
  byStatus: StatusBreakdown;
  byCity: CityBreakdown[];
  byPriceRange: PriceRangeBreakdown[];
  ansutCertified: number;
  ansutPending: number;
}

export interface StatusBreakdown {
  available: number;
  rented: number;
  unavailable: number;
  pending: number;
}

export interface CityBreakdown {
  city: string;
  count: number;
  percentage: number;
}

export interface PriceRangeBreakdown {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface TransactionMetrics {
  byStatus: TransactionStatusBreakdown;
  byMonth: DatePoint[];
  totalAmount: number;
  averageAmount: number;
  completionRate: number;
}

export interface TransactionStatusBreakdown {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  refunded: number;
  cancelled: number;
}

export interface SystemMetrics {
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  diskUsage: number;
  memoryUsage: number;
}

// =============================================================================
// UTILISATEURS & RÔLES
// =============================================================================

export interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  user_type: UserType;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  roles: RoleAssignment[];
  status: AdminStatus;
  verification_status: VerificationStatus;
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role: UserRole;
  assigned_at: string | null;
  assigned_by: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  condition: Json | null;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface UserRoleHistory {
  id: string;
  user_id: string;
  old_role: UserRole | null;
  new_role: UserRole;
  changed_by: string | null;
  changed_at: string | null;
  reason: string | null;
}

// =============================================================================
// FILTRES & PAGINATION
// =============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserFilters {
  user_type?: UserType;
  status?: AdminStatus;
  verification_status?: VerificationStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface PropertyFilters {
  status?: PropertyStatus;
  city?: string;
  price_min?: number;
  price_max?: number;
  ansut_verified?: boolean;
  search?: string;
  owner_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface TransactionFilters {
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  lease_id?: string;
  search?: string;
}

export interface LogFilters {
  level?: LogLevel;
  action?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
  entity_type?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// PROPRIÉTÉS
// =============================================================================

export interface AdminProperty {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  price: number;
  surface_area: number;
  rooms: number;
  furnished: boolean;
  available_from: string | null;
  status: PropertyStatus;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  is_active: boolean;
  ansut_verified: boolean;
  ansut_certificate_url: string | null;
  views_count: number;
  contacts_count: number;
  created_at: string | null;
  updated_at: string | null;
  images: string[];
  amenities: string[];
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

export interface TransactionWithDetails {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  owner_id: string | null;
  owner_name: string | null;
  property_id: string | null;
  property_title: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  failure_reason: string | null;
  metadata: Json | null;
}

// =============================================================================
// MISSIONS CEV (Contrôle État des Lieux)
// =============================================================================

export interface CEVMissionWithDetails {
  id: string;
  property_id: string;
  property_title: string | null;
  property_address: string | null;
  agent_id: string;
  agent_name: string | null;
  agent_email: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  type: 'entry' | 'exit' | 'periodic';
  status: CEVMissionStatus;
  scheduled_date: string | null;
  completed_date: string | null;
  report_id: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CEVReport {
  id: string;
  mission_id: string;
  agent_id: string;
  property_id: string;
  photos: string[];
  findings: Json;
  overall_condition: string;
  recommendations: string | null;
  created_at: string | null;
}

// =============================================================================
// MONITORING & LOGS
// =============================================================================

export interface ServiceStatus {
  name: string;
  displayName: string;
  status: ServiceStatusType;
  lastCheck: string;
  responseTime: number | null;
  uptime: number;
  errorRate: number;
  description: string | null;
  documentationUrl: string | null;
}

export interface LogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  details: Json | null;
  created_at: string | null;
  level: LogLevel;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  service?: string;
}

export interface PerformanceMetric {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
}

// =============================================================================
// RÈGLES MÉTIER
// =============================================================================

export interface BusinessRule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  value: Json;
  is_active: boolean;
  validation_regex?: string;
  min_value?: number;
  max_value?: number;
  updated_at: string | null;
  updated_by: string | null;
  impact_description: string | null;
}

export interface RuleCategory {
  id: string;
  name: string;
  description: string | null;
  order: number;
}

// =============================================================================
// SERVICES & CONFIGURATION
// =============================================================================

export interface ServiceProvider {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  is_configured: boolean;
  last_check: string | null;
  status: ServiceStatusType;
  configuration_count: number;
}

export interface ServiceConfiguration {
  id: string;
  service_id: string;
  config_key: string;
  config_value: Json;
  is_encrypted: boolean;
  is_required: boolean;
  validation_regex?: string;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface APIKey {
  id: string;
  name: string;
  service: string;
  key_preview: string; // Only show first/last few characters
  is_active: boolean;
  created_at: string | null;
  expires_at: string | null;
  last_used: string | null;
  usage_count: number;
  quota_limit: number | null;
  created_by: string | null;
}

// =============================================================================
// TRUST AGENTS
// =============================================================================

export interface TrustAgentProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  certifications: string[];
  specializations: string[];
  is_active: boolean;
  verification_status: VerificationStatus;
  assigned_missions: number;
  completed_missions: number;
  average_rating: number | null;
  created_at: string | null;
}

export interface TrustAgentStats {
  agent_id: string;
  total_missions: number;
  completed_missions: number;
  pending_missions: number;
  cancelled_missions: number;
  average_completion_time: number; // in hours
  average_rating: number;
  total_earnings: number;
  current_month_earnings: number;
}

// =============================================================================
// EXPORT
// =============================================================================

export type ExportFormat = 'csv' | 'pdf' | 'excel';

export interface ExportParams {
  format: ExportFormat;
  data: any[];
  filename: string;
  columns?: string[];
  includeHeaders?: boolean;
}

// =============================================================================
// FORMULAIRES & MODALES
// =============================================================================

export interface UserFormData {
  email: string;
  full_name: string;
  user_type: UserType;
  phone?: string;
  is_verified?: boolean;
}

export interface RoleFormData {
  user_id: string;
  role: UserRole;
  expires_at?: string;
  reason?: string;
}

export interface PropertyFormData {
  title: string;
  description?: string;
  property_type: string;
  address: string;
  city: string;
  postal_code: string;
  price: number;
  surface_area: number;
  rooms: number;
  furnished: boolean;
  available_from?: string;
  status: PropertyStatus;
}

export interface RuleFormData {
  key: string;
  name: string;
  description?: string;
  category: string;
  value: Json;
  is_active?: boolean;
}

// =============================================================================
// ACTIONS ADMIN
// =============================================================================

export interface AdminAction {
  type: 'verify' | 'suspend' | 'reactivate' | 'delete' | 'change_role' | 'assign_mission';
  targetId: string;
  targetType: 'user' | 'property' | 'transaction' | 'mission';
  reason?: string;
  metadata?: Json;
}

export interface BulkAction {
  action: AdminAction['type'];
  targetIds: string[];
  targetType: AdminAction['targetType'];
  reason?: string;
}

// =============================================================================
// TABLEAUX DE BORD
// =============================================================================

export interface DashboardWidget {
  id: string;
  type: 'stat' | 'chart' | 'table' | 'list' | 'alert';
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  config: Json;
  refreshInterval?: number; // in seconds
}

export interface DashboardConfig {
  id: string;
  name: string;
  user_id: string;
  widgets: DashboardWidget[];
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// =============================================================================
// UTILITAIRES
// =============================================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface ColumnConfig {
  key: string;
  title: string;
  dataIndex?: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  key: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in';
  value: any;
}
