const CRYPTONEO_API_URL = Deno.env.get("CRYPTONEO_API_URL") || "https://ansut.cryptoneoplatforms.com/esignaturedemo";
const APP_KEY = Deno.env.get("CRYPTONEO_APP_KEY") || "";
const APP_SECRET = Deno.env.get("CRYPTONEO_APP_SECRET") || "";
const TOKEN_TTL_MS = 30 * 60 * 1000;
let cachedToken = null;
export async function getCryptoneoToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const url = `${CRYPTONEO_API_URL}/user/auth`;
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
    expiresAt: Date.now() + TOKEN_TTL_MS
  };
  return token;
}
export function clearCryptoneoToken() {
  cachedToken = null;
}
/**
 * Normalise le genre pour CRYPTONEO qui attend "Homme" ou "Femme".
 */ export function normalizeCryptoneoGender(gender) {
  if (!gender) return 'Homme';
  const g = gender.toLowerCase().trim();
  if (g === 'homme' || g === 'm' || g === 'male' || g === 'masculin') return 'Homme';
  if (g === 'femme' || g === 'f' || g === 'female' || g === 'feminin') return 'Femme';
  return 'Homme';
}
/**
 * Codes succès CRYPTONEO : 200, 7000 (liste d'utilisateurs), etc.
 * Codes erreur : >= 8000 (8006 = paramètres invalides).
 */ const CRYPTONEO_SUCCESS_CODES = new Set([
  200,
  7000,
  7002,
  7003,
  7004
]);
/** Vérifie si un code de retour CRYPTONEO indique un succès. */ export function isCryptoneoSuccess(data) {
  const code = data.code ?? data.statusCode;
  // 0 est un code erreur côté CRYPTONEO, on ne peut pas utiliser !code
  return code === undefined || code === null || CRYPTONEO_SUCCESS_CODES.has(code);
}
/**
 * CRYPTONEO renvoie des erreurs métier avec HTTP 200 + statusCode dans le body.
 * Vérifie les deux et retourne { ok, data, error }.
 */ export async function cryptoneoFetchJson(path, options = {}) {
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
