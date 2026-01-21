import { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { ROLES } from '@/shared/constants/roles';

// Lazy load moderator pages
const ModeratorDashboard = lazyWithRetry(() => import('@/pages/moderator/DashboardPage'));
const ContentModeration = lazyWithRetry(() => import('@/pages/moderator/ContentModerationPage'));
const UserReports = lazyWithRetry(() => import('@/pages/moderator/UserReportsPage'));
const ReviewQueue = lazyWithRetry(() => import('@/pages/moderator/ReviewQueuePage'));
const ModerationHistory = lazyWithRetry(() => import('@/pages/moderator/ModerationHistoryPage'));
const ModeratorSettings = lazyWithRetry(() => import('@/pages/moderator/SettingsPage'));

/**
 * Moderator routes - Content moderation and user management
 * Accessible only to users with moderator role
 */
export const moderatorRoutes: RouteObject[] = [
  {
    path: 'moderator',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.MODERATOR]}>
        <ModeratorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: 'moderator/content',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.MODERATOR]}>
        <ContentModeration />
      </ProtectedRoute>
    ),
  },
  {
    path: 'moderator/reports',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.MODERATOR]}>
        <UserReports />
      </ProtectedRoute>
    ),
  },
  {
    path: 'moderator/queue',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.MODERATOR]}>
        <ReviewQueue />
      </ProtectedRoute>
    ),
  },
  {
    path: 'moderator/history',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.MODERATOR]}>
        <ModerationHistory />
      </ProtectedRoute>
    ),
  },
  {
    path: 'moderator/settings',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.MODERATOR]}>
        <ModeratorSettings />
      </ProtectedRoute>
    ),
  },
];
