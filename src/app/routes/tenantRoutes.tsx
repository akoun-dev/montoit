import React from "react";
import { RouteObject, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { TENANT_ROLES } from '@/shared/constants/roles';

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

// Favorites & saved searches
const Favorites = lazyWithRetry(() => import('@/pages/tenant/FavoritesPage'));
const SavedSearches = lazyWithRetry(() => import('@/pages/tenant/SavedSearchesPage'));
const Documents = lazyWithRetry(() => import('@/pages/tenant/DocumentsPage'));
const Notifications = lazyWithRetry(() => import('@/pages/tenant/NotificationsPage'));
const SupportTickets = lazyWithRetry(() => import('@/pages/tenant/SupportTicketsPage'));

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

// Verification pages
const ONECIVerification = lazyWithRetry(() => import('@/pages/tenant/ONECIVerificationPage'));

// Layout-agnostic messaging view
const MessagesView = lazyWithRetry(() => import('@/features/messaging/components/MessagesView'));

// Settings pages
const TenantSettingsMenuPage = lazyWithRetry(() => import('@/pages/tenant/SettingsMenuPage'));
const TenantNotificationPreferencesPage = lazyWithRetry(() => import('@/pages/tenant/NotificationPreferencesPage'));
const TenantSecuritySettingsPage = lazyWithRetry(() => import('@/pages/tenant/SecuritySettingsPage'));
const TenantSessionsPage = lazyWithRetry(() => import('@/pages/tenant/SessionsPage'));

// TenantSidebarLayout is used for universal routes that need role-based layout switching
const TenantSidebarLayout = lazyWithRetry(
  () => import('@/features/tenant/components/TenantSidebarLayout')
);

export const tenantRoutes: RouteObject[] = [
  { path: 'verification', element: <Navigate to="/locataire/profil?tab=verification" replace /> },

  // Dashboard - has its own layout (TenantDashboardLayout)
  {
    path: 'dashboard',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <TenantDashboard />
      </ProtectedRoute>
    ),
  },

  // Routes with TenantSidebarLayout (for pages without TenantDashboardLayout)
  {
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <TenantSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      // Profile & Notifications - simple pages without internal layout
      { path: 'profil', element: <ProfilePage /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'support/tickets', element: <SupportTickets /> },

      // Saved searches
      { path: 'recherches-sauvegardees', element: <SavedSearches /> },

      // Payments
      { path: 'mes-paiements', element: <PaymentHistory /> },

      // Other tenant pages
      { path: 'maintenance', element: <TenantMaintenance /> },
      { path: 'mon-score', element: <TenantScorePage /> },
      { path: 'profil/historique-locations', element: <RentalHistoryPage /> },

      // Unified dashboard
      { path: 'mon-espace', element: <UnifiedDashboard /> },

      // Calendar
      { path: 'dashboard/calendrier', element: <TenantCalendar /> },

      // Maintenance request
      { path: 'maintenance/nouvelle', element: <MaintenanceRequest /> },

      // Visit & application forms
      { path: 'visiter/:id', element: <ScheduleVisit /> },
      { path: 'candidature/:id', element: <ApplicationForm /> },

      // Contract detail & signing
      { path: 'contrat/:id', element: <ContractDetail /> },
      { path: 'signer-bail/:id', element: <SignLease /> },

      // Messages - tenant-specific, wrapped in TenantSidebarLayout
      { path: 'messages', element: <MessagesView /> },

      // Settings
      { path: 'parametres', element: <TenantSettingsMenuPage /> },
      { path: 'parametres/notifications', element: <TenantNotificationPreferencesPage /> },
      { path: 'parametres/securite', element: <TenantSecuritySettingsPage /> },
      { path: 'parametres/sessions', element: <TenantSessionsPage /> },
    ],
  },

  // Payments - has own layout (TenantDashboardLayout)
  {
    path: 'effectuer-paiement',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MakePayment />
      </ProtectedRoute>
    ),
  },

  // Pages with TenantDashboardLayout (they have their own layout with sidebar)
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
    path: 'mes-candidatures',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyApplications />
      </ProtectedRoute>
    ),
  },
  {
    path: 'mes-visites',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyVisits />
      </ProtectedRoute>
    ),
  },
  {
    path: 'avis',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyReviewsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'mes-contrats',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <MyContracts />
      </ProtectedRoute>
    ),
  },
  {
    path: 'verification-oneci',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES]}>
        <ONECIVerification />
      </ProtectedRoute>
    ),
  },
];
