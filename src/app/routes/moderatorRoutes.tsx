import { RouteObject, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import AdminLayout from '@/app/layout/AdminLayout';
import { ROLES } from '@/shared/constants/roles';

// Moderator pages
const ModeratorDashboard = lazyWithRetry(() => import('@/pages/moderator/ModeratorDashboardPage'));
const AdminReportsManagement = lazyWithRetry(() => import('@/pages/admin/ReportsManagementPage'));
const AdminReviewModeration = lazyWithRetry(() => import('@/pages/admin/ReviewModerationPage'));

export const moderatorRoutes: RouteObject = {
  path: 'moderator',
  element: (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MODERATOR, ROLES.TRUST_AGENT]}>
      <AdminLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="/moderator/tableau-de-bord" replace /> },
    { path: 'tableau-de-bord', element: <ModeratorDashboard /> },
    { path: 'gestion-signalements', element: <AdminReportsManagement /> },
    { path: 'moderation-avis', element: <AdminReviewModeration /> },
  ],
};
