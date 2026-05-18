import { getSupabaseAdminClient } from './admin'

export const BUCKETS = {
  AVATARS: 'avatars',
  PROPERTY_IMAGES: 'property-images',
  PROPERTY_DOCUMENTS: 'property-documents',
  OWNER_DOCUMENTS: 'owner-documents',
  RENTAL_DOCUMENTS: 'rental-documents',
  MAINTENANCE_IMAGES: 'maintenance-images',
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

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
    default:
      return 'application/octet-stream'
  }
}
