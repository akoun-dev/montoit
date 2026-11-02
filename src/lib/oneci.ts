// RNPP Connect client.
// Server-side only: the RNPP API key must never be exposed to the browser.

export const RNPP_API_BASE = (process.env.RNPP_API_BASE || 'https://kyc.rnpp-connect.ci/api').replace(/\/$/, '')
export const RNPP_API_KEY = process.env.RNPP_API_KEY || ''
export const RNPP_TIMEOUT = 30_000
export const RNPP_FACE_MAX_BYTES = 2 * 1024 * 1024
export const RNPP_FINGERPRINT_MAX_BYTES = 1024 * 1024

export interface RnppErrorBody {
  message?: string
  error?: string
  [key: string]: unknown
}

export class RnppApiError extends Error {
  readonly status: number
  readonly body: RnppErrorBody | null
  readonly retryAfter: string | null

  constructor(status: number, body: RnppErrorBody | null, retryAfter: string | null) {
    super(body?.message || body?.error || `RNPP Connect request failed (${status})`)
    this.name = 'RnppApiError'
    this.status = status
    this.body = body
    this.retryAfter = retryAfter
  }
}

export interface RnppPersonResponse {
  [key: string]: unknown
}

export interface RnppMatchResponse {
  match?: boolean
  score?: number
  message?: string
  Code?: number | string
  code?: number | string
  data?: Record<string, unknown>
  [key: string]: unknown
}

export interface RnppBiometricResponse {
  Code?: number | string
  code?: number | string
  authenticated?: boolean
  score?: number
  message?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

export interface RnppBalanceResponse {
  apiAvailable: number
  sandboxAvailable: number
}

function parseBody(text: string): RnppErrorBody | null {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : { message: text }
  } catch {
    return { message: text }
  }
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), RNPP_TIMEOUT)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function assertConfigured(): void {
  if (!RNPP_API_KEY) throw new RnppApiError(503, { message: 'RNPP API key is not configured' }, null)
}

export async function rnppFetch(path: string, options: RequestInit = {}): Promise<Response> {
  assertConfigured()
  const headers = new Headers(options.headers)
  headers.set('X-Api-Key', RNPP_API_KEY)
  let response: Response
  try {
    response = await fetchWithTimeout(`${RNPP_API_BASE}${path}`, { ...options, headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RnppApiError(504, { message: 'RNPP Connect request timed out' }, null)
    }
    throw new RnppApiError(503, { message: 'RNPP Connect is unreachable' }, null)
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new RnppApiError(response.status, parseBody(text), response.headers.get('Retry-After'))
  }
  return response
}

export async function rnppPerson(nni: string): Promise<RnppPersonResponse> {
  const response = await rnppFetch(`/rnpp/persons/${encodeURIComponent(nni)}`)
  return response.json()
}

export async function rnppPersonMatch(params: {
  nni: string
  firstName: string
  lastName: string
  birthDate: string
  gender: string
}): Promise<RnppMatchResponse> {
  const formData = new FormData()
  formData.append('FIRST_NAME', params.firstName)
  formData.append('LAST_NAME', params.lastName)
  formData.append('BIRTH_DATE', params.birthDate)
  formData.append('GENDER', params.gender)
  const response = await rnppFetch(`/rnpp/persons/${encodeURIComponent(params.nni)}/match`, {
    method: 'POST',
    body: formData,
  })
  return response.json()
}

export async function rnppFaceAuth(params: { nni: string; faceImage: string }): Promise<RnppBiometricResponse> {
  const response = await rnppFetch('/rnpp/face-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ NNI: params.nni, BIOMETRIC_TYPE: 'AUTH_FACE', BIOMETRIC_DATA: params.faceImage }),
  })
  return response.json()
}

export async function rnppFingerprintAuth(params: { nni: string; fingerprintData: string }): Promise<RnppBiometricResponse> {
  const response = await rnppFetch('/rnpp/fingerprint-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ NNI: params.nni, BIOMETRIC_TYPE: 'AUTH_FINGERPRINT', BIOMETRIC_DATA: params.fingerprintData }),
  })
  return response.json()
}

export async function rnppBalance(): Promise<RnppBalanceResponse> {
  const response = await rnppFetch('/billing/balance')
  return response.json()
}
