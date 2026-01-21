/**
 * Feature: auth
 *
 * Exports publics de la feature auth
 */

// Pages
export { default as AboutPage } from './pages/AboutPage';
export { default as CallbackPage } from './pages/CallbackPage';
export { default as ContactPage } from './pages/ContactPage';
export { default as ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { default as ModernAuthPage } from './pages/ModernAuthPage';
export { default as PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
export { default as ProfileCompletionPage } from './pages/ProfileCompletionPage';
export { default as ProfileSelectionPage } from './pages/ProfileSelectionPage';
export { default as TermsOfServicePage } from './pages/TermsOfServicePage';

// Components
export { default as AuthModal } from './components/AuthModal';

// Services
export { authApi } from './services/auth.api';

// Types
export type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  SignUpData,
  SignInData,
  OTPVerificationData,
  OTPMethod,
  UserRole,
  AuthUser,
  AuthState,
  AuthContextValue,
  PasswordResetData,
  ProfileFormData,
  UserRoles,
  RoleSwitchData,
  AuthError,
  EmailVerificationStatus,
  PhoneVerificationStatus,
  IdentityVerificationStatus,
  UserPreferences,
} from './types';
