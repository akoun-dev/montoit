const RESEND_API_KEY = import.meta.env['RESEND_API_KEY'] || import.meta.env['VITE_RESEND_API_KEY'] || '';
const RESEND_API_ENDPOINT = import.meta.env['RESEND_API_URL'] || 'https://api.resend.com/emails';

export interface ResendEmailPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
}

async function sendEmail(payload: ResendEmailPayload) {
  if (!RESEND_API_KEY) {
    throw new Error('Resend API key is not configured');
  }

  const response = await fetch(RESEND_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body}`);
  }

  return response.json();
}

export const resend = RESEND_API_KEY
  ? {
      emails: {
        send: sendEmail,
      },
    }
  : null;

export default { resend };
