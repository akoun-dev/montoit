import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const DEFAULT_TC_VALIDATION_HOURS = 48

/**
 * Opens (or refreshes) the validation_slas tracking row for a dossier that
 * was just submitted to the TC review queue. Without this, the SLA
 * dashboard and overdue-detection queries never had anything to read —
 * nothing in the app ever inserted a row here outside of seed data.
 */
export async function openValidationSla(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  entityType: 'RENTAL_FILE' | 'OWNER_PROFILE' | 'AGENCY',
  entityId: string,
) {
  const { data: setting } = await (admin as any)
    .from('platform_settings')
    .select('value')
    .eq('key', 'admin_sla')
    .maybeSingle()

  let hours = DEFAULT_TC_VALIDATION_HOURS
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value)
      if (typeof parsed?.tcValidationHours === 'number' && parsed.tcValidationHours > 0) {
        hours = parsed.tcValidationHours
      }
    } catch { /* keep default */ }
  }

  const now = new Date()
  const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000)

  const { data: existing } = await (admin as any)
    .from('validation_slas')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('completed_at', null)
    .maybeSingle()

  if (existing) {
    await (admin as any)
      .from('validation_slas')
      .update({ submitted_at: now.toISOString(), deadline_at: deadline.toISOString(), is_overdue: false })
      .eq('id', existing.id)
    return
  }

  await (admin as any).from('validation_slas').insert({
    id: crypto.randomUUID(),
    entity_type: entityType,
    entity_id: entityId,
    submitted_at: now.toISOString(),
    deadline_at: deadline.toISOString(),
    is_overdue: false,
  })
}
