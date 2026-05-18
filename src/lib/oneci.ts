// ─── ONECI / RNPP National ID Verification Helper ─────────────────────────────
// Server-side only — NEVER import this on the client.
//
// Integrates with the ONECI API (api-rnpp.verif.ci) for:
// - Person matching (verify personal info against NNI)
// - Face authentication (compare selfie against national ID photo)
// - Subscription quota checking

// ─── Configuration ──────────────────────────────────────────────────────────────

export const ONECI_API_BASE = process.env.ONECI_API_BASE || 'https://api-rnpp.verif.ci'
export const ONECI_API_KEY = process.env.ONECI_API_KEY || ''
export const ONECI_SECRET_KEY = process.env.ONECI_SECRET_KEY || ''

// ─── Timeout ────────────────────────────────────────────────────────────────────

const ONECI_TIMEOUT = 15_000 // 15 seconds

// ─── Token Cache ────────────────────────────────────────────────────────────────

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CachedToken {
  token: string
  expiresAt: number // Date.now() + TTL
}

let cachedToken: CachedToken | null = null

// ─── Type Definitions ───────────────────────────────────────────────────────────

export interface OneciAuthResponse {
  token?: string
  data?: {
    token?: string
  }
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
  data?: {
    remainingRequests?: number
    totalRequests?: number
    usedRequests?: number
  }
  [key: string]: unknown
}

export interface OneciFaceAuthResponse {
  authenticated?: boolean
  score?: number
  message?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

// ─── Fetch with Timeout ─────────────────────────────────────────────────────────

/**
 * Fetch wrapper with AbortController timeout.
 * Matches the same pattern used in the NeoFace KYC route.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = ONECI_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

// ─── Token Management ───────────────────────────────────────────────────────────

/**
 * Get a valid ONECI JWT token, reusing the cached token if still valid.
 * If the cached token is expired or missing, authenticates to get a new one.
 */
export async function getOneciToken(): Promise<string> {
  // Return cached token if still valid (with 60s safety margin)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  if (!ONECI_API_KEY || !ONECI_SECRET_KEY) {
    throw new Error('ONECI API credentials not configured (ONECI_API_KEY / ONECI_SECRET_KEY)')
  }

  const url = `${ONECI_API_BASE}/api/v1/authenticate`

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: ONECI_API_KEY,
      secretKey: ONECI_SECRET_KEY,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI auth failed (${res.status}): ${text}`)
  }

  const data: OneciAuthResponse = await res.json()

  // Token might be at top level or nested in data
  const token = data?.token || data?.data?.token
  if (!token) {
    throw new Error(`ONECI auth returned no token: ${JSON.stringify(data)}`)
  }

  cachedToken = {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  }

  return cachedToken.token
}

/**
 * Clear the cached token (e.g., after a 401 from ONECI to force re-auth).
 */
export function clearOneciToken(): void {
  cachedToken = null
}

// ─── Authenticated Fetch Helper ─────────────────────────────────────────────────

/**
 * Make an authenticated request to the ONECI API.
 * Automatically adds the Bearer token header.
 * On 401, clears the cache and retries once.
 */
export async function oneciFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = await getOneciToken()

  const url = `${ONECI_API_BASE}${path}`

  const res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  // If token expired, clear cache and retry once
  if (res.status === 401 && retry) {
    clearOneciToken()
    return oneciFetch(path, options, false)
  }

  return res
}

// ─── High-level API Helpers ─────────────────────────────────────────────────────

/**
 * Verify personal information against the ONECI database using an NNI.
 * POST /api/v1/oneci/persons/{nni}/match
 * Body (form-data): FIRST_NAME, LAST_NAME, BIRTH_DATE (YYYY-MM-DD), GENDER (M/F)
 */
export async function oneciPersonMatch(params: {
  nni: string
  firstName: string
  lastName: string
  birthDate: string // YYYY-MM-DD
  gender: string // M or F
}): Promise<OneciPersonMatchResponse> {
  const { nni, firstName, lastName, birthDate, gender } = params

  const formData = new FormData()
  formData.append('FIRST_NAME', firstName)
  formData.append('LAST_NAME', lastName)
  formData.append('BIRTH_DATE', birthDate)
  formData.append('GENDER', gender)

  const res = await oneciFetch(`/api/v1/oneci/persons/${nni}/match`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI person match failed (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Perform face authentication against the national ID photo.
 * POST /api/v1/oneci/face-auth
 * Body (JSON): { NNI, BIOMETRIC_TYPE: "AUTH_FACE", BIOMETRIC_DATA: "<base64_image>" }
 */
export async function oneciFaceAuth(params: {
  nni: string
  faceImage: string // base64-encoded image
}): Promise<OneciFaceAuthResponse> {
  const { nni, faceImage } = params

  const res = await oneciFetch('/api/v1/oneci/face-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      NNI: nni,
      BIOMETRIC_TYPE: 'AUTH_FACE',
      BIOMETRIC_DATA: faceImage,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI face auth failed (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Check remaining API request quota.
 * GET /api/v1/subscription/remaining-requests
 */
export async function oneciCheckSubscription(): Promise<OneciSubscriptionResponse> {
  const res = await oneciFetch('/api/v1/subscription/remaining-requests', {
    method: 'GET',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ONECI subscription check failed (${res.status}): ${text}`)
  }

  return res.json()
}
