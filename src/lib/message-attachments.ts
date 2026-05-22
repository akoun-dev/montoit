import { uploadFromBase64, BUCKETS } from '@/lib/supabase/storage'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AttachmentInput {
  fileName: string
  fileType: string
  fileSize: number
  base64: string
}

export interface AttachmentOutput {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
}

interface AttachmentRow {
  id: string
  message_id: string
  file_name: string
  file_type: string
  file_size: number
  url: string
  created_at: string
}

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function uploadAttachments(
  attachments: AttachmentInput[],
  messageId: string
): Promise<AttachmentOutput[]> {
  if (!attachments || attachments.length === 0) return []

  const supabase = getSupabaseAdminClient()
  const results: AttachmentOutput[] = []

  for (const att of attachments) {
    const attId = generateId()
    const ext = att.fileName.split('.').pop() || 'bin'
    const storagePath = `${messageId}/${attId}.${ext}`

    const url = await uploadFromBase64(BUCKETS.MESSAGE_ATTACHMENTS, att.base64, storagePath)

    await supabase.from('message_attachments').insert({
      id: attId,
      message_id: messageId,
      file_name: att.fileName,
      file_type: att.fileType,
      file_size: att.fileSize,
      url,
    } as any)

    results.push({
      id: attId,
      fileName: att.fileName,
      fileType: att.fileType,
      fileSize: att.fileSize,
      url,
    })
  }

  return results
}

export async function getAttachmentsForMessages(
  messageIds: string[]
): Promise<Map<string, AttachmentOutput[]>> {
  if (messageIds.length === 0) return new Map()

  const supabase = getSupabaseAdminClient()
  const { data: rows } = await supabase
    .from('message_attachments')
    .select('*')
    .in('message_id', messageIds)
    .order('created_at', { ascending: true })

  const map = new Map<string, AttachmentOutput[]>()
  for (const row of (rows ?? []) as AttachmentRow[]) {
    const existing = map.get(row.message_id) || []
    existing.push({
      id: row.id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      url: row.url,
    })
    map.set(row.message_id, existing)
  }
  return map
}
