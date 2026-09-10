import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

// A lease stuck in PENDING_SIGNATURE has nothing nudging either party to
// sign — this job reminds whichever signatory hasn't signed yet, once
// REMINDER_DELAY_HOURS after creation and then every REMINDER_DELAY_HOURS
// until the lease is fully signed, cancelled or terminated.
const REMINDER_DELAY_HOURS = 48

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
    const threshold = new Date(now.getTime() - REMINDER_DELAY_HOURS * 60 * 60 * 1000).toISOString()

    // Atomic claim: only rows this call actually flips to reminder_sent_at=now
    // are returned, so a concurrent/retried run can't double-notify.
    const { data: leases, error } = await supabase
      .from('leases')
      .update({ reminder_sent_at: now.toISOString() })
      .eq('status', 'PENDING_SIGNATURE')
      .lt('created_at', threshold)
      .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${threshold}`)
      .select('id, owner_id, tenant_id, owner_signed_at, tenant_signed_at, property:property_id(title)')

    if (error) {
      console.error('Failed to claim leases for signature reminder:', error)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let notified = 0
    for (const lease of leases || []) {
      const propertyTitle = (lease.property as any)?.title || 'ce bien'
      const missingSignatories: string[] = []
      if (!lease.owner_signed_at) missingSignatories.push(lease.owner_id)
      if (!lease.tenant_signed_at) missingSignatories.push(lease.tenant_id)

      for (const userId of missingSignatories) {
        await notify(supabase, {
          userId,
          type: 'LEASE_UPDATE',
          title: 'Signature de bail en attente',
          message: `Votre signature est toujours attendue pour le bail concernant "${propertyTitle}". Merci de finaliser la signature dès que possible.`,
          actionUrl: `/dashboard/leases/${lease.id}`,
          entityId: lease.id,
        })
        notified++
      }
    }

    return new Response(JSON.stringify({ leasesReminded: (leases || []).length, notified }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('remind-pending-lease-signatures error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
