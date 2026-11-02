import 'server-only'
import crypto from 'crypto'

/**
 * TC-002 — Tokens d'accès éphémères aux missions (spec TC-001, Option C).
 *
 * Les agents de terrain du Tiers de Confiance n'ont pas de compte : chaque
 * mission porte un lien magique `/m/{token}` envoyé par SMS/email. Le token
 * n'est JAMAIS stocké en clair dans `mission_access_tokens` : seule une
 * empreinte SHA-256 salée par un pepper process-level est persistée
 * (même discipline que `src/lib/otp-hash.ts` — DOC-002 / SEC-005).
 *
 * FAIL-CLOSED : sans pepper disponible, toute génération / vérification
 * lève une exception (aucun token produit, aucune donnée exposée).
 */

/** Entropie du token : 32 octets aléatoires (256 bits, >= 128 bits exigés). */
export const MISSION_TOKEN_BYTES = 32

/** TTL par défaut d'un lien de mission (spec TC-001 §5.3 : 72 h). */
export const MISSION_TOKEN_TTL_HOURS = 72

/**
 * Pepper de hash des tokens de mission.
 * Var d'env dédiée `MISSION_TOKEN_PEPPER` ; repli sur `OTP_HASH_PEPPER`
 * (pepper déjà provisionné pour les OTP — incident 5-INCIDENT : la valeur
 * est générée côté exploitation, JAMAIS de valeur par défaut dans le code).
 */
function getPepper(): string {
  const pepper =
    process.env.MISSION_TOKEN_PEPPER || process.env.OTP_HASH_PEPPER
  if (!pepper) {
    throw new Error(
      'Missing MISSION_TOKEN_PEPPER (or OTP_HASH_PEPPER fallback) — génération/vérification de token de mission refusée (fail-closed)'
    )
  }
  return pepper
}

/**
 * Empreinte SHA-256 (hex) d'un token de mission : token + pepper.
 * Le pepper est le seul sel : le token lui-même est déjà à haute entropie
 * (256 bits), une table de correspondance est donc inexploitable.
 */
export function hashMissionToken(token: string): string {
  const pepper = getPepper()
  return crypto
    .createHash('sha256')
    .update(`${token}:${pepper}`)
    .digest('hex')
}

export interface GeneratedMissionToken {
  /** Token CLAIR — à retourner au TC UNE SEULE fois (jamais persisté). */
  token: string
  /** Empreinte à stocker dans mission_access_tokens.token_hash. */
  tokenHash: string
  /** Date d'expiration correspondant au TTL appliqué. */
  expiresAt: Date
}

/**
 * Génère un token de mission : 32 octets aléatoires encodés base64url
 * (43 caractères URL-safe), son hash et sa date d'expiration.
 *
 * @param ttlHours Durée de vie en heures (défaut 72 h — borné côté route).
 */
export function generateMissionToken(
  ttlHours: number = MISSION_TOKEN_TTL_HOURS
): GeneratedMissionToken {
  const token = crypto.randomBytes(MISSION_TOKEN_BYTES).toString('base64url')
  return {
    token,
    tokenHash: hashMissionToken(token),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  }
}

/** Ligne minimale lue en base pour vérifier un token. */
export interface MissionTokenRecord {
  token_hash: string
  expires_at: string
  revoked_at: string | null
  submitted_at?: string | null
}

export type MissionTokenVerifyReason =
  | 'VALID'
  | 'NOT_FOUND' // token inconnu OU hash sans correspondance (ne pas distinguer)
  | 'EXPIRED'
  | 'REVOKED'

export interface MissionTokenVerifyResult {
  valid: boolean
  reason: MissionTokenVerifyReason
}

/**
 * Vérifie un token de mission : hash + comparaison + TTL + révocation.
 *
 * `record` est la ligne lue par token_hash (SELECT serveur, service_role).
 * Un hash sans correspondance renvoie NOT_FOUND — même raison que "ligne
 * absente" afin de ne pas révéler quels tokens existent.
 *
 * Note : le token étant à 256 bits d'entropie, la recherche par empreinte
 * en base (index unique) ne présente pas de surface de timing exploitable.
 * `submitted_at` n'invalide PAS le token : l'agent doit pouvoir rouvrir
 * sa page après soumission (état "déjà rendu") — le contrôle single-use
 * par étage (open ≠ submit) relève des routes de collecte (TC-003/TC-005).
 */
export function verifyMissionToken(
  token: string,
  record: MissionTokenRecord | null | undefined
): MissionTokenVerifyResult {
  if (!record) return { valid: false, reason: 'NOT_FOUND' }

  const candidateHash = hashMissionToken(token)
  if (candidateHash !== record.token_hash) {
    return { valid: false, reason: 'NOT_FOUND' }
  }
  if (record.revoked_at) {
    return { valid: false, reason: 'REVOKED' }
  }
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: 'EXPIRED' }
  }
  return { valid: true, reason: 'VALID' }
}
