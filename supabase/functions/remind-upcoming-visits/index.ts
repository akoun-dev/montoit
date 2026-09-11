import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'
import { sendEmail, sendSms } from '../_shared/ansut-messaging.ts'

// J-1 reminder for accepted visits — notification_preferences.visit_reminders
// existed but nothing ever triggered a reminder from it.
serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const authHeader = req.headers.get('authorization') || ''
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = getSupabaseAdminClient()

    const now = new Date()
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

    // Atomic claim, same pattern as the other reminder jobs: only visits
    // this call actually flips reminder_sent_at on are returned.
    const { data: visits, error } = await supabase
      .from('visit_requests')
      .update({ reminder_sent_at: now.toISOString() })
      .eq('status', 'ACCEPTED')
      .gte('requested_date', tomorrowStart.toISOString())
      .lt('requested_date', tomorrowEnd.toISOString())
      .is('reminder_sent_at', null)
      .select('id, tenant_id, assigned_agent_id, requested_date, time_slot, property:property_id(title, address, city, owner_id)')

    if (error) {
      console.error('Failed to claim visits for reminder:', error)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // agency_agents have no platform account — reach an assigned agent by
    // email/SMS instead of the in-app notify(), which requires a users.id.
    const agentIds = [...new Set((visits || []).map((v: any) => v.assigned_agent_id).filter(Boolean))]
    const { data: agents } = agentIds.length > 0
      ? await supabase.from('agency_agents').select('id, first_name, email, phone').in('id', agentIds)
      : { data: [] as any[] }
    const agentMap = new Map((agents || []).map((a: any) => [a.id, a]))

    let notified = 0
    for (const visit of visits || []) {
      const property = visit.property as any
      const timeLabel = visit.time_slot || ''
      const propertyTitle = property?.title || 'ce bien'

      const recipients: Array<{ userId: string; actionUrl: string }> = [
        { userId: visit.tenant_id, actionUrl: 'my-visits' },
        ...(property?.owner_id ? [{ userId: property.owner_id, actionUrl: 'visit-requests' }] : []),
      ]
      const recipientIds = recipients.map((r) => r.userId)
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, visit_reminders')
        .in('user_id', recipientIds)
      const prefMap = new Map((prefs || []).map((p: any) => [p.user_id, p.visit_reminders]))

      const seen = new Set<string>()
      for (const recipient of recipients) {
        if (seen.has(recipient.userId)) continue
        seen.add(recipient.userId)
        // Default to enabled when the user has no preferences row yet.
        if (prefMap.get(recipient.userId) === false) continue
        await notify(supabase, {
          userId: recipient.userId,
          type: 'VISIT_REMINDER',
          title: 'Visite demain',
          message: `Rappel : une visite pour "${propertyTitle}" est prévue demain${timeLabel ? ` (${timeLabel})` : ''}.`,
          actionUrl: recipient.actionUrl,
          entityId: visit.id,
        })
        notified++
      }

      const agent = visit.assigned_agent_id ? agentMap.get(visit.assigned_agent_id) : null
      if (agent) {
        const text = `Mon Toit - Bonjour ${agent.first_name}, rappel : votre visite pour "${propertyTitle}" est prévue demain${timeLabel ? ` (${timeLabel})` : ''}.`
        const tasks: Promise<unknown>[] = []
        if (agent.email) tasks.push(sendEmail({ to: agent.email, subject: 'Mon Toit - Rappel de visite demain', content: `<p>${text}</p>`, isHtml: true }))
        if (agent.phone) tasks.push(sendSms({ to: agent.phone, text }))
        await Promise.allSettled(tasks)
        notified++
      }
    }

    return new Response(JSON.stringify({ visitsReminded: (visits || []).length, notified }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('remind-upcoming-visits error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
