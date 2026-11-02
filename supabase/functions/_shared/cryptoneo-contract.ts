/**
 * Contrat CRYPTONEO (ANSUT e-signature) — source de vérité PARTAGÉE (DAT-004).
 * ============================================================================
 * Runtime-agnostique : ce module ne doit contenir AUCUNE dépendance Deno
 * (`Deno.env`), Node (`process.env`, `Buffer`) ni npm — uniquement des
 * constantes, fonctions pures et types. Il est importé à la fois par :
 *   - les Edge Functions Deno :        supabase/functions/_shared/cryptoneo.ts
 *   - le pont Next.js (documentation) : src/lib/shared/cryptoneo.ts
 *
 * ⚠️ Toute évolution du contrat (codes succès, normalisation de genre, shapes
 * API) doit se faire ICI puis être re-répercutée sur l'implémentation
 * `cryptoneo.ts` du runtime concerné. Le pont `src/lib/shared/cryptoneo.ts`
 * ré-exporte ce contrat pour le code Next.js.
 *
 * Historique de divergence corrigée (DAT-004) : `src/lib/cryptoneo.ts` et
 * `_shared/cryptoneo.ts` avaient DIVERGÉ sur les codes succès CRYPTONEO
 * ({200,7000,7002} + « falsy = succès » côté lib, vs {200,7000,7002,7003,7004}
 * + « 0 = erreur » côté Edge). La version Edge est canonique : le commentaire
 * d'origine précise que « 0 est un code erreur côté CRYPTONEO ».
 */

/** Durée de vie du token JWT CRYPTONEO en cache (30 min, marge 60 s). */
export const CRYPTONEO_TOKEN_TTL_MS = 30 * 60 * 1000

/**
 * Codes de succès métier CRYPTONEO : 200 (OK), 7000 (liste d'utilisateurs),
 * 7002/7003/7004 (opérations de signature). Codes d'erreur : >= 8000
 * (ex. 8006 = paramètres invalides) et 0 (échec — ne pas traiter comme
 * « falsy = succès »).
 */
export const CRYPTONEO_SUCCESS_CODES: ReadonlySet<number> = new Set([200, 7000, 7002, 7003, 7004])

/**
 * Vérifie si un code de retour CRYPTONEO indique un succès.
 * CRYPTONEO renvoie des erreurs métier en HTTP 200 avec un `code`/`statusCode`
 * dans le body : 0 et les codes >= 8000 sont des erreurs.
 */
export function isCryptoneoSuccess(data: Record<string, unknown>): boolean {
  const code = data.code ?? data.statusCode
  // Cast : le contrat type le code en number côté Set ; à l'exécution un code
  // string non reconnu est traité comme une erreur (has() → false).
  return code === undefined || code === null || CRYPTONEO_SUCCESS_CODES.has(code as number)
}

/**
 * Normalise le genre pour CRYPTONEO qui attend "Homme" ou "Femme"
 * (accepte homme/m/male/masculin, femme/f/female/feminin ; défaut "Homme").
 */
export function normalizeCryptoneoGender(gender?: string | null): string {
  if (!gender) return 'Homme'
  const g = gender.toLowerCase().trim()
  if (g === 'homme' || g === 'm' || g === 'male' || g === 'masculin') return 'Homme'
  if (g === 'femme' || g === 'f' || g === 'female' || g === 'feminin') return 'Femme'
  return 'Homme'
}

// ─── Shapes API CRYPTONEO (types consommés par les Edge Functions) ──────────
// Référence : endpoints /user/auth, /generateCert/users, /generateCert/generateCertificat,
// /otp/send, /sign/signFileBatch, /sign/verifySignedBatch, /sign/getSignedFile.

export interface CryptoneoAuthResponse {
  data?: { token?: string }
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

export interface CryptoneoCertificatResponse {
  data?: { aliasCertificat?: string }
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

/** Certificat CRYPTONEO tel que renvoyé par /generateCert/users. */
export interface CryptoneoUser {
  alias?: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  serialNumber?: string
  state?: string
  [key: string]: unknown
}

export interface CryptoneoUsersResponse {
  data?: CryptoneoUser[]
  code?: number | string
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

export interface CryptoneoOtpResponse {
  message?: string
  [key: string]: unknown
}

export interface CryptoneoSignResponse {
  data?: {
    operationId?: string
    signedFileName?: string
    results?: Array<{ data?: { fileName?: string }; [key: string]: unknown }>
    [key: string]: unknown
  }
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

export interface CryptoneoVerifyResponse {
  data?: {
    operationId?: string
    status?: string
    signedAt?: string
    signerInfo?: { name?: string; certificateAlias?: string }
    results?: Array<{ data?: { fileName?: string }; [key: string]: unknown }>
  }
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

export interface CryptoneoSignedFileResponse {
  [key: string]: unknown
}

/** Item du batch `/sign/signFileBatch` (format CRYPTONEO, cf. EF `sign`). */
export interface SignRequestItem {
  codeDoc: string
  urlDoc: string
  hashDoc: string
  visibiliteImage: boolean
  urlImage: string
  hashImage: string
  positionImage: string
  pageImage: string
  messageImage: string
  lieuSignature: string
  motifSignature: string
}
