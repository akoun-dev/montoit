// ─── CRYPTONEO / ANSUT Electronic Signature Helper ─────────────────────────────
// Server-side only — NEVER import this on the client.

/**
 * Normalise le genre pour CRYPTONEO qui attend "Homme" ou "Femme".
 */
export function normalizeCryptoneoGender(gender?: string | null): string {
    if (!gender) return 'Homme'
    const g = gender.toLowerCase().trim()
    if (g === 'homme' || g === 'm' || g === 'male' || g === 'masculin') return 'Homme'
    if (g === 'femme' || g === 'f' || g === 'female' || g === 'feminin') return 'Femme'
    return 'Homme'
}

// ─── Configuration ──────────────────────────────────────────────────────────────

export const CRYPTONEO_API_URL =
    process.env.CRYPTONEO_API_URL ||
    "https://ansut.cryptoneoplatforms.com/esignaturedemo"
export const APP_KEY = process.env.CRYPTONEO_APP_KEY || ""
export const APP_SECRET = process.env.CRYPTONEO_APP_SECRET || ""

// ─── Token Cache ────────────────────────────────────────────────────────────────

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CachedToken {
    token: string
    expiresAt: number // Date.now() + TTL
}

let cachedToken: CachedToken | null = null

// ─── Type Definitions ───────────────────────────────────────────────────────────

export interface CryptoneoAuthResponse {
    data?: {
        token?: string
    }
    statusCode?: number
    statusMessage?: string
    [key: string]: unknown
}

export interface CryptoneoCertificatResponse {
    data?: {
        aliasCertificat?: string
    }
    statusCode?: number
    statusMessage?: string
    [key: string]: unknown
}

export interface CryptoneoOtpResponse {
    message?: string
    [key: string]: unknown
}

/** Format envoyé par le frontend Next.js → l'Edge Function le convertit au format CRYPTONEO */
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

export interface CryptoneoSignResponse {
    data?: {
        operationId?: string
        signedFileName?: string
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
    }
    statusCode?: number
    statusMessage?: string
    [key: string]: unknown
}

export interface CryptoneoSignedFileResponse {
    [key: string]: unknown
}

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
        expiresAt: Date.now() + TOKEN_TTL_MS,
    }

    return cachedToken.token
}

/**
 * Clear the cached token (e.g., after a 401 from CRYPTONEO to force re-auth).
 */
/** Codes succès CRYPTONEO : 200, 7000 (liste utilisateurs), etc. */
const CRYPTONEO_SUCCESS_CODES = new Set([200, 7000, 7002])

/** Vérifie si un code de retour CRYPTONEO indique un succès. */
export function isCryptoneoSuccess(data: Record<string, unknown>): boolean {
    const code = (data as any).code ?? (data as any).statusCode
    return !code || CRYPTONEO_SUCCESS_CODES.has(code)
}

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
