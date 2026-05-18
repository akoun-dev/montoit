const INTOUCH_BASE_URL = Deno.env.get('INTOUCH_BASE_URL') || 'https://apidist.gutouch.net/apidist/sec/'
const INTOUCH_USERNAME = Deno.env.get('INTOUCH_USERNAME') || ''
const INTOUCH_PASSWORD = Deno.env.get('INTOUCH_PASSWORD') || ''
const INTOUCH_PARTNER_ID = Deno.env.get('INTOUCH_PARTNER_ID') || 'CI300373'
const INTOUCH_LOGIN_API = Deno.env.get('INTOUCH_LOGIN_API') || '07084598370'

const CASHIN_PASSWORDS: Record<string, string> = {
  ORANGE_MONEY: Deno.env.get('INTOUCH_CASHIN_OM_PASSWORD') || '',
  MTN_MOMO: Deno.env.get('INTOUCH_CASHIN_MTN_PASSWORD') || '',
  MOOV_MONEY: Deno.env.get('INTOUCH_CASHIN_MOOV_PASSWORD') || '',
  WAVE: Deno.env.get('INTOUCH_CASHIN_WAVE_PASSWORD') || '',
}

const CASHIN_SERVICE_IDS: Record<string, string> = {
  ORANGE_MONEY: 'CASHINOMCIPART2',
  MTN_MOMO: 'CASHINMTNPART2',
  MOOV_MONEY: 'CASHINMOOVPART2',
  WAVE: 'CI_CASHIN_WAVE_PART',
}

export type PaymentOperator = 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'

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

function getBasicAuthHeader(): string {
  const encoded = btoa(`${INTOUCH_USERNAME}:${INTOUCH_PASSWORD}`)
  return `Basic ${encoded}`
}

function getDefaultCallbackUrl(): string {
  return Deno.env.get('INTOUCH_CALLBACK_URL') || 'https://montoit.ci/api/payments/callback'
}

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
