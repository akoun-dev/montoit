// ─── Intouch CI Payment Gateway Integration ────────────────────────────────────
// Handles CASHIN and PAIEMENT API calls to the Intouch payment gateway.

// ─── Configuration ──────────────────────────────────────────────────────────────

const INTOUCH_BASE_URL =
  process.env.INTOUCH_BASE_URL || 'https://apidist.gutouch.net/apidist/sec/'
const INTOUCH_USERNAME =
  process.env.INTOUCH_USERNAME || '8ff019758878d5cdab335d12fbc998721d319e4159e2086f9cb1f15f23896e10'
const INTOUCH_PASSWORD =
  process.env.INTOUCH_PASSWORD || 'd3fd092d16747333547e340e4aac135888ff90c38e9577cadec41a052a507978'
const INTOUCH_PARTNER_ID = process.env.INTOUCH_PARTNER_ID || 'CI300373'
const INTOUCH_LOGIN_API = process.env.INTOUCH_LOGIN_API || '07084598370'

// Per-operator passwords for CASHIN
const CASHIN_PASSWORDS: Record<PaymentOperator, string> = {
  ORANGE_MONEY: process.env.INTOUCH_CASHIN_OM_PASSWORD || 'G1tBPD9v',
  MTN_MOMO: process.env.INTOUCH_CASHIN_MTN_PASSWORD || 'vwGAKHRBnn',
  MOOV_MONEY: process.env.INTOUCH_CASHIN_MOOV_PASSWORD || 'XXX',
  WAVE: process.env.INTOUCH_CASHIN_WAVE_PASSWORD || 'XXX',
}

// Service IDs for CASHIN per operator
const CASHIN_SERVICE_IDS: Record<PaymentOperator, string> = {
  ORANGE_MONEY: 'CASHINOMCIPART2',
  MTN_MOMO: 'CASHINMTNPART2',
  MOOV_MONEY: 'CASHINMOOVPART2',
  WAVE: 'CI_CASHIN_WAVE_PART',
}

// Service codes for PAIEMENT per operator
const PAIEMENT_SERVICE_CODES: Record<PaymentOperator, string> = {
  ORANGE_MONEY: 'PAIEMENTMARCHANDOMPAYCIDIRECT',
  MTN_MOMO: 'PAIEMENTMARCHAND_MTN_CI',
  MOOV_MONEY: 'PAIEMENTMARCHAND_MOOV_CI',
  WAVE: 'CI_PAIEMENTWAVE_TP',
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PaymentOperator = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

export interface CashinParams {
  /** The payment operator to use */
  operator: PaymentOperator
  /** Recipient phone number (the person receiving money) */
  recipientPhoneNumber: string
  /** Amount in FCFA */
  amount: number
  /** Unique transaction ID from our system */
  partnerTransactionId: string
  /** Callback URL for Intouch to notify us of the result */
  callBackUrl?: string
}

export interface PaiementParams {
  /** The payment operator to use */
  operator: PaymentOperator
  /** Recipient phone number */
  recipientNumber: string
  /** Amount in FCFA */
  amount: number
  /** Unique ID from our system */
  idFromClient: string
  /** Recipient email */
  recipientEmail?: string
  /** Recipient first name */
  recipientFirstName?: string
  /** Recipient last name */
  recipientLastName?: string
  /** Destinataire field */
  destinataire?: string
  /** OTP for payment confirmation (if required) */
  otp?: string
  /** Callback URL for Intouch to notify us */
  callback?: string
  /** Partner name (required for WAVE) */
  partnerName?: string
  /** Return URL (required for WAVE) */
  returnUrl?: string
  /** Cancel URL (required for WAVE) */
  cancelUrl?: string
}

export interface IntouchCashinResponse {
  success: boolean
  data?: {
    id?: string
    transactionId?: string
    partnerTransactionId?: string
    status?: string
    message?: string
    [key: string]: unknown
  }
  error?: string
  raw?: unknown
}

export interface IntouchPaiementResponse {
  success: boolean
  data?: {
    id?: string
    transactionId?: string
    idFromClient?: string
    status?: string
    message?: string
    waveLaunchUrl?: string
    [key: string]: unknown
  }
  error?: string
  raw?: unknown
}

export interface IntouchStatusResponse {
  success: boolean
  data?: {
    transactionId?: string
    status?: string
    message?: string
    [key: string]: unknown
  }
  error?: string
  raw?: unknown
}

// ─── Helper ─────────────────────────────────────────────────────────────────────

function getBasicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${INTOUCH_USERNAME}:${INTOUCH_PASSWORD}`).toString('base64')
}

function getDefaultCallbackUrl(): string {
  return process.env.INTOUCH_CALLBACK_URL || 'https://montoit.ci/api/payments/callback'
}

// ─── CASHIN API ─────────────────────────────────────────────────────────────────

/**
 * Initiates a CASHIN transaction — pushes money to a recipient's mobile wallet.
 * Used when the tenant pays rent and the money is pushed to the owner's wallet.
 */
export async function initiateCashin(params: CashinParams): Promise<IntouchCashinResponse> {
  const {
    operator,
    recipientPhoneNumber,
    amount,
    partnerTransactionId,
    callBackUrl,
  } = params

  const serviceId = CASHIN_SERVICE_IDS[operator]
  const passwordApi = CASHIN_PASSWORDS[operator]

  if (!serviceId || !passwordApi) {
    return {
      success: false,
      error: `Opérateur non supporté pour le CASHIN: ${operator}`,
    }
  }

  const url = `${INTOUCH_BASE_URL}ANSUT13287/cashin`

  const body = {
    service_id: serviceId,
    recipient_phone_number: recipientPhoneNumber,
    amount,
    partner_id: INTOUCH_PARTNER_ID,
    partner_transaction_id: partnerTransactionId,
    login_api: INTOUCH_LOGIN_API,
    password_api: passwordApi,
    call_back_url: callBackUrl || getDefaultCallbackUrl(),
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify(body),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Intouch CASHIN error:', { status: response.status, raw })
      return {
        success: false,
        error: `Erreur Intouch CASHIN (HTTP ${response.status}): ${(raw as Record<string, unknown>)?.message || 'Erreur inconnue'}`,
        raw,
      }
    }

    return {
      success: true,
      data: raw as IntouchCashinResponse['data'],
      raw,
    }
  } catch (error) {
    console.error('Intouch CASHIN network error:', error)
    return {
      success: false,
      error: `Erreur réseau Intouch CASHIN: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    }
  }
}

// ─── PAIEMENT API ───────────────────────────────────────────────────────────────

/**
 * Initiates a PAIEMENT transaction — merchant payment from the payer's wallet.
 * Used when the tenant authorizes a payment from their mobile wallet to the platform.
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
    return {
      success: false,
      error: `Opérateur non supporté pour le PAIEMENT: ${operator}`,
    }
  }

  const loginAgent = INTOUCH_LOGIN_API
  const passwordAgent = CASHIN_PASSWORDS[operator]

  const url = `${INTOUCH_BASE_URL}touchpayapi/ANSUT13287/transaction?loginAgent=${encodeURIComponent(loginAgent)}&passwordAgent=${encodeURIComponent(passwordAgent)}`

  const additionnalInfos: Record<string, unknown> = {
    recipientEmail: recipientEmail || '',
    recipientFirstName: recipientFirstName || '',
    recipientLastName: recipientLastName || '',
    destinataire: destinataire || recipientNumber,
  }

  // Add OTP if provided
  if (otp) {
    additionnalInfos.otp = otp
  }

  // WAVE-specific additional fields
  if (operator === 'WAVE') {
    additionnalInfos.partner_name = partnerName || 'Mon Toit'
    additionnalInfos.return_url = returnUrl || getDefaultCallbackUrl()
    additionnalInfos.cancel_url = cancelUrl || getDefaultCallbackUrl()
  }

  const body = {
    idFromClient,
    additionnalInfos,
    amount,
    callback: callback || getDefaultCallbackUrl(),
    recipientNumber,
    serviceCode,
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify(body),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Intouch PAIEMENT error:', { status: response.status, raw })
      return {
        success: false,
        error: `Erreur Intouch PAIEMENT (HTTP ${response.status}): ${(raw as Record<string, unknown>)?.message || 'Erreur inconnue'}`,
        raw,
      }
    }

    return {
      success: true,
      data: raw as IntouchPaiementResponse['data'],
      raw,
    }
  } catch (error) {
    console.error('Intouch PAIEMENT network error:', error)
    return {
      success: false,
      error: `Erreur réseau Intouch PAIEMENT: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    }
  }
}

// ─── Transaction Status Check ───────────────────────────────────────────────────

/**
 * Checks the status of a transaction using its partner_transaction_id.
 * Note: Intouch may not have a dedicated status endpoint; this is a placeholder
 * that could be adapted based on available API documentation.
 */
export async function checkTransactionStatus(
  transactionId: string
): Promise<IntouchStatusResponse> {
  const url = `${INTOUCH_BASE_URL}touchpayapi/ANSUT13287/transaction/${encodeURIComponent(transactionId)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: getBasicAuthHeader(),
      },
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        success: false,
        error: `Erreur vérification statut (HTTP ${response.status})`,
        raw,
      }
    }

    return {
      success: true,
      data: raw as IntouchStatusResponse['data'],
      raw,
    }
  } catch (error) {
    console.error('Intouch status check network error:', error)
    return {
      success: false,
      error: `Erreur réseau vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    }
  }
}

// ─── Utility ────────────────────────────────────────────────────────────────────

/**
 * Generates a unique partner_transaction_id for Intouch API calls.
 * Format: MT-{timestamp}-{random}
 */
export function generatePartnerTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MT-${timestamp}-${random}`
}

/**
 * Maps our PaymentMethod enum values to Intouch operator names.
 */
export function methodToOperator(method: string): PaymentOperator {
  const mapping: Record<string, PaymentOperator> = {
    ORANGE_MONEY: 'ORANGE_MONEY',
    MTN_MOMO: 'MTN_MOMO',
    MOOV_MONEY: 'MOOV_MONEY',
    WAVE: 'WAVE',
  }
  return mapping[method] || 'ORANGE_MONEY'
}

/**
 * Returns a human-readable name for the operator (in French).
 */
export function getOperatorLabel(method: string): string {
  const labels: Record<string, string> = {
    ORANGE_MONEY: 'Orange Money',
    MTN_MOMO: 'MTN MoMo',
    MOOV_MONEY: 'Moov Money',
    WAVE: 'Wave',
  }
  return labels[method] || method
}
