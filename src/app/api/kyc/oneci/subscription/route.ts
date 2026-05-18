import { NextRequest, NextResponse } from 'next/server'
import { getUserIdAndRole } from '@/lib/session'
import { oneciCheckSubscription, ONECI_API_KEY, ONECI_SECRET_KEY } from '@/lib/oneci'

/**
 * ONECI Subscription Check
 * GET /api/kyc/oneci/subscription
 *
 * Returns remaining API request quota for the ONECI service.
 * This endpoint is admin-only (requires ADMIN role).
 */
export async function GET(req: NextRequest) {
  try {
    // ─── Authentication & Authorization ──────────────────────────────────
    const userRole = await getUserIdAndRole(req)
    if (!userRole) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (userRole.effectiveRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs.' },
        { status: 403 },
      )
    }

    // ─── Check ONECI config ───────────────────────────────────────────────
    if (!ONECI_API_KEY || !ONECI_SECRET_KEY) {
      console.error('[ONECI] API credentials not configured')
      return NextResponse.json(
        { error: 'Service ONECI non configuré. Veuillez contacter l\'administrateur.' },
        { status: 503 },
      )
    }

    // ─── Call ONECI Subscription API ─────────────────────────────────────
    try {
      console.log('[ONECI] Checking subscription quota')
      const subscriptionResult = await oneciCheckSubscription()

      const remaining = subscriptionResult.remainingRequests
        ?? subscriptionResult.data?.remainingRequests
        ?? null
      const total = subscriptionResult.totalRequests
        ?? subscriptionResult.data?.totalRequests
        ?? null
      const used = subscriptionResult.usedRequests
        ?? subscriptionResult.data?.usedRequests
        ?? null

      return NextResponse.json({
        remainingRequests: remaining,
        totalRequests: total,
        usedRequests: used,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error('[ONECI] Subscription check timed out')
        return NextResponse.json(
          { error: 'Le service ONECI met trop de temps à répondre. Veuillez réessayer.' },
          { status: 504 },
        )
      }

      console.error('[ONECI] Subscription check API error:', err)
      return NextResponse.json(
        { error: 'Erreur lors de la communication avec le service ONECI. Veuillez réessayer.' },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error('[ONECI] subscription route error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
