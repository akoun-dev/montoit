import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

// Suspends listings past their listing_expires_at (set by a DB trigger
// whenever a property goes ACTIVE) so stale ads stop showing up in public
// search. The owner can republish from "Mes biens" (same toggle that
// already exists there), which re-triggers a fresh 90-day expiry.
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

    // Atomic claim: only properties this call actually suspends are
    // returned, so a concurrent/retried run can't double-notify.
    const { data: expired, error } = await supabase
      .from('properties')
      .update({ status: 'SUSPENDED', updated_at: now })
      .eq('status', 'ACTIVE')
      .lt('listing_expires_at', now)
      .select('id, title, owner_id')

    if (error) {
      console.error('Failed to expire stale listings:', error)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const property of expired || []) {
      await notify(supabase, {
        userId: property.owner_id,
        type: 'SYSTEM',
        title: 'Annonce suspendue',
        message: `Votre annonce "${property.title}" a expiré après 90 jours et a été suspendue. Réactivez-la depuis "Mes biens" pour la republier.`,
        actionUrl: 'my-properties',
        entityId: property.id,
      })
    }

    return new Response(JSON.stringify({ expiredCount: (expired || []).length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('expire-stale-listings error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
