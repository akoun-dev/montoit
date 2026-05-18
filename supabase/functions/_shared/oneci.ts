const ONECI_API_BASE = Deno.env.get('ONECI_API_BASE') || 'https://api-rnpp.verif.ci'
const ONECI_API_KEY = Deno.env.get('ONECI_API_KEY') || ''
const ONECI_SECRET_KEY = Deno.env.get('ONECI_SECRET_KEY') || ''
const ONECI_TIMEOUT = 15_000
const TOKEN_TTL_MS = 30 * 60 * 1000

interface CachedToken {
  token: string
  expiresAt: number
}
let cachedToken: CachedToken | null = null

export interface OneciAuthResponse {
  token?: string
  data?: { token?: string }
  [key: string]: unknown
}
export interface OneciPersonMatchResponse {
  match?: boolean
  score?: number
  message?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}
export interface OneciSubscriptionResponse {
  remainingRequests?: number
  totalRequests?: number
  usedRequests?: number
  data?: { remainingRequests?: number; totalRequests?: number; usedRequests?: number }
  [key: string]: unknown
}
export interface OneciFaceAuthResponse {
  authenticated?: boolean
  score?: number
  message?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = ONECI_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

export async function getOneciToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }
  if (!ONECI_API_KEY || !ONECI_SECRET_KEY) {
    throw new Error('ONECI API credentials not configured')
  }
  const res = await fetchWithTimeout(`${ONECI_API_BASE}/api/v1/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: ONECI_API_KEY, secretKey: ONECI_SECRET_KEY }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI auth failed (${res.status}): ${text}`)
  }
  const data: OneciAuthResponse = await res.json()
  const token = data?.token || data?.data?.token
  if (!token) throw new Error(`ONECI auth returned no token: ${JSON.stringify(data)}`)
  cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS }
  return token
}

export function clearOneciToken(): void {
  cachedToken = null
}

export async function oneciFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getOneciToken()
  const res = await fetchWithTimeout(`${ONECI_API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (res.status === 401 && retry) {
    clearOneciToken()
    return oneciFetch(path, options, false)
  }
  return res
}

export async function oneciPersonMatch(params: {
  nni: string; firstName: string; lastName: string; birthDate: string; gender: string
}): Promise<OneciPersonMatchResponse> {
  const formData = new FormData()
  formData.append('FIRST_NAME', params.firstName)
  formData.append('LAST_NAME', params.lastName)
  formData.append('BIRTH_DATE', params.birthDate)
  formData.append('GENDER', params.gender)
  const res = await oneciFetch(`/api/v1/oneci/persons/${params.nni}/match`, {
    method: 'POST', body: formData,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI person match failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function oneciFaceAuth(params: { nni: string; faceImage: string }): Promise<OneciFaceAuthResponse> {
  const res = await oneciFetch('/api/v1/oneci/face-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ NNI: params.nni, BIOMETRIC_TYPE: 'AUTH_FACE', BIOMETRIC_DATA: params.faceImage }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI face auth failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function oneciCheckSubscription(): Promise<OneciSubscriptionResponse> {
  const res = await oneciFetch('/api/v1/subscription/remaining-requests', { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI subscription check failed (${res.status}): ${text}`)
  }
  return res.json()
}
