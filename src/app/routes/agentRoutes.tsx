import { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import AgentDashboardLayout from '@/features/agent/components/AgentDashboardLayout';

// Agent pages
const AgentDashboardPage = lazyWithRetry(() => import('@/features/agent/pages/AgentDashboardPage'));
const AgentPropertiesPage = lazyWithRetry(() => import('@/features/agent/pages/AgentPropertiesPage'));

// Shared pages that agents can access
const MessagesPage = lazyWithRetry(() => import('@/pages/messaging/MessagesPage'));

export const agentRoutes: RouteObject[] = [
  {
    element: (
      <ProtectedRoute>
        <AgentDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Agent dashboard
      {
        path: 'dashboard',
        element: <AgentDashboardPage />,
      },

      // Agent properties
      {
        path: 'proprietes',
        element: <AgentPropertiesPage />,
      },

      // Messages (shared)
      {
        path: 'messages',
        element: <MessagesPage />,
      },
    ],
  },
];
