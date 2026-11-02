import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OtpType } from '@/lib/supabase/types'
import { profileSelect, type ProfileRow } from '@/lib/supabase/profile'
import { hashOtpCode, verifyOtpCandidate } from '@/lib/otp-hash'
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
  // SEC-007 : le code est stocké hashé (SHA-256 + pepper), selé par l'email
  // cible. Le code en clair ne vit que dans l'email envoyé à l'utilisateur.
  const { error } = await admin.from('otp_codes').insert({
    id: crypto.randomUUID(),
    email: normalizeEmail(input.email),
    code: hashOtpCode(input.code.trim(), normalizeEmail(input.email)),
    type: input.type,
    expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    user_id: input.userId,
  })

  if (error) {
    throw error
  }
}

/**
 * SEC-007 — Cherche l'OTP email actif le plus récent pour (email, type) puis
 * compare le code fourni à la valeur stockée via `verifyOtpCandidate` :
 *  - ligne hashée → comparaison via hash + pepper (timing-safe) ;
 *  - ligne legacy en clair → comparaison en clair puis re-hash immédiat de la
 *    ligne (migration douce, transparente pour l'utilisateur).
 *
 * Le filtre `.eq('code', …)` d'origine est remplacé par une comparaison
 * applicative : le code n'est plus présent en clair en base.
 */
export async function findValidEmailOtp(
  admin: SupabaseClient<Database>,
  input: {
    email: string
    code: string
    type: OtpType
  }
) {
  const normalizedEmail = normalizeEmail(input.email)
  const { data, error } = await admin
    .from('otp_codes')
    .select('id, email, code, type, is_used, expires_at, user_id, created_at')
    .eq('email', normalizedEmail)
    .eq('type', input.type)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) return null

  const verdict = verifyOtpCandidate(input.code, normalizedEmail, data.code)
  if (!verdict.matched) return null

  // Migration douce : la ligne était en clair → on la re-hashe immédiatement.
  if (verdict.needsRehash) {
    const { error: rehashError } = await admin
      .from('otp_codes')
      .update({ code: hashOtpCode(input.code.trim(), normalizedEmail) })
      .eq('id', data.id)
    if (rehashError) {
      // Non bloquant : la vérification reste valide, le re-hash pourra être
      // refait à la prochaine tentative.
      console.error('[findValidEmailOtp] re-hash of legacy OTP failed:', rehashError)
    }
  }

  return data
}
