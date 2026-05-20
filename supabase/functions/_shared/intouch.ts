const INTOUCH_BASE_URL = Deno.env.get('INTOUCH_BASE_URL') || 'https://apidist.gutouch.net/apidist/sec/'
const INTOUCH_USERNAME = Deno.env.get('INTOUCH_USERNAME') || ''
const INTOUCH_PASSWORD = Deno.env.get('INTOUCH_PASSWORD') || ''
const INTOUCH_PARTNER_ID = Deno.env.get('INTOUCH_PARTNER_ID') || 'CI300373'
const INTOUCH_LOGIN_API = Deno.env.get('INTOUCH_LOGIN_API') || '07084598370'

// Per-operator passwords for CASHIN
const CASHIN_PASSWORDS: Record<string, string> = {
  ORANGE_MONEY: Deno.env.get('INTOUCH_CASHIN_OM_PASSWORD') || '',
  MTN_MOMO: Deno.env.get('INTOUCH_CASHIN_MTN_PASSWORD') || '',
  MOOV_MONEY: Deno.env.get('INTOUCH_CASHIN_MOOV_PASSWORD') || '',
  WAVE: Deno.env.get('INTOUCH_CASHIN_WAVE_PASSWORD') || '',
}

// Password for PAIEMENT (separate from CASHIN — single shared password for all operators)
const PAIEMENT_PASSWORD = Deno.env.get('INTOUCH_PAIEMENT_PASSWORD') || ''

// Password for GET BALANCE endpoint
const BALANCE_PASSWORD = Deno.env.get('INTOUCH_BALANCE_PASSWORD') || ''

// Password for TRANSFER/49 Paiement Immédiat (sender wallet password)
const PAIEMENT_IMMEDIAT_PASSWORD = Deno.env.get('INTOUCH_PAIEMENT_IMMEDIAT_PASSWORD') || ''

const CASHIN_SERVICE_IDS: Record<string, string> = {
  ORANGE_MONEY: 'CASHINOMCIPART2',
  MTN_MOMO: 'CASHINMTNPART2',
  MOOV_MONEY: 'CASHINMOOVPART2',
  WAVE: 'CI_CASHIN_WAVE_PART',
}

const PAIEMENT_SERVICE_CODES: Record<string, string> = {
  ORANGE_MONEY: 'PAIEMENTMARCHANDOMPAYCIDIRECT',
  MTN_MOMO: 'PAIEMENTMARCHAND_MTN_CI',
  MOOV_MONEY: 'PAIEMENTMARCHAND_MOOV_CI',
  WAVE: 'CI_PAIEMENTWAVE_TP',
}

export type PaymentOperator = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

// ─── CASHIN Types ──────────────────────────────────────────────────────────────

export interface CashinParams {
  operator: PaymentOperator
  recipientPhoneNumber: string
  amount: number
  partnerTransactionId: string
  callBackUrl?: string
}

export interface IntouchCashinResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  raw?: unknown
}

// ─── PAIEMENT Types ────────────────────────────────────────────────────────────

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

function getDefaultCallbackUrl(): string {
  return Deno.env.get('INTOUCH_CALLBACK_URL') || 'https://montoit.ci/api/payments/callback'
}

// ─── CASHIN ────────────────────────────────────────────────────────────────────

export async function initiateCashin(params: CashinParams): Promise<IntouchCashinResponse> {
  const { operator, recipientPhoneNumber, amount, partnerTransactionId, callBackUrl } = params
  const serviceId = CASHIN_SERVICE_IDS[operator]
  const passwordApi = CASHIN_PASSWORDS[operator]

  if (!serviceId || !passwordApi) {
    return { success: false, error: `Opérateur non supporté: ${operator}` }
  }

  try {
    const response = await fetch(`${INTOUCH_BASE_URL}ANSUT13287/cashin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify({
        service_id: serviceId,
        recipient_phone_number: recipientPhoneNumber,
        amount,
        partner_id: INTOUCH_PARTNER_ID,
        partner_transaction_id: partnerTransactionId,
        login_api: INTOUCH_LOGIN_API,
        password_api: passwordApi,
        call_back_url: callBackUrl || getDefaultCallbackUrl(),
      }),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return { success: false, error: `Intouch CASHIN error (${response.status}): ${raw?.message || 'Erreur inconnue'}`, raw }
    }

    return { success: true, data: raw as Record<string, unknown>, raw }
  } catch (error) {
    return { success: false, error: `Intouch CASHIN network error: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }
  }
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

  const loginAgent = INTOUCH_LOGIN_API
  const passwordAgent = PAIEMENT_PASSWORD || CASHIN_PASSWORDS[operator]
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
    additionnalInfos.return_url = returnUrl || getDefaultCallbackUrl()
    additionnalInfos.cancel_url = cancelUrl || getDefaultCallbackUrl()
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
  const loginAgent = INTOUCH_LOGIN_API
  const passwordAgent = PAIEMENT_PASSWORD || INTOUCH_LOGIN_API
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
  const loginApi = INTOUCH_LOGIN_API
  const passwordApi = BALANCE_PASSWORD || CASHIN_PASSWORDS.ORANGE_MONEY || INTOUCH_LOGIN_API

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
