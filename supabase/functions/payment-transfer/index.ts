import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { initiatePaiementImmediat, generatePartnerTransactionId, type PaiementImmediatParams } from '../_shared/intouch.ts'

interface TransferRequestBody {
  /** Payer's Intouch alias/phone (sender) */
  payeurAlias: string
  /** Payee's Intouch alias/phone (receiver) */
  payeAlias: string
  /** Amount in FCFA */
  montant: number
  /** Reason for the transfer */
  motif: string
  /** Optional custom transaction ID (auto-generated if omitted) */
  txId?: string
}

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
      })
    }

    // ── Authentication ──
    const userId = await resolveUserFromRequest(req)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
      })
    }

    // ── Role check: only ADMIN and AGENCE can initiate transfers ──
    const supabase = getSupabaseAdminClient()
    const { data: profile } = await supabase
      .from('users')
      .select('active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'AGENCE') {
      return new Response(JSON.stringify({ error: 'Accès refusé — réservé aux administrateurs et agences' }), {
        status: 403,
        headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
      })
    }

    // ── Validate input ──
    const body: TransferRequestBody = await req.json()
    const { payeurAlias, payeAlias, montant, motif, txId } = body

    if (!payeurAlias || !payeAlias || !montant || !motif) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants: payeurAlias, payeAlias, montant, motif' }), {
        status: 400,
        headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
      })
    }

    if (typeof montant !== 'number' || montant <= 0) {
      return new Response(JSON.stringify({ error: 'Le montant doit être un nombre positif' }), {
        status: 400,
        headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
      })
    }

    // ── Build params ──
    const params: PaiementImmediatParams = {
      txId: txId || generatePartnerTransactionId(),
      payeurAlias,
      payeAlias,
      montant,
      motif,
      confirmation: true,
    }

    // ── Call Intouch API ──
    const result = await initiatePaiementImmediat(params)

    if (!result.success) {
      console.error('Paiement Immédiat transfer failed:', { userId, error: result.error })
      return new Response(JSON.stringify({ error: result.error || 'Erreur lors du transfert' }), {
        status: 502,
        headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
      })
    }

    // ── Log transfer in service_usage_logs (audit trail) ──
    try {
      await supabase.from('service_usage_logs').insert({
        service_name: 'paiement_immediat',
        provider: 'intouch',
        status: 'success',
        user_id: userId,
        metadata: {
          txId: params.txId,
          payeurAlias,
          payeAlias,
          montant,
          motif,
          response: result.data,
          action: 'transfer',
        },
      })
    } catch (logErr) {
      // Non-blocking: log failure shouldn't break the response
      console.error('Failed to log transfer in service_usage_logs:', logErr)
    }

    const responseBody: Record<string, unknown> = {
      txId: params.txId,
      message: 'Transfert effectué avec succès',
    }
    if (result.data) responseBody.data = result.data

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Payment transfer error:', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur lors du transfert' }), {
      status: 500,
      headers: { ...corsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
    })
  }
})
