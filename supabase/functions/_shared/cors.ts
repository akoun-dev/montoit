const ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://mon-toit.ci',
  'https://www.mon-toit.ci'
];
export function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  };
}
export function handleCors(req) {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '';
    return new Response('ok', {
      headers: corsHeaders(origin)
    });
  }
  return null;
}
