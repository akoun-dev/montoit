import type { Database } from '@/lib/supabase/types'

export const profileSelect = `
  id,
  phone,
  email,
  first_name,
  last_name,
  role,
  active_role,
  avatar_url,
  is_active,
  is_email_verified,
  is_phone_verified,
  gender,
  city,
  address,
  birth_date,
  nni,
  neoface_verified,
  neoface_verified_at,
  kyc_document_id,
  oneci_verified,
  oneci_verified_at,
  password_updated_at,
  bio,
  company_name,
  show_phone,
  show_email,
  two_factor_enabled,
  created_at,
  updated_at
`

export type UserProfileRow = Database['public']['Tables']['users']['Row']

export type ProfileRow = Omit<UserProfileRow, 'password_hash'>

export function toAuthUser(row: ProfileRow) {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    activeRole: row.active_role,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    isEmailVerified: row.is_email_verified,
    companyName: row.company_name,
    city: row.city,
    address: row.address,
    twoFactorEnabled: row.two_factor_enabled,
    passwordUpdatedAt: row.password_updated_at,
  }
}

export function toProfilePayload(row: ProfileRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    city: row.city,
    address: row.address,
    avatarUrl: row.avatar_url,
    birthDate: row.birth_date,
    nni: row.nni,
    bio: row.bio,
    companyName: row.company_name,
    showPhone: row.show_phone,
    showEmail: row.show_email,
    twoFactorEnabled: row.two_factor_enabled,
    neofaceVerified: row.neoface_verified,
    neofaceVerifiedAt: row.neoface_verified_at,
    kycDocumentId: row.kyc_document_id,
    oneciVerified: row.oneci_verified,
    oneciVerifiedAt: row.oneci_verified_at,
    isEmailVerified: row.is_email_verified,
    isPhoneVerified: row.is_phone_verified,
    role: row.role,
    activeRole: row.active_role,
    passwordUpdatedAt: row.password_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
  }
}
