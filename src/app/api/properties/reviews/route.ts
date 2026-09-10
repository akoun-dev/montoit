import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()

    const { data: leases } = await admin
      .from('leases')
      .select('id')
      .eq('property_id', propertyId)
      .in('status', ['ACTIVE', 'EXPIRED'])

    if (!leases || leases.length === 0) {
      return NextResponse.json({ reviews: [], avgRating: 0, totalReviews: 0 })
    }

    const leaseIds = leases.map((l) => l.id)

    const { data: ratings } = await (admin as any)
      .from('ratings')
      .select('id, from_user_id, score, comment, created_at')
      .in('lease_id', leaseIds)
      .neq('status', 'HIDDEN')
      .order('created_at', { ascending: false })

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({ reviews: [], avgRating: 0, totalReviews: 0 })
    }

    const fromUserIds = [...new Set(ratings.map((r: any) => r.from_user_id as string))]

    const { data: fromUsers } = await admin
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', fromUserIds as string[])

    const userMap = new Map(fromUsers?.map((u) => [u.id, u]))

    const reviews = ratings.map((r) => {
      const user = userMap.get(r.from_user_id)
      const firstName = user?.first_name || ''
      const lastName = user?.last_name || ''
      return {
        id: r.id,
        name: `${firstName} ${lastName}`,
        avatar: `${firstName.charAt(0)}${lastName.charAt(0)}`,
        rating: r.score,
        date: new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
        comment: r.comment || '',
        verified: true,
      }
    })

    const totalReviews = reviews.length
    const avgRating = totalReviews > 0
      ? Number((ratings.reduce((sum, r) => sum + r.score, 0) / totalReviews).toFixed(1))
      : 0

    return NextResponse.json({ reviews, avgRating, totalReviews })
  } catch (error) {
    console.error('Reviews error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
