// ─── Supabase Edge Function: check-search-alerts ────────────────────────────
// Destinée au cron managé Supabase via pg_net :
//   SELECT net.http_post(
//     url := 'https://<project>.supabase.co/functions/v1/check-search-alerts',
//     headers := '{"Authorization":"Bearer <CRON_SECRET_KEY>"}'::jsonb
//   );
//
// Alternative route API Next.js (pour cron externes) :
//   GET/POST /api/cron/check-search-alerts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface MatchResult {
  alert_id: string
  user_id: string
  property_id: string
  property_title: string
  alert_name: string
}

serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  const cors = corsHeaders(origin)

  // Handle CORS preflight
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    // Optional auth check for cron security
    const authHeader = req.headers.get('authorization')
    const expectedKey = Deno.env.get('CRON_SECRET_KEY')
    if (expectedKey && (!authHeader || authHeader !== `Bearer ${expectedKey}`)) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()

    // Call the PostgreSQL function
    const { data, error } = await supabase.rpc('check_search_alerts')

    if (error) {
      console.error('check_search_alerts RPC error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
      }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const matches = (data ?? []) as MatchResult[]

    return new Response(JSON.stringify({
      success: true,
      checkedAt: new Date().toISOString(),
      matchCount: matches.length,
      matches,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('check_search_alerts error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur serveur',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
