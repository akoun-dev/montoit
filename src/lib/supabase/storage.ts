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
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

async function ensureBucketExists(bucket: BucketName): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some((b) => b.name === bucket)) return

  await supabase.storage.createBucket(bucket, {
    public: true,
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
}

export async function uploadFromBase64(
  bucket: BucketName,
  base64Data: string,
  filePath: string
): Promise<string> {
  const base64Payload = base64Data.split(',')[1] || base64Data
  const binaryStr = atob(base64Payload)
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
    throw error
  }

  return getPublicUrl(bucket, filePath)
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
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-msvideo': 'avi',
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
