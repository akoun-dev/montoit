import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OtpType } from '@/lib/supabase/types'
import { profileSelect, type ProfileRow } from '@/lib/supabase/profile'
import crypto from 'crypto'

export const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)
export const SUPABASE_PASSWORD_PLACEHOLDER = '__managed_by_supabase_auth__'

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export async function getUserProfileByEmail(
  admin: SupabaseClient<Database>,
  email: string
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from('users')
    .select(profileSelect)
    .eq('email', normalizeEmail(email))
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getUserProfileById(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from('users')
    .select(profileSelect)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function invalidateEmailOtps(
  admin: SupabaseClient<Database>,
  email: string,
  otpType: OtpType
) {
  const { error } = await admin
    .from('otp_codes')
    .update({ is_used: true })
    .eq('email', normalizeEmail(email))
    .eq('type', otpType)
    .eq('is_used', false)

  if (error) {
    throw error
  }
}

export async function createEmailOtp(
  admin: SupabaseClient<Database>,
  input: {
    email: string
    code: string
    type: OtpType
    userId: string
  }
) {
  const { error } = await admin.from('otp_codes').insert({
    id: crypto.randomUUID(),
    email: normalizeEmail(input.email),
    code: input.code,
    type: input.type,
    expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    user_id: input.userId,
  })

  if (error) {
    throw error
  }
}

export async function findValidEmailOtp(
  admin: SupabaseClient<Database>,
  input: {
    email: string
    code: string
    type: OtpType
  }
) {
  const { data, error } = await admin
    .from('otp_codes')
    .select('id, email, code, type, is_used, expires_at, user_id, created_at')
    .eq('email', normalizeEmail(input.email))
    .eq('code', input.code.trim())
    .eq('type', input.type)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
