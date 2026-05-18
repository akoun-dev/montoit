import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ favorites: {} })
    }

    const { propertyIds } = await req.json()
    if (!Array.isArray(propertyIds)) {
      return NextResponse.json({ error: 'propertyIds requis (tableau)' }, { status: 400 })
    }

    if (propertyIds.length === 0) {
      return NextResponse.json({ favorites: {} })
    }

    const admin = getSupabaseAdminClient()
    const { data: favorites } = await admin
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId)
      .in('property_id', propertyIds)

    const favoriteMap: Record<string, boolean> = {}
    for (const f of favorites ?? []) {
      favoriteMap[f.property_id] = true
    }

    return NextResponse.json({ favorites: favoriteMap })
  } catch (error) {
    console.error('Favorites check error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
