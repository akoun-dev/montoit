import { RouteObject, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { ROLES } from '@/shared/constants/roles';

// Trust Agent pages
const TrustAgentLayout = lazyWithRetry(
  () => import('@/pages/trust-agent/layouts/TrustAgentLayout')
);
const TrustAgentDashboard = lazyWithRetry(() => import('@/pages/trust-agent/DashboardPage'));
const TrustAgentCalendar = lazyWithRetry(() => import('@/pages/trust-agent/CalendarPage'));
const MissionDetail = lazyWithRetry(() => import('@/pages/trust-agent/MissionDetailPage'));
const PhotoVerification = lazyWithRetry(() => import('@/pages/trust-agent/PhotoVerificationPage'));
const DocumentValidation = lazyWithRetry(
  () => import('@/pages/trust-agent/DocumentValidationPage')
);
const EtatDesLieux = lazyWithRetry(() => import('@/pages/trust-agent/EtatDesLieuxPage'));
const MissionsList = lazyWithRetry(() => import('@/pages/trust-agent/MissionsListPage'));
const UserCertification = lazyWithRetry(() => import('@/pages/trust-agent/UserCertificationPage'));
const PropertyCertification = lazyWithRetry(
  () => import('@/pages/trust-agent/PropertyCertificationPage')
);
const PropertyManagement = lazyWithRetry(
  () => import('@/pages/trust-agent/PropertyManagementPage')
);
const CertificationHistory = lazyWithRetry(
  () => import('@/pages/trust-agent/CertificationHistoryPage')
);
const CertifiedUsersList = lazyWithRetry(
  () => import('@/pages/trust-agent/CertifiedUsersListPage')
);
const UserCertificationDetails = lazyWithRetry(
  () => import('@/pages/trust-agent/UserCertificationDetailsPage')
);

// Dossier Validation pages
const TenantDossierValidation = lazyWithRetry(
  () => import('@/pages/trust-agent/TenantDossierValidationPage')
);
const OwnerDossierValidation = lazyWithRetry(
  () => import('@/pages/trust-agent/OwnerDossierValidationPage')
);
const AgencyDossierValidation = lazyWithRetry(
  () => import('@/pages/trust-agent/AgencyDossierValidationPage')
);
const DossiersList = lazyWithRetry(
  () => import('@/pages/trust-agent/DossiersListPage')
);

// CEV Mission page
const CEVMission = lazyWithRetry(
  () => import('@/pages/trust-agent/CEVMissionPage')
);

// Disputes pages
const DisputesList = lazyWithRetry(() => import('@/pages/trust-agent/DisputesListPage'));
const DisputeDetail = lazyWithRetry(() => import('@/pages/trust-agent/DisputeDetailPage'));

// Reports page
const Reports = lazyWithRetry(() => import('@/pages/trust-agent/ReportsPage'));

// Notifications page
const Notifications = lazyWithRetry(() => import('@/pages/trust-agent/NotificationsPage'));

// Stats page
const Stats = lazyWithRetry(() => import('@/pages/trust-agent/StatsPage'));

// Agent Management page
const AgentManagement = lazyWithRetry(() => import('@/pages/trust-agent/AgentManagementPage'));

export const trustAgentRoutes: RouteObject = {
  path: 'trust-agent',
  element: (
    <ProtectedRoute allowedRoles={[ROLES.TRUST_AGENT]}>
      <TrustAgentLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="/trust-agent/dashboard" replace /> },
    { path: 'dashboard', element: <TrustAgentDashboard /> },
    { path: 'calendar', element: <TrustAgentCalendar /> },
    { path: 'missions', element: <MissionsList /> },
    { path: 'mission/:id', element: <MissionDetail /> },
    { path: 'photos/:id', element: <PhotoVerification /> },
    { path: 'documents/:id', element: <DocumentValidation /> },
    { path: 'etat-des-lieux/:id', element: <EtatDesLieux /> },
    { path: 'certifications/users', element: <CertifiedUsersList /> },
    { path: 'certifications/users/certify', element: <UserCertification /> },
    { path: 'certification/:id', element: <UserCertificationDetails /> },
    { path: 'certifications/properties', element: <PropertyCertification /> },
    { path: 'properties', element: <PropertyManagement /> },
    { path: 'history', element: <CertificationHistory /> },

    // Dossier Validation routes
    { path: 'dossiers', element: <DossiersList /> },
    { path: 'dossiers/tenants/:id', element: <TenantDossierValidation /> },
    { path: 'dossiers/owners/:id', element: <OwnerDossierValidation /> },
    { path: 'dossiers/agencies/:id', element: <AgencyDossierValidation /> },

    // CEV Mission route
    { path: 'cev/:id', element: <CEVMission /> },

    // Disputes routes
    { path: 'disputes', element: <DisputesList /> },
    { path: 'disputes/:id', element: <DisputeDetail /> },

    // Reports route
    { path: 'reports', element: <Reports /> },

    // Notifications route
    { path: 'notifications', element: <Notifications /> },

    // Stats route
    { path: 'stats', element: <Stats /> },

    // Agent Management route (admin only)
    { path: 'agents', element: <AgentManagement /> },
  ],
};
