// Minimal ANSUT SMS/Email client for Edge Functions — mirrors
// src/lib/ansut-messaging.ts (Next.js runtime), ported to Deno for
// recipients with no platform account (e.g. agency_agents) who can't
// receive an in-app notify().

const ANSUT_BASE_URL = (Deno.env.get('ANSUT_API_BASE_URL') || '').trim().replace(/\/+$/, '')
const ANSUT_USERNAME = Deno.env.get('ANSUT_API_USERNAME') || ''
const ANSUT_PASSWORD = Deno.env.get('ANSUT_API_PASSWORD') || ''
const ANSUT_SMS_SENDER = Deno.env.get('ANSUT_SMS_SENDER') || 'ANSUT'

function formatPhoneForAnsut(phone: string): string {
  let cleaned = phone.replace(/[\s-]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1)
  if (cleaned.startsWith('0')) cleaned = '225' + cleaned
  if (!cleaned.startsWith('225')) cleaned = '225' + cleaned
  return cleaned
}

export async function sendSms(params: { to: string; text: string }): Promise<void> {
  if (!ANSUT_BASE_URL) {
    console.warn('[ANSUT SMS] ANSUT_API_BASE_URL not configured, skipping SMS send')
    return
  }
  try {
    await fetch(`${ANSUT_BASE_URL}/SendSMS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: formatPhoneForAnsut(params.to),
        from: ANSUT_SMS_SENDER,
        text: params.text,
        username: ANSUT_USERNAME,
        password: ANSUT_PASSWORD,
      }),
    })
  } catch (error) {
    console.error('[ANSUT SMS] Network error:', error)
  }
}

export async function sendEmail(params: { to: string; subject: string; content: string; isHtml?: boolean }): Promise<void> {
  if (!ANSUT_BASE_URL) {
    console.warn('[ANSUT Email] ANSUT_API_BASE_URL not configured, skipping Email send')
    return
  }
  try {
    await fetch(`${ANSUT_BASE_URL}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.to,
        from: ANSUT_SMS_SENDER,
        content: params.content,
        subject: params.subject,
        username: ANSUT_USERNAME,
        password: ANSUT_PASSWORD,
        channel: 'Email',
        ishtml: params.isHtml ?? true,
      }),
    })
  } catch (error) {
    console.error('[ANSUT Email] Network error:', error)
  }
}
