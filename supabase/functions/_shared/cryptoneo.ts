const CRYPTONEO_API_URL = Deno.env.get('CRYPTONEO_API_URL') || 'https://signature.ansut.ci'
const APP_KEY = Deno.env.get('CRYPTONEO_APP_KEY') || ''
const APP_SECRET = Deno.env.get('CRYPTONEO_APP_SECRET') || ''

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
  positionImage?: string
  pageImage?: number
  messageImage?: string
  lieuSignature: string
  motifSignature: string
}

export interface CryptoneoSignResponse {
  data?: { operationId?: string }
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

export interface CryptoneoVerifyResponse {
  data?: {
    operationId?: string
    results?: Array<{
      data?: { fileName?: string; hashSignDoc?: string }
      codeDoc?: string
      startTime?: number
      statusMessage?: string
      statusCode?: number
    }>
  }
  statusCode?: number
  statusMessage?: string
  [key: string]: unknown
}

export interface CryptoneoSignedFileResponse {
  [key: string]: unknown
}

export async function getCryptoneoToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  const url = `${CRYPTONEO_API_URL}/user/auth`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appKey: APP_KEY, appSecret: APP_SECRET }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`CRYPTONEO auth failed (${res.status}): ${text}`)
  }

  const data: CryptoneoAuthResponse = await res.json()
  const token = data?.data?.token
  if (!token) {
    throw new Error(`CRYPTONEO auth returned no token: ${JSON.stringify(data)}`)
  }

  cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS }
  return token
}

export function clearCryptoneoToken(): void {
  cachedToken = null
}

export async function cryptoneoFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = await getCryptoneoToken()
  const url = `${CRYPTONEO_API_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
