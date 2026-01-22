import { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { ROLES, OWNER_ROLES, PROPERTY_MANAGER_ROLES } from '@/shared/constants/roles';
import OwnerDashboardLayout from '@/features/owner/components/OwnerDashboardLayout';

// Owner pages
const AddProperty = lazyWithRetry(() => import('@/pages/owner/AddPropertyPage'));
const OwnerDashboard = lazyWithRetry(() => import('@/pages/owner/DashboardPage'));
const CreateContract = lazyWithRetry(() => import('@/pages/owner/CreateContractPage'));
const OwnerContracts = lazyWithRetry(() => import('@/pages/owner/OwnerContractsPage'));
const OwnerApplications = lazyWithRetry(() => import('@/pages/owner/OwnerApplicationsPage'));
const MyProperties = lazyWithRetry(() => import('@/pages/owner/MyPropertiesPage'));
const OwnerProfilePage = lazyWithRetry(() => import('@/pages/owner/ProfilePage'));
const OwnerVisitsPage = lazyWithRetry(() => import('@/pages/owner/VisitsPage'));
const MyTenantsPage = lazyWithRetry(() => import('@/pages/owner/MyTenantsPage'));
// Import ContractDetail and SignLease from tenant pages (can be reused)
const ContractDetail = lazyWithRetry(() => import('@/pages/tenant/ContractDetailPage'));
const SignLease = lazyWithRetry(() => import('@/pages/tenant/SignLeasePage'));

// Application form (for owner viewing applications)
const ApplicationForm = lazyWithRetry(() => import('@/pages/tenant/ApplicationFormPage'));
// MyMandatesPage can be used by both owners and agencies
const MyMandatesPage = lazyWithRetry(() => import('@/pages/agency/MyMandatesPage'));
// MessagesPage is shared across all user types
const MessagesPage = lazyWithRetry(() => import('@/pages/messaging/MessagesPage'));

export const ownerRoutes: RouteObject[] = [
  // Routes avec sidebar
  {
    element: (
      <ProtectedRoute allowedRoles={[...OWNER_ROLES]}>
        <OwnerDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Owner dashboard
      {
        path: 'dashboard',
        element: <OwnerDashboard />,
      },

      // Add property
      {
        path: 'ajouter-propriete',
        element: (
          <ProtectedRoute allowedRoles={[...PROPERTY_MANAGER_ROLES]}>
            <AddProperty />
          </ProtectedRoute>
        ),
      },

      // Contracts
      {
        path: 'creer-contrat',
        element: (
          <ProtectedRoute allowedRoles={[...PROPERTY_MANAGER_ROLES]}>
            <CreateContract />
          </ProtectedRoute>
        ),
      },
      {
        path: 'creer-contrat/:propertyId',
        element: (
          <ProtectedRoute allowedRoles={[...PROPERTY_MANAGER_ROLES]}>
            <CreateContract />
          </ProtectedRoute>
        ),
      },
      {
        path: 'contrats',
        element: <OwnerContracts />,
      },
      {
        path: 'contrat/:id',
        element: (
          <ProtectedRoute allowedRoles={[...PROPERTY_MANAGER_ROLES]}>
            <ContractDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'signer-contrat/:id',
        element: (
          <ProtectedRoute allowedRoles={[...PROPERTY_MANAGER_ROLES]}>
            <SignLease />
          </ProtectedRoute>
        ),
      },

      // Properties
      {
        path: 'mes-biens',
        element: <MyProperties />,
      },

      // Profile
      {
        path: 'profil',
        element: <OwnerProfilePage />,
      },

      // Applications
      {
        path: 'candidatures',
        element: <OwnerApplications />,
      },

      // Mandates (shared with agencies but accessible to owners)
      {
        path: 'mes-mandats',
        element: <MyMandatesPage />,
      },

      // Messages (shared across all user types)
      {
        path: 'messages',
        element: <MessagesPage />,
      },

      // Visits
      {
        path: 'visites',
        element: <OwnerVisitsPage />,
      },

      // Tenants
      {
        path: 'mes-locataires',
        element: <MyTenantsPage />,
      },
    ],
  },
  // Routes partagées qui peuvent être accessibles par les agences aussi
  {
    path: 'candidature/:id',
    element: (
      <ProtectedRoute allowedRoles={[ROLES.OWNER, ROLES.AGENCY]}>
        <ApplicationForm />
      </ProtectedRoute>
    ),
  },
];
