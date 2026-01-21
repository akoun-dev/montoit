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
  ],
};
