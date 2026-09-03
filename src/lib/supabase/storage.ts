import { getSupabaseAdminClient } from './admin'

export const BUCKETS = {
  AVATARS: 'avatars',
  PROPERTY_IMAGES: 'property-images',
  PROPERTY_VIDEOS: 'property-videos',
  PROPERTY_DOCUMENTS: 'property-documents',
  OWNER_DOCUMENTS: 'owner-documents',
  RENTAL_DOCUMENTS: 'rental-documents',
  MAINTENANCE_IMAGES: 'maintenance-images',
  LEASE_DOCUMENTS: 'lease-documents',
  MESSAGE_ATTACHMENTS: 'message-attachments',
  MANDAT_DOCUMENTS: 'mandat-documents',
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

const PUBLIC_BUCKETS = new Set<BucketName>([
  BUCKETS.AVATARS,
  BUCKETS.PROPERTY_IMAGES,
  BUCKETS.PROPERTY_VIDEOS,
])

export async function ensureBucketExists(bucket: BucketName): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.error('[ensureBucketExists] listBuckets error:', listError)
    throw listError
  }
  if (buckets?.some((b) => b.name === bucket)) {
    console.log('[ensureBucketExists] bucket already exists:', bucket)
    return
  }

  console.log('[ensureBucketExists] creating bucket:', bucket)
  const { error } = await supabase.storage.createBucket(bucket, {
    // User documents must never become public merely because a bucket was
    // created lazily. Public access is limited to catalogue media.
    public: PUBLIC_BUCKETS.has(bucket),
    fileSizeLimit: 52428800,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip',
    ],
  })
  if (error) {
    console.error('[ensureBucketExists] createBucket error:', error)
    throw error
  }
  console.log('[ensureBucketExists] bucket created:', bucket)
}

export async function uploadFromBase64(
  bucket: BucketName,
  base64Data: string,
  filePath: string
): Promise<string> {
  const base64Payload = base64Data.split(',')[1] || base64Data

  let binaryStr: string
  try {
    binaryStr = atob(base64Payload)
  } catch (e) {
    console.error('[uploadFromBase64] atob failed:', e)
    throw e
  }
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  await ensureBucketExists(bucket)

  const { error } = await getSupabaseAdminClient()
    .storage
    .from(bucket)
    .upload(filePath, bytes, {
      contentType: guessContentType(filePath),
      upsert: true,
    })

  if (error) {
    console.error('[uploadFromBase64] upload error:', error)
    throw error
  }

  const url = getPublicUrl(bucket, filePath)
  return url
}

export async function deleteFromStorage(bucket: BucketName | string, filePath: string): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .storage
    .from(bucket)
    .remove([filePath])

  if (error) {
    throw error
  }
}

export function getPublicUrl(bucket: BucketName, filePath: string): string {
  const { data } = getSupabaseAdminClient()
    .storage
    .from(bucket)
    .getPublicUrl(filePath)

  return data.publicUrl
}

export function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
  return match ? match[1] : null
}

export function extractBucketAndPath(publicUrl: string): { bucket: string; path: string } | null {
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
  if (!match) return null
  return { bucket: match[1], path: match[2] }
}

export function isBase64DataUrl(value: string): boolean {
  return value.startsWith('data:')
}

export function guessExtensionFromMime(base64DataUrl: string): string {
  const match = base64DataUrl.match(/^data:([^;]+);/)
  if (!match) return 'bin'
  const mime = match[1]
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-msvideo': 'avi',
    'application/pdf': 'pdf',
  }
  return map[mime] || 'bin'
}

function guessContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'pdf':
      return 'application/pdf'
    case 'mp4':
      return 'video/mp4'
    case 'mov':
      return 'video/quicktime'
    case 'webm':
      return 'video/webm'
    case 'avi':
      return 'video/x-msvideo'
    default:
      return 'application/octet-stream'
  }
}
