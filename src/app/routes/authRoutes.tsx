import { RouteObject, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';

// Auth pages
const ModernAuth = lazyWithRetry(() => import('@/pages/auth/ModernAuthPage'));
const AuthCallback = lazyWithRetry(() => import('@/pages/auth/CallbackPage'));
const ForgotPassword = lazyWithRetry(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPassword = lazyWithRetry(() => import('@/pages/auth/ResetPasswordPage'));
const ProfileSelection = lazyWithRetry(() => import('@/pages/auth/ProfileSelectionPage'));
const ProfileCompletion = lazyWithRetry(() => import('@/pages/auth/ProfileCompletionPage'));
const BiometricVerification = lazyWithRetry(() => import('@/pages/auth/BiometricVerificationPage'));
const NeoFaceReturn = lazyWithRetry(() => import('@/pages/auth/NeoFaceReturnPage'));

export const authRoutes: RouteObject[] = [
  { path: 'connexion', element: <ModernAuth /> },
  { path: 'inscription', element: <ModernAuth /> },
  { path: 'login', element: <Navigate to="/connexion" replace /> },
  { path: 'auth', element: <ModernAuth /> },
  { path: 'auth/callback', element: <AuthCallback /> },
  { path: 'mot-de-passe-oublie', element: <ForgotPassword /> },
  { path: 'reinitialiser-mot-de-passe', element: <ResetPassword /> },
  {
    path: 'choix-profil',
    element: (
      <ProtectedRoute>
        <ProfileSelection />
      </ProtectedRoute>
    ),
  },
  {
    path: 'completer-profil',
    element: (
      <ProtectedRoute>
        <ProfileCompletion />
      </ProtectedRoute>
    ),
  },
  {
    path: 'verification-biometrique',
    element: (
      <ProtectedRoute>
        <BiometricVerification />
      </ProtectedRoute>
    ),
  },
  {
    path: 'neoface-return',
    element: (
      <ProtectedRoute>
        <NeoFaceReturn />
      </ProtectedRoute>
    ),
  },
];
