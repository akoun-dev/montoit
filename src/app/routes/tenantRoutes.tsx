import { RouteObject, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import {
  OWNER_ROLES,
  AGENCY_ROLES,
  TENANT_ROLES,
  ALL_AUTHENTICATED,
} from '@/shared/constants/roles';

// Dashboard Router - redirects based on user type
const DashboardRouter = lazyWithRetry(() => import('@/shared/ui/DashboardRouter'));

// Tenant dashboard pages
const TenantDashboard = lazyWithRetry(() => import('@/pages/tenant/DashboardPage'));
const TenantCalendar = lazyWithRetry(() => import('@/pages/tenant/CalendarPage'));
const TenantMaintenance = lazyWithRetry(() => import('@/pages/tenant/MaintenancePage'));
const TenantScorePage = lazyWithRetry(() => import('@/pages/tenant/ScorePage'));
const MaintenanceRequest = lazyWithRetry(() => import('@/pages/tenant/MaintenanceRequestPage'));
const MyApplications = lazyWithRetry(() => import('@/pages/tenant/MyApplicationsPage'));
const RentalHistoryPage = lazyWithRetry(() => import('@/pages/tenant/RentalHistoryPage'));
const MyReviewsPage = lazyWithRetry(() => import('@/pages/tenant/MyReviewsPage'));

// Unified dashboard
const UnifiedDashboard = lazyWithRetry(() => import('@/pages/dashboard/UnifiedDashboardPage'));

// Profile page
const ProfilePage = lazyWithRetry(() => import('@/pages/tenant/EnhancedProfilePage'));
const OriginalProfilePage = lazyWithRetry(() => import('@/pages/tenant/ProfilePage'));
const ONECIVerificationPage = lazyWithRetry(() => import('@/pages/tenant/ONECIVerificationPage'));

// Favorites & saved searches
const Favorites = lazyWithRetry(() => import('@/pages/tenant/FavoritesPage'));
const SavedSearches = lazyWithRetry(() => import('@/pages/tenant/SavedSearchesPage'));
const Documents = lazyWithRetry(() => import('@/pages/tenant/DocumentsPage'));
const Notifications = lazyWithRetry(() => import('@/pages/tenant/NotificationsPage'));

// Application & Visit pages
const ApplicationForm = lazyWithRetry(() => import('@/pages/tenant/ApplicationFormPage'));
const ScheduleVisit = lazyWithRetry(() => import('@/pages/tenant/ScheduleVisitPage'));
const MyVisits = lazyWithRetry(() => import('@/pages/tenant/MyVisitsPage'));

// Contract pages
const ContractDetail = lazyWithRetry(() => import('@/pages/tenant/ContractDetailPage'));
const MyContracts = lazyWithRetry(() => import('@/pages/tenant/MyContractsPage'));
const SignLease = lazyWithRetry(() => import('@/pages/tenant/SignLeasePage'));

// Payment pages
const MakePayment = lazyWithRetry(() => import('@/pages/tenant/MakePaymentPage'));
const PaymentHistory = lazyWithRetry(() => import('@/pages/tenant/PaymentHistoryPage'));

// Messaging
const MessagesPage = lazyWithRetry(() => import('@/pages/messaging/MessagesPage'));

// Tenant layout with sidebar
const TenantDashboardLayout = lazyWithRetry(
  () => import('@/features/tenant/components/TenantDashboardLayout')
);
// TenantSidebarLayout is used for universal routes that need role-based layout switching
const TenantSidebarLayout = lazyWithRetry(
  () => import('@/features/tenant/components/TenantSidebarLayout')
);

export const tenantRoutes: RouteObject[] = [
  // Profile
  {
    path: 'profil',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'verification-oneci',
    element: (
      <ProtectedRoute>
        <ONECIVerificationPage />
      </ProtectedRoute>
    ),
  },
  { path: 'verification', element: <Navigate to="/locataire/profil?tab=verification" replace /> },

  // Favorites & saved searches (tenant only)
  {
    path: 'favoris',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <Favorites />
      </ProtectedRoute>
    ),
  },
  {
    path: 'documents',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <Documents />
      </ProtectedRoute>
    ),
  },
  {
    path: 'notifications',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <Notifications />
      </ProtectedRoute>
    ),
  },

  // Applications
  {
    path: 'mes-candidatures',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyApplications />
      </ProtectedRoute>
    ),
  },

  // Visits
  {
    path: 'mes-visites',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyVisits />
      </ProtectedRoute>
    ),
  },

  // Reviews
  {
    path: 'avis',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyReviewsPage />
      </ProtectedRoute>
    ),
  },

  // Contracts
  {
    path: 'mes-contrats',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyContracts />
      </ProtectedRoute>
    ),
  },

  // Payments
  {
    path: 'mes-paiements',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <PaymentHistory />
      </ProtectedRoute>
    ),
  },

  // Tenant specific routes
  {
    path: 'dashboard',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <TenantDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: 'maintenance',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <TenantMaintenance />
      </ProtectedRoute>
    ),
  },
  {
    path: 'mon-score',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <TenantScorePage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'profil/historique-locations',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <RentalHistoryPage />
      </ProtectedRoute>
    ),
  },

  // Routes that should keep the tenant sidebar visible
  {
    element: (
      <ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]}>
        <TenantSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'mon-espace', element: <UnifiedDashboard /> },
      {
        path: 'recherches-sauvegardees',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <SavedSearches />
          </ProtectedRoute>
        ),
      },
      {
        path: 'messages',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES, ...OWNER_ROLES, ...AGENCY_ROLES]}>
            <MessagesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard/calendrier',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <TenantCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'maintenance/nouvelle',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <MaintenanceRequest />
          </ProtectedRoute>
        ),
      },
      {
        path: 'visiter/:id',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <ScheduleVisit />
          </ProtectedRoute>
        ),
      },
      {
        path: 'candidature/:id',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <ApplicationForm />
          </ProtectedRoute>
        ),
      },
      {
        path: 'contrat/:id',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <ContractDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'signer-bail/:id',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <SignLease />
          </ProtectedRoute>
        ),
      },
      {
        path: 'effectuer-paiement',
        element: (
          <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
            <MakePayment />
          </ProtectedRoute>
        ),
      },
    ],
  },
];
