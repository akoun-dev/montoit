import { RouteObject, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import AdminLayout from '@/app/layout/AdminLayout';
import { ROLES } from '@/shared/constants/roles';

// Admin pages
const AdminDashboard = lazyWithRetry(() => import('@/pages/admin/DashboardPage'));
const AdminUsers = lazyWithRetry(() => import('@/pages/admin/UsersPage'));
const AdminUserRoles = lazyWithRetry(() => import('@/pages/admin/UserRolesPage'));
const AdminApiKeys = lazyWithRetry(() => import('@/pages/admin/ApiKeysPage'));
const AdminBusinessRules = lazyWithRetry(() => import('@/pages/admin/BusinessRulesPage'));
const AdminCEVManagement = lazyWithRetry(() => import('@/pages/admin/CEVManagementPage'));
const AdminTrustAgents = lazyWithRetry(() => import('@/pages/admin/TrustAgentsPage'));
const AdminAnalytics = lazyWithRetry(() => import('@/pages/admin/AnalyticsPage'));
const AdminProperties = lazyWithRetry(() => import('@/pages/admin/PropertiesPage'));
const AdminTransactions = lazyWithRetry(() => import('@/pages/admin/TransactionsPage'));
const AdminServiceMonitoring = lazyWithRetry(() => import('@/pages/admin/ServiceMonitoringPage'));
const AdminLogs = lazyWithRetry(() => import('@/pages/admin/LogsPage'));
const AdminServiceProviders = lazyWithRetry(() => import('@/pages/admin/ServiceProvidersPage'));
const AdminServiceConfiguration = lazyWithRetry(
  () => import('@/pages/admin/ServiceConfigurationPage')
);
const AdminDataGenerator = lazyWithRetry(() => import('@/pages/admin/DataGeneratorPage'));
const AdminFeatureFlags = lazyWithRetry(() => import('@/pages/admin/FeatureFlagsPage'));

export const adminRoutes: RouteObject = {
  path: 'admin',
  element: (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
      <AdminLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="/admin/tableau-de-bord" replace /> },
    { path: 'tableau-de-bord', element: <AdminDashboard /> },
    { path: 'utilisateurs', element: <AdminUsers /> },
    { path: 'gestion-roles', element: <AdminUserRoles /> },
    { path: 'api-keys', element: <AdminApiKeys /> },
    { path: 'regles-metier', element: <AdminBusinessRules /> },
    { path: 'cev-management', element: <AdminCEVManagement /> },
    { path: 'cev/:id', element: <AdminCEVManagement /> },
    { path: 'trust-agents', element: <AdminTrustAgents /> },
    { path: 'analytics', element: <AdminAnalytics /> },
    { path: 'properties', element: <AdminProperties /> },
    { path: 'transactions', element: <AdminTransactions /> },
    { path: 'service-monitoring', element: <AdminServiceMonitoring /> },
    { path: 'logs', element: <AdminLogs /> },
    { path: 'service-providers', element: <AdminServiceProviders /> },
    { path: 'service-configuration', element: <AdminServiceConfiguration /> },
    { path: 'test-data-generator', element: <AdminDataGenerator /> },
    { path: 'feature-flags', element: <AdminFeatureFlags /> },
  ],
};
