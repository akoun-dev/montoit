import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// GET /api/cron/check-search-alerts — Trigger search alert check (cron-friendly)
// This endpoint can be called from Vercel Cron Jobs, cron-job.org, or similar.
// It calls the check_search_alerts() PostgreSQL function which matches new
// properties against active search alerts and creates notifications.
export async function GET(req: NextRequest) {
  try {
    // Simple API key check for cron authentication
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.CRON_SECRET_KEY

    // If CRON_SECRET_KEY is set, require it
    if (expectedKey) {
      if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    const supabase = getSupabaseAdminClient()

    // Call the PostgreSQL function
    const { data, error } = await supabase
      .rpc('check_search_alerts')

    if (error) {
      console.error('check_search_alerts RPC error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 })
    }

    const matches = data as Array<{
      alert_id: string
      user_id: string
      property_id: string
      property_title: string
      alert_name: string
    }> | null

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      matchCount: matches?.length ?? 0,
      matches: matches ?? [],
    })
  } catch (error) {
    console.error('check_search_alerts error:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
    }, { status: 500 })
  }
}

// POST — Same as GET, for flexibility with different cron providers
export async function POST(req: NextRequest) {
  return GET(req)
}
