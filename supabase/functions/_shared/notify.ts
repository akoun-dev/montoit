interface NotifyParams {
  userId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  entityId?: string
}

export async function notify(supabase: any, params: NotifyParams): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl || null,
    entity_id: params.entityId || null,
  })
  if (error) {
    console.error('Failed to create notification:', error)
  }
}

export async function notifyMany(supabase: any, paramsList: NotifyParams[]): Promise<void> {
  const rows = paramsList.map((p) => ({
    id: crypto.randomUUID(),
    user_id: p.userId,
    type: p.type,
    title: p.title,
    message: p.message,
    action_url: p.actionUrl || null,
    entity_id: p.entityId || null,
  }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) {
    console.error('Failed to create notifications:', error)
  }
}
