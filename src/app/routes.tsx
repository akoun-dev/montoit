import { RouteObject } from 'react-router-dom';
import Layout from '@/app/layout/Layout';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { AGENCY_ROLES } from '@/shared/constants/roles';

// Dashboard Router - redirects based on user_type and roles
const DashboardRouter = lazyWithRetry(() => import('@/shared/ui/DashboardRouter'));

// Import modular routes
import {
  publicRoutes,
  authRoutes,
  tenantRoutes,
  ownerRoutes,
  agencyRoutes,
  adminRoutes,
  trustAgentRoutes,
  moderatorRoutes,
} from './routes/index';

// Lazy load AgencyProfilePage for /agence/profile route
const AgencyProfilePage = lazyWithRetry(() => import('@/pages/agency/ProfilePage'));
// Lazy load MyMandatesPage for /mes-mandats route (shared between owners and agencies)
const MyMandatesPage = lazyWithRetry(() => import('@/pages/agency/MyMandatesPage'));

/**
 * Main application routes
 * Routes are organized by domain for better maintainability
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      // Public routes (home, static pages, property search)
      ...publicRoutes,

      // Authentication routes
      ...authRoutes,

      // Smart Dashboard Router - redirects based on user_type and roles (at root level)
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        ),
      },

      // Tenant routes under /locataire prefix
      {
        path: 'locataire',
        children: tenantRoutes,
      },

      // Owner routes under /proprietaire prefix
      {
        path: 'proprietaire',
        children: ownerRoutes,
      },

      // Agency routes under /agences prefix
      {
        path: 'agences',
        children: agencyRoutes,
      },

      // Alternative agency profile route
      {
        path: 'agence/profile',
        element: (
          <ProtectedRoute allowedRoles={[...AGENCY_ROLES]}>
            <AgencyProfilePage />
          </ProtectedRoute>
        ),
      },

      // Global mandates route (accessible to both owners and agencies)
      {
        path: 'mes-mandats',
        element: (
          <ProtectedRoute>
            <MyMandatesPage />
          </ProtectedRoute>
        ),
      },

      // Trust Agent routes (nested with layout)
      trustAgentRoutes,

      // Moderator routes under /moderator prefix
      {
        path: 'moderator',
        children: moderatorRoutes,
      },

      // Admin routes (nested with layout)
      adminRoutes,
    ],
  },
];
