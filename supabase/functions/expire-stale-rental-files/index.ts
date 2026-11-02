import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

// rental_files.valid_until was only ever enforced lazily, as a side effect
// of the tenant loading their own dossier page (/api/rental-file GET/POST).
// A tenant who never revisits that page keeps a VALIDATED dossier forever
// in every OTHER flow that only checks status (leases/create,
// visits/[id] approval, …), and nobody was ever notified their dossier had
// lapsed. Run this on a schedule so expiry is enforced regardless of
// tenant activity, and actually tell them about it.
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
    const now = new Date().toISOString()

    // Atomic claim: only rows this call actually flips to EXPIRED are
    // returned, so a concurrent/retried run can't double-notify.
    const { data: expired, error } = await supabase
      .from('rental_files')
      .update({ status: 'EXPIRED' })
      .eq('status', 'VALIDATED')
      .lt('valid_until', now)
      .select('id, tenant_id')

    if (error) {
      console.error('Failed to expire stale rental files:', error)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (expired && expired.length > 0) {
      const ids = expired.map((f) => f.id)
      // Never overwrite a candidature the owner already decided on (final).
      await supabase
        .from('applications')
        .update({ status: 'EXPIRED' })
        .in('rental_file_id', ids)
        .not('status', 'in', '("ACCEPTED","REJECTED")')
    }

    for (const file of expired || []) {
      await notify(supabase, {
        userId: file.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: 'Dossier locatif expiré',
        message: 'La validité de votre dossier locatif a expiré. Complétez-le à nouveau pour continuer à postuler.',
        actionUrl: 'rental-file',
        entityId: file.id,
      })
    }

    return new Response(JSON.stringify({ expiredCount: (expired || []).length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('expire-stale-rental-files error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
