import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()

    const { count: totalProperties } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')

    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    const { data: properties } = await supabase
      .from('properties')
      .select('views_count')
      .eq('status', 'ACTIVE')

    const monthlyVisitors = (properties || []).reduce(
      (sum: number, p: { views_count: number }) => sum + (p.views_count || 0),
      0
    )

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: newToday } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
      .gte('created_at', todayStart.toISOString())

    const { data: ratings } = await supabase
      .from('ratings')
      .select('score')

    let satisfactionRate = 0
    if (ratings && ratings.length > 0) {
      const avgScore = ratings.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / ratings.length
      satisfactionRate = Math.round((avgScore / 5) * 100)
    }

    const { data: communesRaw } = await supabase
      .from('properties')
      .select('commune')
      .eq('status', 'ACTIVE')
      .not('commune', 'is', null)
      .order('commune', { ascending: true })

    const seen = new Set<string>()
    const communes = (communesRaw || [])
      .map((r: { commune: string }) => r.commune!)
      .filter((c: string) => {
        if (seen.has(c)) return false
        seen.add(c)
        return true
      })

    const { data: typesRaw } = await supabase
      .from('properties')
      .select('type')
      .eq('status', 'ACTIVE')
      .order('type', { ascending: true })

    const typeSeen = new Set<string>()
    const propertyTypes = (typesRaw || [])
      .map((r: { type: string }) => r.type)
      .filter((t: string) => {
        if (typeSeen.has(t)) return false
        typeSeen.add(t)
        return true
      })

    return NextResponse.json({
      totalProperties: totalProperties || 0,
      totalUsers: totalUsers || 0,
      monthlyVisitors,
      newToday: newToday || 0,
      satisfactionRate,
      communes,
      propertyTypes,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
