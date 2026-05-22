const CRYPTONEO_API_URL =
    Deno.env.get("CRYPTONEO_API_URL") ||
    "https://ansut.cryptoneoplatforms.com/esignaturedemo"
const APP_KEY = Deno.env.get("CRYPTONEO_APP_KEY") || ""
const APP_SECRET = Deno.env.get("CRYPTONEO_APP_SECRET") || ""

const TOKEN_TTL_MS = 30 * 60 * 1000

interface CachedToken {
    token: string
    expiresAt: number
}

let cachedToken: CachedToken | null = null

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

export interface CryptoneoOtpResponse {
    message?: string
    [key: string]: unknown
}

export interface SignRequestItem {
    codeDoc: string
    urlDoc: string
    hashDoc: string
    visibiliteImage?: boolean
    urlImage?: string
    hashImage?: string
    positionImage?: string   // "x,y"
    pageImage?: string       // page number as string
    messageImage?: string    // "true" or "false"
    lieuSignature?: string
    motifSignature?: string
}

export interface CryptoneoSignResponse {
    data?: { operationId?: string; signedFileName?: string }
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

export interface CryptoneoUser {
    alias?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    state?: string
    createdAt?: string
    // Champs retournés par GET /generateCert/users
    nom?: string
    prenom?: string
    generationState?: string
    hexacertserialnumber?: string
    issuerdn?: string
    generationEndingDate?: number
}

export interface CryptoneoUsersResponse {
    statusCode?: number
    statusMessage?: string
    data?: CryptoneoUser[]
}

export interface RetrieveCertificatesRequest {
    alias?: string
    name?: string
    phone?: string
    state?: string
    email?: string
    onlyAlias?: string
}

export async function getCryptoneoToken(): Promise<string> {
    console.log('[cryptoneo] getCryptoneoToken called')
    console.log('[cryptoneo] CRYPTONEO_API_URL:', CRYPTONEO_API_URL)
    console.log('[cryptoneo] APP_KEY:', APP_KEY ? 'set' : 'not set')
    console.log('[cryptoneo] APP_SECRET:', APP_SECRET ? 'set' : 'not set')

    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        console.log('[cryptoneo] Returning cached token')
        return cachedToken.token
    }

    const url = `${CRYPTONEO_API_URL}/user/auth`
    console.log('[cryptoneo] Fetching token from:', url)

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: APP_KEY, appSecret: APP_SECRET }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error('[cryptoneo] Auth failed:', res.status, text)
        throw new Error(`CRYPTONEO auth failed (${res.status}): ${text}`)
    }

    const data: CryptoneoAuthResponse = await res.json()
    const token = data?.data?.token
    if (!token) {
        console.error('[cryptoneo] No token in response:', JSON.stringify(data))
        throw new Error(
            `CRYPTONEO auth returned no token: ${JSON.stringify(data)}`
        )
    }

    cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS }
    console.log('[cryptoneo] Token obtained successfully, expires at:', new Date(cachedToken.expiresAt).toISOString())
    return token
}

export function clearCryptoneoToken(): void {
    cachedToken = null
}

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

/**
 * Codes succès CRYPTONEO : 200, 7000 (liste d'utilisateurs), etc.
 * Codes erreur : >= 8000 (8006 = paramètres invalides).
 */
const CRYPTONEO_SUCCESS_CODES = new Set([200, 7000, 7002])

/** Vérifie si un code de retour CRYPTONEO indique un succès. */
export function isCryptoneoSuccess(data: Record<string, unknown>): boolean {
    const code = (data as any).code ?? (data as any).statusCode
    // 0 est un code erreur côté CRYPTONEO, on ne peut pas utiliser !code
    return code === undefined || code === null || CRYPTONEO_SUCCESS_CODES.has(code)
}

/**
 * CRYPTONEO renvoie des erreurs métier avec HTTP 200 + statusCode dans le body.
 * Vérifie les deux et retourne { ok, data, error }.
 */
export async function cryptoneoFetchJson(
    path: string,
    options: RequestInit = {},
): Promise<{ ok: boolean; data: Record<string, unknown>; error?: string }> {
    const res = await cryptoneoFetch(path, options)
    const text = await res.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { data = {} }

    // Succès : HTTP ok ET (pas de code métier OU code reconnu succès)
    const isSuccess = res.ok && isCryptoneoSuccess(data)
    if (!isSuccess) {
        const msg = (data as any)?.statusMessage || (data as any)?.message || `CRYPTONEO error: ${text}`
        return { ok: false, data, error: msg }
    }

    return { ok: true, data }
}

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

    if (res.status === 401 && retry) {
        clearCryptoneoToken()
        return cryptoneoFetch(path, options, false)
    }

    return res
}
