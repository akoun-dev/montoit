import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// POST /api/visits/remind — Agency-triggered reminder for its own upcoming
// (ACCEPTED) visits. The "Envoyer rappels" button in the agency dashboard
// previously called no route at all; this sends an immediate reminder to
// each visit's tenant instead of only relying on the scheduled J-1 job.
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId
    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()
    const role = profile?.active_role || profile?.role
    if (role !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: mandats } = await admin
      .from('mandats')
      .select('property_id')
      .eq('agency_id', userId)
      .eq('status', 'ACTIVE')
    const propertyIds = [...new Set((mandats ?? []).map((m: any) => m.property_id).filter(Boolean))]
    if (propertyIds.length === 0) {
      return NextResponse.json({ remindedCount: 0 })
    }

    const now = new Date()
    const { data: visits } = await admin
      .from('visit_requests')
      .select('id, tenant_id, requested_date, time_slot, property_id')
      .in('property_id', propertyIds)
      .eq('status', 'ACCEPTED')
      .gte('requested_date', now.toISOString())

    if (!visits || visits.length === 0) {
      return NextResponse.json({ remindedCount: 0 })
    }

    const { data: props } = await admin.from('properties').select('id, title').in('id', propertyIds)
    const propMap = new Map((props ?? []).map((p: any) => [p.id, p.title]))

    const tenantIds = [...new Set(visits.map((v: any) => v.tenant_id))]
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('user_id, visit_reminders')
      .in('user_id', tenantIds)
    const prefMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p.visit_reminders]))

    let notified = 0
    for (const visit of visits as any[]) {
      // Default to enabled when the tenant has no preferences row yet.
      if (prefMap.get(visit.tenant_id) === false) continue
      const propertyTitle = propMap.get(visit.property_id) || 'ce bien'
      const dateLabel = new Date(visit.requested_date).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
      await notify({
        userId: visit.tenant_id,
        type: 'VISIT_REMINDER',
        title: 'Rappel de visite',
        message: `Rappel : votre visite pour "${propertyTitle}" est prévue le ${dateLabel}${visit.time_slot ? ` (${visit.time_slot})` : ''}.`,
        actionUrl: 'my-visits',
        entityId: visit.id,
      })
      notified++
    }

    return NextResponse.json({ remindedCount: notified })
  } catch (error) {
    console.error('Visit remind POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
