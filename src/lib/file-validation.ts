/**
 * SEC-009 — Validation serveur des fichiers uploadés.
 *
 * Deux familles de contrôles :
 *  1. Magic bytes : on ne fait PAS confiance au MIME déclaré par le client ni
 *     à l'extension du nom de fichier — on renifle les premiers octets du
 *     contenu réel (JPEG FF D8 FF, PNG 89 50 4E 47, PDF %PDF, WEBP RIFF…WEBP).
 *  2. Taille maximale (10 Mo par défaut, surchargeable par appel).
 *
 * Utilisable sur les uploads base64 / data-URL JSON (aucune route du projet
 * n'utilise FormData) et sur les extensions de fichiers pour les URLs
 * d'upload signées (le contenu n'est alors pas visible côté serveur).
 */

export type SniffedFileType = 'jpeg' | 'png' | 'pdf' | 'webp'

export type UploadValidationErrorCode = 'EMPTY' | 'TOO_LARGE' | 'INVALID_TYPE'

export type UploadValidationResult =
  | { ok: true; type: SniffedFileType; sizeBytes: number }
  | { ok: false; code: UploadValidationErrorCode; error: string }

/** Taille d'upload par défaut : 10 Mo. */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

/** Nombre d'octets nécessaires au reniflement (8 pour PNG / RIFF+WEBP). */
const SNIFF_WINDOW_BASE64_CHARS = 512

const STRICT_MAGIC_SIGNATURES: Array<{ type: SniffedFileType; bytes: readonly number[] }> = [
  { type: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // %PDF (tolère un BOM UTF-8 éventuel devant)
  { type: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
]

const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46] // "RIFF"
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50] // "WEBP" (offset 8 dans le conteneur RIFF)

function stripDataUrlPrefix(input: string): string {
  const commaIndex = input.indexOf(',')
  if (input.startsWith('data:') && commaIndex !== -1) {
    return input.slice(commaIndex + 1)
  }
  return input
}

/** Taille décodée (octets) d'un payload base64, sans le décoder intégralement. */
export function getBase64SizeBytes(input: string): number {
  const payload = stripDataUrlPrefix(input).replace(/\s/g, '')
  if (!payload) return 0
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

/**
 * Renifle le type réel d'un payload base64 (data-URL acceptée) en décodant
 * uniquement les premiers octets. Retourne null si aucun format connu ne matche.
 */
export function sniffBase64FileType(input: string): SniffedFileType | null {
  const payload = stripDataUrlPrefix(input).replace(/\s/g, '')
  if (!payload) return null

  const window = payload.slice(0, SNIFF_WINDOW_BASE64_CHARS)
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(Buffer.from(window, 'base64'))
  } catch {
    return null
  }

  return sniffFileType(bytes)
}

/** Renifle le type réel d'octets bruts. Retourne null si inconnu. */
export function sniffFileType(bytes: Uint8Array): SniffedFileType | null {
  if (!bytes || bytes.length === 0) return null

  for (const signature of STRICT_MAGIC_SIGNATURES) {
    if (matchesAt(bytes, 0, signature.bytes)) return signature.type
  }

  // WEBP : conteneur RIFF avec "WEBP" à l'offset 8
  if (matchesAt(bytes, 0, RIFF_MAGIC) && matchesAt(bytes, 8, WEBP_MAGIC)) {
    return 'webp'
  }

  return null
}

function matchesAt(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
  if (bytes.length < offset + expected.length) return false
  return expected.every((byte, i) => bytes[offset + i] === byte)
}

/**
 * Valide un upload base64/data-URL : contenu présent, taille ≤ maxSizeBytes,
 * magic bytes correspondant à l'un des types autorisés.
 */
export function validateBase64Upload(
  input: string | undefined | null,
  options: {
    allowed: readonly SniffedFileType[]
    maxSizeBytes?: number
  },
): UploadValidationResult {
  const maxSizeBytes = options.maxSizeBytes ?? MAX_UPLOAD_SIZE_BYTES

  if (!input || !input.trim()) {
    return { ok: false, code: 'EMPTY', error: 'Fichier manquant ou vide' }
  }

  const sizeBytes = getBase64SizeBytes(input)
  if (sizeBytes === 0) {
    return { ok: false, code: 'EMPTY', error: 'Fichier manquant ou vide' }
  }
  if (sizeBytes > maxSizeBytes) {
    return {
      ok: false,
      code: 'TOO_LARGE',
      error: `Fichier trop volumineux (max ${Math.floor(maxSizeBytes / (1024 * 1024))} Mo)`,
    }
  }

  const sniffed = sniffBase64FileType(input)
  if (!sniffed || !options.allowed.includes(sniffed)) {
    const allowedLabels = options.allowed
      .map((t) => ({ jpeg: 'JPEG', png: 'PNG', pdf: 'PDF', webp: 'WEBP' })[t])
      .join(', ')
    return {
      ok: false,
      code: 'INVALID_TYPE',
      error: `Type de fichier non autorisé ou contenu invalide (acceptés : ${allowedLabels})`,
    }
  }

  return { ok: true, type: sniffed, sizeBytes }
}

/** Code HTTP recommandé pour un échec de validation d'upload. */
export function uploadValidationHttpStatus(result: Extract<UploadValidationResult, { ok: false }>): number {
  switch (result.code) {
    case 'TOO_LARGE':
      return 413
    case 'EMPTY':
      return 400
    default:
      return 415
  }
}

// ── Extensions de noms de fichiers (uploads signés : contenu non visible) ──

/** Documents/images acceptés pour les URLs d'upload signées. */
export const ALLOWED_UPLOAD_EXTENSIONS: readonly string[] = [
  'jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip',
]

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/**
 * Valide l'extension d'un nom de fichier fourni par le client (upload signé).
 * Un nom sans extension ou avec une extension hors whitelist est rejeté.
 */
export function isAllowedFileName(
  fileName: string | undefined | null,
  allowed: readonly string[] = ALLOWED_UPLOAD_EXTENSIONS,
): boolean {
  if (!fileName || !fileName.trim()) return false
  const ext = getFileExtension(fileName.trim())
  return ext.length > 0 && allowed.includes(ext)
}
