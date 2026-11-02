import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

// An ACTIVE lease approaching its end date had nothing prompting either
// party to request/consider a renewal in time — the renewal flow
// (/api/renewals) only ever fired reactively, if the tenant remembered to
// open it themselves. Remind both parties once, 60 days before end_date,
// unless a renewal has already been requested/decided.
const REMINDER_WINDOW_DAYS = 60

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
    const threshold = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    // Atomic claim: only leases this call actually flips
    // renewal_reminder_sent_at on are returned, so a concurrent/retried run
    // can't double-notify.
    const { data: leases, error } = await supabase
      .from('leases')
      .update({ renewal_reminder_sent_at: now.toISOString() })
      .eq('status', 'ACTIVE')
      .is('renewal_status', null)
      .lt('end_date', threshold.toISOString())
      .gt('end_date', now.toISOString())
      .is('renewal_reminder_sent_at', null)
      .select('id, tenant_id, owner_id, end_date, property:property_id(title)')

    if (error) {
      console.error('Failed to claim leases for renewal reminder:', error)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let notified = 0
    for (const lease of leases || []) {
      const propertyTitle = (lease.property as any)?.title || 'ce bien'
      const dateLabel = new Date(lease.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

      await notify(supabase, {
        userId: lease.tenant_id,
        type: 'LEASE_UPDATE',
        title: 'Bail arrivant à échéance',
        message: `Votre bail pour "${propertyTitle}" se termine le ${dateLabel}. Si vous souhaitez le renouveler, faites-en la demande dès maintenant.`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })
      await notify(supabase, {
        userId: lease.owner_id,
        type: 'LEASE_UPDATE',
        title: 'Bail arrivant à échéance',
        message: `Le bail pour "${propertyTitle}" se termine le ${dateLabel}. Anticipez son renouvellement ou son terme.`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })
      notified += 2
    }

    return new Response(JSON.stringify({ leasesReminded: (leases || []).length, notified }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('remind-lease-expiring error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
