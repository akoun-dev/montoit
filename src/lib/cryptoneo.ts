// ─── CRYPTONEO / ANSUT Electronic Signature Helper ─────────────────────────────
// Server-side only — NEVER import this on the client.
//
// DAT-004 (déduplication lib ↔ Edge Functions) : la logique PURE (codes
// succès, normalisation du genre, shapes API) est extraite dans
// `supabase/functions/_shared/cryptoneo-contract.ts` — source de vérité
// partagée, runtime-agnostique (aucune dépendance Deno/Node/npm), importée
// et ré-exportée ci-dessous. Ce module ne conserve que la partie runtime
// Node/Next.js : secrets via `process.env`, cache du token JWT, fetch.
//
// ⚠️ Toute évolution du contrat (codes succès, shapes API) se fait dans
// `cryptoneo-contract.ts` puis est héritée ici ET par
// `supabase/functions/_shared/cryptoneo.ts` (runtime Deno).
// Contrat de parité et tests manuels : docs/DEDUP-LIB-EDGE-FUNCTIONS.md.
//
// Historique de divergence corrigée (DAT-004) : `isCryptoneoSuccess` traitait
// `code = 0` comme un succès (« falsy = succès ») et ignorait les codes
// 7003/7004. Le contrat (aligné sur la version Edge, canonique) corrige :
// 0 et les codes >= 8000 sont des ERREURS. Seul consommateur app : la route
// admin `/api/signature/sync-aliases` — alignement voulu avec le comportement
// des Edge Functions.

import {
  CRYPTONEO_TOKEN_TTL_MS,
  type CryptoneoAuthResponse,
} from '../../supabase/functions/_shared/cryptoneo-contract'

// ─── Contrat partagé (source de vérité — ré-export) ──────────────────────────

export {
  CRYPTONEO_SUCCESS_CODES,
  isCryptoneoSuccess,
  normalizeCryptoneoGender,
} from '../../supabase/functions/_shared/cryptoneo-contract'

export type {
  CryptoneoAuthResponse,
  CryptoneoCertificatResponse,
  CryptoneoOtpResponse,
  CryptoneoSignResponse,
  CryptoneoSignedFileResponse,
  CryptoneoUser,
  CryptoneoUsersResponse,
  CryptoneoVerifyResponse,
  SignRequestItem,
} from '../../supabase/functions/_shared/cryptoneo-contract'

// ─── Configuration (runtime Node/Next uniquement) ─────────────────────────────

export const CRYPTONEO_API_URL =
    process.env.CRYPTONEO_API_URL ||
    "https://ansut.cryptoneoplatforms.com/esignaturedemo"
export const APP_KEY = process.env.CRYPTONEO_APP_KEY || ""
export const APP_SECRET = process.env.CRYPTONEO_APP_SECRET || ""

// ─── Token Cache ────────────────────────────────────────────────────────────────

interface CachedToken {
    token: string
    expiresAt: number // Date.now() + TTL
}

let cachedToken: CachedToken | null = null

// ─── Token Management ───────────────────────────────────────────────────────────

/**
 * Get a valid CRYPTONEO JWT token, reusing the cached token if still valid.
 * If the cached token is expired or missing, authenticates to get a new one.
 */
export async function getCryptoneoToken(): Promise<string> {
    // Return cached token if still valid (with 60s safety margin)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.token
    }

    const url = `${CRYPTONEO_API_URL}/user/auth`

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            appKey: APP_KEY,
            appSecret: APP_SECRET,
        }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`CRYPTONEO auth failed (${res.status}): ${text}`)
    }

    const data: CryptoneoAuthResponse = await res.json()

    const token = data?.data?.token
    if (!token) {
        throw new Error(
            `CRYPTONEO auth returned no token: ${JSON.stringify(data)}`
        )
    }

    cachedToken = {
        token,
        expiresAt: Date.now() + CRYPTONEO_TOKEN_TTL_MS,
    }

    return cachedToken.token
}

/**
 * Clear the cached token (e.g., after a 401 from CRYPTONEO to force re-auth).
 */
export function clearCryptoneoToken(): void {
    cachedToken = null
}

// ─── Authenticated Fetch Helper ─────────────────────────────────────────────────

/**
 * Make an authenticated request to the CRYPTONEO API.
 * Automatically adds the Bearer token header.
 * On 401, clears the cache and retries once.
 */
export async function cryptoneoFetch(
    path: string,
    options: RequestInit = {},
    retry = true
): Promise<Response> {
    const token = await getCryptoneoToken()

    const url = `${CRYPTONEO_API_URL}${path}`

    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    })

    // If token expired, clear cache and retry once
    if (res.status === 401 && retry) {
        clearCryptoneoToken()
        return cryptoneoFetch(path, options, false)
    }

    return res
}

// ─── Type : format FRONTEND (Next.js → Edge Function) ────────────────────────

/**
 * Format envoyé par le frontend Next.js → l'Edge Function le convertit au
 * format CRYPTONEO (`SignRequestItem`, défini dans le contrat partagé).
 */
export interface SignRequestInputItem {
    fileName: string
    base64: string
    signataireNom: string
    signatairePrenom: string
    signataireEmail: string
    signatairePhone: string
    positionX?: number
    positionY?: number
    page?: number
    visibleSignature?: boolean
}
