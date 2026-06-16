const INTOUCH_BASE_URL = Deno.env.get('INTOUCH_BASE_URL') || 'https://apidist.gutouch.net/apidist/sec/'
const INTOUCH_USERNAME = Deno.env.get('INTOUCH_USERNAME') || ''
const INTOUCH_PASSWORD = Deno.env.get('INTOUCH_PASSWORD') || ''
const INTOUCH_PARTNER_ID = Deno.env.get('INTOUCH_PARTNER_ID') || 'CI300373'
const INTOUCH_LOGIN_API = Deno.env.get('INTOUCH_LOGIN_API') || '07084598370'

// Single password used for all Intouch operations (CASHIN, PAIEMENT, Balance, etc.)
const API_PASSWORD = Deno.env.get('INTOUCH_API_PASSWORD') || ''

const PAIEMENT_SERVICE_CODES: Record<string, string> = {
  ORANGE_MONEY: 'PAIEMENTMARCHANDOMPAYCIDIRECT',
  MTN_MOMO: 'PAIEMENTMARCHAND_MTN_CI',
  MOOV_MONEY: 'PAIEMENTMARCHAND_MOOV_CI',
  WAVE: 'CI_PAIEMENTWAVE_TP',
}

const DEFAULT_PUBLIC_APP_URL = 'https://mon-toit.ci'

export type PaymentOperator = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

export interface PaiementParams {
  operator: PaymentOperator
  recipientNumber: string
  amount: number
  idFromClient: string
  recipientEmail?: string
  recipientFirstName?: string
  recipientLastName?: string
  destinataire?: string
  otp?: string
  callback?: string
  partnerName?: string
  returnUrl?: string
  cancelUrl?: string
}

export interface IntouchPaiementResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  raw?: unknown
}

// ─── CHECKSTATUS / BALANCE Types ───────────────────────────────────────────────

export interface IntouchStatusResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  raw?: unknown
}

export interface IntouchBalanceResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  raw?: unknown
}

// ─── Paiement Immédiat Types ───────────────────────────────────────────────────

export interface PaiementImmediatParams {
  txId: string
  payeurAlias: string
  payeAlias: string
  montant: number
  motif: string
  confirmation: boolean
}

export interface IntouchPaiementImmediatResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  raw?: unknown
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getBasicAuthHeader(): string {
  const encoded = btoa(`${INTOUCH_USERNAME}:${INTOUCH_PASSWORD}`)
  return `Basic ${encoded}`
}

function getDefaultPublicAppUrl(): string {
  const explicitAppUrl = Deno.env.get('INTOUCH_PUBLIC_APP_URL') || Deno.env.get('NEXT_PUBLIC_APP_URL')
  if (explicitAppUrl) return explicitAppUrl

  const callbackUrl = Deno.env.get('INTOUCH_CALLBACK_URL')
  if (callbackUrl) {
    try {
      return new URL(callbackUrl).origin
    } catch {
      return DEFAULT_PUBLIC_APP_URL
    }
  }

  return DEFAULT_PUBLIC_APP_URL
}

export function getDefaultCallbackUrl(): string {
  const baseUrl = Deno.env.get('INTOUCH_CALLBACK_URL') || `${getDefaultPublicAppUrl()}/api/payments/callback`
  const callbackSecret = Deno.env.get('INTOUCH_CALLBACK_SECRET')
  if (callbackSecret) {
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}token=${encodeURIComponent(callbackSecret)}`
  }
  return baseUrl
}

export function getDefaultWaveReturnUrl(): string {
  return Deno.env.get('INTOUCH_WAVE_RETURN_URL') || getDefaultPublicAppUrl()
}

export function getDefaultWaveCancelUrl(): string {
  return Deno.env.get('INTOUCH_WAVE_CANCEL_URL') || getDefaultPublicAppUrl()
}

// ─── PAIEMENT ──────────────────────────────────────────────────────────────────

/**
 * Initiates a PAIEMENT transaction — merchant payment from the payer's wallet.
 * PUT to .../touchpayapi/ANSUT13287/transaction with loginAgent & passwordAgent as query params.
 */
export async function initiatePaiement(params: PaiementParams): Promise<IntouchPaiementResponse> {
  const {
    operator,
    recipientNumber,
    amount,
    idFromClient,
    recipientEmail,
    recipientFirstName,
    recipientLastName,
    destinataire,
    otp,
    callback,
    partnerName,
    returnUrl,
    cancelUrl,
  } = params

  const serviceCode = PAIEMENT_SERVICE_CODES[operator]
  if (!serviceCode) {
    return { success: false, error: `Opérateur non supporté pour le PAIEMENT: ${operator}` }
  }

  if (!API_PASSWORD) {
    return { success: false, error: 'INTOUCH_API_PASSWORD manquant pour le PAIEMENT' }
  }

  const loginAgent = INTOUCH_LOGIN_API
  const passwordAgent = API_PASSWORD
  const url = `${INTOUCH_BASE_URL}touchpayapi/ANSUT13287/transaction?loginAgent=${encodeURIComponent(loginAgent)}&passwordAgent=${encodeURIComponent(passwordAgent)}`

  const additionnalInfos: Record<string, unknown> = {
    recipientEmail: recipientEmail || '',
    recipientFirstName: recipientFirstName || '',
    recipientLastName: recipientLastName || '',
    destinataire: destinataire || recipientNumber,
  }

  if (otp) {
    additionnalInfos.otp = otp
  }

  if (operator === 'WAVE') {
    additionnalInfos.partner_name = partnerName || 'Mon Toit'
    additionnalInfos.return_url = returnUrl || getDefaultWaveReturnUrl()
    additionnalInfos.cancel_url = cancelUrl || getDefaultWaveCancelUrl()
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify({
        idFromClient,
        additionnalInfos,
        amount,
        callback: callback || getDefaultCallbackUrl(),
        recipientNumber,
        serviceCode,
      }),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return { success: false, error: `Intouch PAIEMENT error (${response.status}): ${raw?.message || 'Erreur inconnue'}`, raw }
    }

    return { success: true, data: raw as Record<string, unknown>, raw }
  } catch (error) {
    return { success: false, error: `Intouch PAIEMENT network error: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }
  }
}

// ─── CHECKSTATUS ───────────────────────────────────────────────────────────────

/**
 * Checks the status of a PAIEMENT transaction using its transaction_id.
 * GET .../touchpayapi/ANSUT13287/transaction/{id}?loginAgent=...&passwordAgent=...
 */
export async function checkTransactionStatus(
  transactionId: string
): Promise<IntouchStatusResponse> {
  if (!API_PASSWORD) {
    return { success: false, error: 'INTOUCH_API_PASSWORD manquant pour la vérification de statut Intouch' }
  }

  const loginAgent = INTOUCH_LOGIN_API
  const passwordAgent = API_PASSWORD
  const url = `${INTOUCH_BASE_URL}touchpayapi/ANSUT13287/transaction/${encodeURIComponent(transactionId)}?loginAgent=${encodeURIComponent(loginAgent)}&passwordAgent=${encodeURIComponent(passwordAgent)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: getBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return { success: false, error: `Erreur vérification statut (HTTP ${response.status})`, raw }
    }

    return { success: true, data: raw as Record<string, unknown>, raw }
  } catch (error) {
    return { success: false, error: `Erreur réseau vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }
  }
}

// ─── PAIEMENT IMMÉDIAT (TRANSFER/49) ────────────────────────────────────────────

/**
 * Initiates a Paiement Immédiat — transfer between two Intouch wallets.
 * POST to https://businessapi.gutouch.com/paiements-immediats
 */
export async function initiatePaiementImmediat(
  params: PaiementImmediatParams
): Promise<IntouchPaiementImmediatResponse> {
  const { txId, payeurAlias, payeAlias, montant, motif, confirmation } = params

  if (!API_PASSWORD) {
    return { success: false, error: 'INTOUCH_API_PASSWORD manquant pour le Paiement Immédiat' }
  }

  // Auth is via Basic Auth header only (no password in request body)
  const PAIEMENT_IMMEDIAT_URL =
    Deno.env.get('INTOUCH_PAIEMENT_IMMEDIAT_URL') || 'https://businessapi.gutouch.com/paiements-immediats'

  try {
    const response = await fetch(PAIEMENT_IMMEDIAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify({
        txId,
        payeurAlias,
        payeAlias,
        montant,
        motif,
        confirmation,
      }),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return { success: false, error: `Intouch Paiement Immédiat error (${response.status}): ${raw?.message || 'Erreur inconnue'}`, raw }
    }

    return { success: true, data: raw as Record<string, unknown>, raw }
  } catch (error) {
    return { success: false, error: `Intouch Paiement Immédiat network error: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }
  }
}

// ─── GET BALANCE ───────────────────────────────────────────────────────────────

/**
 * Retrieves the current Intouch balance.
 * POST to .../ANSUT13287/get_balance with partner credentials.
 */
export async function getBalance(): Promise<IntouchBalanceResponse> {
  if (!API_PASSWORD) {
    return { success: false, error: 'INTOUCH_API_PASSWORD manquant pour la consultation du solde' }
  }

  const loginApi = INTOUCH_LOGIN_API
  const passwordApi = API_PASSWORD

  try {
    const response = await fetch(`${INTOUCH_BASE_URL}ANSUT13287/get_balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify({
        partner_id: INTOUCH_PARTNER_ID,
        login_api: loginApi,
        password_api: passwordApi,
      }),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return { success: false, error: `Intouch getBalance error (${response.status}): ${raw?.message || 'Erreur inconnue'}`, raw }
    }

    return { success: true, data: raw as Record<string, unknown>, raw }
  } catch (error) {
    return { success: false, error: `Intouch getBalance network error: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }
  }
}

// ─── Utility ───────────────────────────────────────────────────────────────────

export function generatePartnerTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MT-${timestamp}-${random}`
}

export function getOperatorLabel(method: string): string {
  const labels: Record<string, string> = {
    ORANGE_MONEY: 'Orange Money',
    MTN_MOMO: 'MTN MoMo',
    MOOV_MONEY: 'Moov Money',
    WAVE: 'Wave',
  }
  return labels[method] || method
}
