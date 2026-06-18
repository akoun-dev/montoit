const LITERT_SERVER_URL = process.env.LITERT_SERVER_URL || 'http://localhost:9379'
const LITERT_MODEL = process.env.LITERT_MODEL || 'suta-gemma3'

export interface LiteRTServerStatus {
  available: boolean
  model: string
  backend: string
}

export async function checkLiteRTHealth(): Promise<LiteRTServerStatus | null> {
  try {
    const res = await fetch(`${LITERT_SERVER_URL}/v1/models`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      available: true,
      model: data?.data?.[0]?.id || LITERT_MODEL,
      backend: 'litert',
    }
  } catch {
    return null
  }
}

export async function callLiteRT(
  messages: Array<{ role: string; content: string }>,
  options?: { stream?: boolean },
): Promise<Response> {
  return fetch(`${LITERT_SERVER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LITERT_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: options?.stream ?? false,
    }),
    signal: AbortSignal.timeout(120000),
  })
}
