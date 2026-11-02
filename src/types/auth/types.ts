/**
 * Types TypeScript pour la feature auth
 */

import type { Database } from '@/shared/lib/database.types';
import type { User, Session } from '@supabase/supabase-js';

// Types de base depuis la base de données
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Types d'authentification
export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface OTPVerificationData {
  email: string;
  otp: string;
  method?: OTPMethod;
}

export type OTPMethod = 'email' | 'sms' | 'whatsapp';

export type UserRole =
  | 'tenant' // Locataire
  | 'owner' // Propriétaire
  | 'admin' // Administrateur
  | 'trust_agent' // Agent de confiance
  | 'agency'; // Agence

// Types étendus pour l'application
export interface AuthUser extends User {
  profile?: Profile;
}

export interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  sendOTP: (email: string, method?: OTPMethod) => Promise<void>;
  verifyOTP: (data: OTPVerificationData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface PasswordResetData {
  email: string;
  token?: string;
  new_password?: string;
}

export interface ProfileFormData {
  full_name: string;
  phone: string;
  avatar_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  date_of_birth?: string;
}

export interface UserRoles {
  primary: UserRole;
  additional: UserRole[];
  active: UserRole;
}

export interface RoleSwitchData {
  user_id: string;
  from_role: UserRole;
  to_role: UserRole;
  timestamp: string;
}

export interface AuthError {
  code: string;
  message: string;
  status?: number;
}

export interface EmailVerificationStatus {
  verified: boolean;
  sent_at?: string;
  verified_at?: string;
}

export interface PhoneVerificationStatus {
  verified: boolean;
  sent_at?: string;
  verified_at?: string;
  method?: OTPMethod;
}

export interface IdentityVerificationStatus {
  verified: boolean;
  oneci_verified: boolean;
  face_verified: boolean;
  verified_at?: string;
}

export interface UserPreferences {
  language: 'fr' | 'en';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}
