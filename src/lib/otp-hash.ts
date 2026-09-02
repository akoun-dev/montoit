import 'server-only'
import crypto from 'crypto'

/**
 * OTP hashing helpers.
 *
 * OTP codes are never stored in clear text in the `otp_codes` table. Instead we
 * store a salted SHA-256 hash, so a database read alone cannot be used to
 * bypass 2FA / signature OTP verification.
 *
 * The salt mixes the OTP code, the target identifier (phone or email) and a
 * process-level pepper (`OTP_HASH_PEPPER`, falling back to the Supabase
 * service-role key) so that identical codes for different targets — and the
 * same code across deployments — produce different hashes.
 */

function getPepper(): string {
  const pepper = process.env.OTP_HASH_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!pepper) {
    throw new Error('Missing OTP_HASH_PEPPER (or SUPABASE_SERVICE_ROLE_KEY fallback)')
  }
  return pepper
}

/**
 * Hash an OTP code for a given target identifier (phone or email).
 * The identifier is part of the salt so the same code cannot be replayed
 * against a different target.
 */
export function hashOtpCode(code: string, identifier: string): string {
  const pepper = getPepper()
  const salted = `${code}:${identifier}:${pepper}`
  return crypto.createHash('sha256').update(salted).digest('hex')
}

/**
 * Verify an OTP code against a stored hash using a timing-safe comparison.
 */
export function verifyOtpCode(code: string, identifier: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false
  const candidate = hashOtpCode(code, identifier)
  try {
    const a = Buffer.from(candidate)
    const b = Buffer.from(storedHash)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
