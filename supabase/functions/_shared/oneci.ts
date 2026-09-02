// RNPP Connect client for Supabase Edge Functions.

const RNPP_API_BASE = (Deno.env.get('RNPP_API_BASE') || 'https://kyc.rnpp-connect.ci/api').replace(/\/$/, '')
const RNPP_API_KEY = Deno.env.get('RNPP_API_KEY') || ''
const RNPP_TIMEOUT = 30_000

export class RnppApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown> | null,
    readonly retryAfter: string | null,
  ) {
    super(String(body?.message || body?.error || `RNPP Connect request failed (${status})`))
    this.name = 'RnppApiError'
  }
}

export interface RnppMatchResponse { [key: string]: unknown; match?: boolean; score?: number; message?: string; Code?: number | string; code?: number | string }
export interface RnppBiometricResponse { [key: string]: unknown; authenticated?: boolean; score?: number; message?: string; Code?: number | string; code?: number | string }
export interface RnppBalanceResponse { apiAvailable: number; sandboxAvailable: number }

function parseBody(text: string): Record<string, unknown> | null {
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
  try { return await fetch(url, { ...options, signal: controller.signal }) }
  finally { clearTimeout(timeoutId) }
}

export async function rnppFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!RNPP_API_KEY) throw new RnppApiError(503, { message: 'RNPP API key is not configured' }, null)
  const headers = new Headers(options.headers)
  headers.set('X-Api-Key', RNPP_API_KEY)
  const response = await fetchWithTimeout(`${RNPP_API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new RnppApiError(response.status, parseBody(text), response.headers.get('Retry-After'))
  }
  return response
}

export async function rnppPerson(nni: string): Promise<Record<string, unknown>> {
  return (await rnppFetch(`/rnpp/persons/${encodeURIComponent(nni)}`)).json()
}

export async function rnppPersonMatch(params: { nni: string; firstName: string; lastName: string; birthDate: string; gender: string }): Promise<RnppMatchResponse> {
  const formData = new FormData()
  formData.append('FIRST_NAME', params.firstName)
  formData.append('LAST_NAME', params.lastName)
  formData.append('BIRTH_DATE', params.birthDate)
  formData.append('GENDER', params.gender)
  return (await rnppFetch(`/rnpp/persons/${encodeURIComponent(params.nni)}/match`, { method: 'POST', body: formData })).json()
}

export async function rnppFaceAuth(params: { nni: string; faceImage: string }): Promise<RnppBiometricResponse> {
  return (await rnppFetch('/rnpp/face-auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ NNI: params.nni, BIOMETRIC_TYPE: 'AUTH_FACE', BIOMETRIC_DATA: params.faceImage }),
  })).json()
}

export async function rnppFingerprintAuth(params: { nni: string; fingerprintData: string }): Promise<RnppBiometricResponse> {
  return (await rnppFetch('/rnpp/fingerprint-auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ NNI: params.nni, BIOMETRIC_TYPE: 'AUTH_FINGERPRINT', BIOMETRIC_DATA: params.fingerprintData }),
  })).json()
}

export async function rnppBalance(): Promise<RnppBalanceResponse> {
  return (await rnppFetch('/billing/balance')).json()
}
