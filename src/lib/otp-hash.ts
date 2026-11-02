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

/**
 * SEC-007 — Indique si une valeur stockée est bien un hash SHA-256 hexadécimal
 * (64 caractères) et non un OTP en clair hérité d'avant la migration.
 */
export function isHashedOtp(stored: string | null | undefined): boolean {
  return !!stored && /^[0-9a-f]{64}$/.test(stored)
}

function timingSafeStringEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ab.length !== bb.length) return false
    return crypto.timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

export interface OtpCandidateVerifyResult {
  /** Le code fourni correspond à la valeur stockée. */
  matched: boolean
  /**
   * La valeur stockée était un OTP en clair (migration douce) et la
   * vérification a réussi : l'appelant DOIT ré-écrire la valeur en hash
   * (`hashOtpCode(code, identifier)`) pour achever la migration.
   */
  needsRehash: boolean
}

/**
 * SEC-007 — Vérifie un code OTP contre la valeur stockée, avec migration douce :
 *  - valeur stockée hashée (64 hex) → comparaison via hash + pepper (timing-safe) ;
 *  - valeur stockée en clair (lignes créées avant la branchement du hash) →
 *    comparaison en clair (timing-safe) ; en cas de succès `needsRehash = true`
 *    afin que l'appelant re-hashe la ligne immédiatement.
 *
 * @param code Code OTP fourni par l'utilisateur.
 * @param identifier Sel de hash : téléphone, email, ou `<leaseId>:owner|tenant`.
 * @param stored Valeur lue en base (colonne `code`, `owner_sign_otp`, …).
 */
export function verifyOtpCandidate(
  code: string,
  identifier: string,
  stored: string | null | undefined
): OtpCandidateVerifyResult {
  if (!stored) return { matched: false, needsRehash: false }

  const trimmed = code.trim()

  if (isHashedOtp(stored)) {
    return { matched: verifyOtpCode(trimmed, identifier, stored), needsRehash: false }
  }

  // Ligne legacy en clair : comparaison directe, puis re-hash par l'appelant.
  const matched = timingSafeStringEqual(trimmed, stored)
  return { matched, needsRehash: matched }
}
