const DEFAULT_ALLOWED_ORIGINS = [
  'https://mon-toit.ansut.ci',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'apikey',
  'X-Client-Info',
].join(', ');

const DEFAULT_ALLOWED_METHODS = 'POST, OPTIONS';

const normalizeList = (value: string | null) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (items: string[]) => Array.from(new Set(items));

export const getAllowedOrigins = (): string[] => {
  const envOrigins = normalizeList(Deno.env.get('ALLOWED_ORIGINS'));
  if (envOrigins.includes('*')) {
    return ['*'];
  }
  return unique([...envOrigins, ...DEFAULT_ALLOWED_ORIGINS]);
};

export const resolveCorsOrigin = (origin: string | null, allowedOrigins: string[]): string => {
  if (allowedOrigins.includes('*')) {
    return '*';
  }

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  return allowedOrigins[0] || '*';
};

export const getCorsHeaders = (
  req: Request,
  overrides?: {
    allowMethods?: string;
    allowHeaders?: string;
  }
): Record<string, string> => {
  const origin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  return {
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin, allowedOrigins),
    'Access-Control-Allow-Methods': overrides?.allowMethods || DEFAULT_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': overrides?.allowHeaders || DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
  };
};
