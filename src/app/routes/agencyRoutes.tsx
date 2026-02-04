import { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { AGENCY_ROLES } from '@/shared/constants/roles';
import AgencyDashboardLayout from '@/features/agency/components/AgencyDashboardLayout';

// Agency pages
const AgencyDashboard = lazyWithRetry(() => import('@/pages/agency/DashboardPage'));
const MyMandatesPage = lazyWithRetry(() => import('@/pages/agency/MyMandatesPage'));
const AgencyMandatesPage = lazyWithRetry(() => import('@/features/agency/pages/AgencyMandatesPage'));
const MandateDetailPage = lazyWithRetry(() => import('@/components/mandates/MandateDetailPage'));
const SignMandatePage = lazyWithRetry(() => import('@/pages/agency/SignMandatePage'));
const HandwrittenSignaturePage = lazyWithRetry(() => import('@/pages/mandates/HandwrittenSignaturePage'));
const AgencyPropertiesPage = lazyWithRetry(() => import('@/pages/agency/AgencyPropertiesPage'));
const AgencyPropertyDetailPage = lazyWithRetry(() => import('@/pages/agency/AgencyPropertyDetailPage'));
const AgencyPropertyEditPage = lazyWithRetry(() => import('@/pages/agency/AgencyPropertyEditPage'));
const AgencyAddProperty = lazyWithRetry(() => import('@/pages/agency/AddPropertyPage'));
const AgencyAnalyticsPage = lazyWithRetry(() => import('@/pages/agency/AnalyticsPage'));
const AgencyCalendarPage = lazyWithRetry(() => import('@/pages/agency/CalendarPage'));
const AgencyProfilePage = lazyWithRetry(() => import('@/pages/agency/ProfilePage'));
const AgencyCandidaturesPage = lazyWithRetry(() => import('@/pages/agency/CandidaturesPage'));
const AgencyContratsPage = lazyWithRetry(() => import('@/pages/agency/ContratsPage'));
const CreateContractPage = lazyWithRetry(() => import('@/pages/owner/CreateContractPage'));
// Layout-agnostic messaging view
const MessagesView = lazyWithRetry(() => import('@/features/messaging/components/MessagesView'));
const AgencyVisitsPage = lazyWithRetry(() => import('@/pages/agency/VisitsPage'));
const AgencyPaymentsPage = lazyWithRetry(() => import('@/pages/agency/PaymentsPage'));
const AgencyDocumentsPage = lazyWithRetry(() => import('@/pages/agency/DocumentsPage'));
const AgencyRemindersPage = lazyWithRetry(() => import('@/pages/agency/RemindersPage'));
const TeamManagementPage = lazyWithRetry(() => import('@/pages/agency/TeamManagementPage'));
const PropertyAssignmentsPage = lazyWithRetry(() => import('@/features/agency/pages/PropertyAssignmentsPage'));
const CommissionsPage = lazyWithRetry(() => import('@/pages/agency/CommissionsPage'));

export const agencyRoutes: RouteObject[] = [
  {
    element: (
      <ProtectedRoute allowedRoles={[...AGENCY_ROLES]}>
        <AgencyDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Agency dashboard
      {
        path: 'dashboard',
        element: <AgencyDashboard />,
      },

      // Agency mandates
      {
        path: 'mandats',
        element: <AgencyMandatesPage />,
      },
      {
        path: 'mandats/:id',
        element: <MandateDetailPage />,
      },
      {
        path: 'signer-mandat/:id',
        element: <SignMandatePage />,
      },
      {
        path: 'mes-mandats/signer/:id',
        element: <HandwrittenSignaturePage />,
      },

      // Property management
      {
        path: 'biens',
        element: <AgencyPropertiesPage />,
      },
      {
        path: 'biens/:id',
        element: <AgencyPropertyDetailPage />,
      },
      {
        path: 'biens/:id/edit',
        element: <AgencyPropertyEditPage />,
      },
      {
        path: 'ajouter-bien',
        element: <AgencyAddProperty />,
      },

      // Profile
      {
        path: 'profil',
        element: <AgencyProfilePage />,
      },

      // Agency-specific pages
      {
        path: 'candidatures',
        element: <AgencyCandidaturesPage />,
      },
      {
        path: 'candidatures/:id',
        element: <AgencyCandidaturesPage />,
      },
      {
        path: 'contrats',
        element: <AgencyContratsPage />,
      },
      {
        path: 'contrats/:id',
        element: <AgencyContratsPage />,
      },
      {
        path: 'creer-contrat',
        element: (
          <ProtectedRoute allowedRoles={[...AGENCY_ROLES]}>
            <CreateContractPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'creer-contrat/:propertyId',
        element: (
          <ProtectedRoute allowedRoles={[...AGENCY_ROLES]}>
            <CreateContractPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'messages',
        element: <MessagesView />,
      },
      {
        path: 'visites',
        element: <AgencyVisitsPage />,
      },
      {
        path: 'analytics',
        element: <AgencyAnalyticsPage />,
      },
      {
        path: 'calendrier',
        element: <AgencyCalendarPage />,
      },

      // Payments & Charges
      {
        path: 'paiements',
        element: <AgencyPaymentsPage />,
      },

      // Documents
      {
        path: 'documents',
        element: <AgencyDocumentsPage />,
      },

      // Reminders
      {
        path: 'rappels',
        element: <AgencyRemindersPage />,
      },

      // Team & Settings
      {
        path: 'equipe',
        element: <TeamManagementPage />,
      },
      {
        path: 'attributions',
        element: <PropertyAssignmentsPage />,
      },
      {
        path: 'commissions',
        element: <CommissionsPage />,
      },
    ],
  },
];
