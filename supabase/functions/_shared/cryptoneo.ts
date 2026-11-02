/**
 * CRYPTONEO / ANSUT e-signature — runtime DENO (Edge Functions).
 * ============================================================================
 * DAT-004 (déduplication lib ↔ Edge Functions) : la logique PURE (codes
 * succès, normalisation du genre, shapes API) vit dans
 * `./cryptoneo-contract.ts` — source de vérité partagée, runtime-agnostique
 * (aucune dépendance Deno / Node / npm). Ce module n'ajoute que la partie
 * runtime Deno : secrets via `Deno.env`, cache du token JWT, fetch
 * authentifié avec retry 401.
 *
 * Miroir Node/Next.js : `src/lib/cryptoneo.ts` (importe le même contrat et
 * ne conserve que `process.env` + cache token). Contrat de parité et tests
 * manuels : docs/DEDUP-LIB-EDGE-FUNCTIONS.md.
 *
 * ⚠️ Toute évolution du contrat (codes succès, normalisation, shapes) se fait
 * dans `./cryptoneo-contract.ts` puis est héritée par les deux runtimes.
 */

import { CRYPTONEO_TOKEN_TTL_MS } from './cryptoneo-contract.ts'

// ─── Contrat partagé (source de vérité — ré-export) ─────────────────────────
export {
  CRYPTONEO_SUCCESS_CODES,
  isCryptoneoSuccess,
  normalizeCryptoneoGender,
} from './cryptoneo-contract.ts'

export type {
  CryptoneoAuthResponse,
  CryptoneoCertificatResponse,
  CryptoneoOtpResponse,
  CryptoneoSignResponse,
  CryptoneoSignedFileResponse,
  CryptoneoUser,
  CryptoneoUsersResponse,
  CryptoneoVerifyResponse,
  SignRequestItem,
} from './cryptoneo-contract.ts'

// ─── Configuration (runtime Deno uniquement) ────────────────────────────────

const CRYPTONEO_API_URL = Deno.env.get("CRYPTONEO_API_URL") || "https://ansut.cryptoneoplatforms.com/esignaturedemo";
const APP_KEY = Deno.env.get("CRYPTONEO_APP_KEY") || "";
const APP_SECRET = Deno.env.get("CRYPTONEO_APP_SECRET") || "";

interface CachedToken {
  token: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null;

// ─── Token Management ───────────────────────────────────────────────────────

export async function getCryptoneoToken() {
  console.log('[cryptoneo] getCryptoneoToken called');
  console.log('[cryptoneo] CRYPTONEO_API_URL:', CRYPTONEO_API_URL);
  console.log('[cryptoneo] APP_KEY:', APP_KEY ? 'set' : 'not set');
  console.log('[cryptoneo] APP_SECRET:', APP_SECRET ? 'set' : 'not set');
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    console.log('[cryptoneo] Returning cached token');
    return cachedToken.token;
  }
  const url = `${CRYPTONEO_API_URL}/user/auth`;
  console.log('[cryptoneo] Fetching token from:', url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      appKey: APP_KEY,
      appSecret: APP_SECRET
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(()=>"");
    console.error('[cryptoneo] Auth failed:', res.status, text);
    throw new Error(`CRYPTONEO auth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const token = data?.data?.token;
  if (!token) {
    console.error('[cryptoneo] No token in response:', JSON.stringify(data));
    throw new Error(`CRYPTONEO auth returned no token: ${JSON.stringify(data)}`);
  }
  cachedToken = {
    token,
    expiresAt: Date.now() + CRYPTONEO_TOKEN_TTL_MS
  };
  console.log('[cryptoneo] Token obtained successfully, expires at:', new Date(cachedToken.expiresAt).toISOString());
  return token;
}

export function clearCryptoneoToken() {
  cachedToken = null;
}

/**
 * CRYPTONEO renvoie des erreurs métier avec HTTP 200 + statusCode dans le body.
 * Vérifie les deux et retourne { ok, data, error }.
 */
export async function cryptoneoFetchJson(path, options = {}) {
  const res = await cryptoneoFetch(path, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch  {
    data = {};
  }
  // Succès : HTTP ok ET (pas de code métier OU code reconnu succès)
  const isSuccess = res.ok && isCryptoneoSuccess(data);
  if (!isSuccess) {
    const msg = data?.statusMessage || data?.message || `CRYPTONEO error: ${text}`;
    return {
      ok: false,
      data,
      error: msg
    };
  }
  return {
    ok: true,
    data
  };
}

// ─── Authenticated Fetch Helper ─────────────────────────────────────────────

export async function cryptoneoFetch(path, options = {}, retry = true) {
  const token = await getCryptoneoToken();
  const url = `${CRYPTONEO_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
  if (res.status === 401 && retry) {
    clearCryptoneoToken();
    return cryptoneoFetch(path, options, false);
  }
  return res;
}
