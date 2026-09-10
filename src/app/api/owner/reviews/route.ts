import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const [receivedRaw, givenRaw, completedRaw] = await Promise.all([
      (supabase as any)
        .from('ratings')
        .select('id, score, comment, created_at, to_user_id, from_user_id, lease_id')
        .eq('to_user_id', userId)
        .neq('status', 'HIDDEN')
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('ratings')
        .select('id, score, comment, created_at, to_user_id, from_user_id, lease_id')
        .eq('from_user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('leases')
        .select('id, start_date, end_date, status, tenant_id, property_id, owner_id')
        .eq('owner_id', userId)
        .in('status', ['TERMINATED', 'EXPIRED', 'ACTIVE'])
        .order('end_date', { ascending: false }),
    ])

    const receivedList = receivedRaw.data || []
    const givenList = givenRaw.data || []
    const completedLeases = completedRaw.data || []

    const receivedUserIds = [...new Set(receivedList.map((r: any) => r.from_user_id as string).filter(Boolean))]
    const givenUserIds = [...new Set(givenList.map((r: any) => r.to_user_id as string).filter(Boolean))]
    const leaseIds = [...new Set([
      ...receivedList.map((r: any) => r.lease_id as string),
      ...givenList.map((r: any) => r.lease_id as string),
      ...completedLeases.map(l => l.id),
    ].filter(Boolean))]

    const allUserIds = [...new Set([...receivedUserIds, ...givenUserIds])]
    const propertyIds = [...new Set([
      ...completedLeases.map(l => l.property_id),
    ].filter(Boolean))]

    const [{ data: users }, { data: leaseProps }, { data: leaseTenants }, { data: ratingsForLease }] = await Promise.all([
      allUserIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', allUserIds as string[])
        : { data: [] as any[] },
      propertyIds.length > 0
        ? supabase.from('properties').select('id, title, address, city').in('id', propertyIds)
        : { data: [] as any[] },
      completedLeases.length > 0
        ? supabase.from('users').select('id, first_name, last_name, avatar_url')
            .in('id', [...new Set(completedLeases.map(l => l.tenant_id).filter(Boolean))])
        : { data: [] as any[] },
      supabase
        .from('ratings')
        .select('id, lease_id, from_user_id')
        .eq('from_user_id', userId)
        .in('lease_id', leaseIds.length > 0 ? leaseIds : ['none']),
    ])

    const userMap: Record<string, any> = {}
    for (const u of (users || [])) {
      userMap[u.id] = { id: u.id, firstName: u.first_name, lastName: u.last_name, avatarUrl: u.avatar_url }
    }

    const leasePropMap: Record<string, any> = {}
    for (const p of (leaseProps || [])) {
      leasePropMap[p.id] = { id: p.id, title: p.title, address: p.address, city: p.city }
    }

    const leaseTenantMap: Record<string, any> = {}
    for (const t of (leaseTenants || [])) {
      leaseTenantMap[t.id] = { id: t.id, firstName: t.first_name, lastName: t.last_name, avatarUrl: t.avatar_url }
    }

    const ratingsByLease: Record<string, any[]> = {}
    for (const r of (ratingsForLease || [])) {
      if (!ratingsByLease[r.lease_id]) ratingsByLease[r.lease_id] = []
      ratingsByLease[r.lease_id].push(r)
    }

    const reviewsReceived = receivedList.map((r: any) => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      createdAt: r.created_at,
      toUserId: r.to_user_id,
      fromUserId: r.from_user_id,
      leaseId: r.lease_id,
      fromUser: userMap[r.from_user_id] || { id: r.from_user_id, firstName: '', lastName: '', avatarUrl: null },
      lease: null,
    }))

    const reviewsGiven = givenList.map((r: any) => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      createdAt: r.created_at,
      toUserId: r.to_user_id,
      fromUserId: r.from_user_id,
      leaseId: r.lease_id,
      toUser: userMap[r.to_user_id] || { id: r.to_user_id, firstName: '', lastName: '', avatarUrl: null },
      lease: null,
    }))

    const leasesToReview = completedLeases
      .filter(l => {
        const leaseRatings = ratingsByLease[l.id] || []
        return leaseRatings.length === 0
      })
      .map(l => ({
        id: l.id,
        startDate: l.start_date,
        endDate: l.end_date,
        status: l.status,
        tenant: leaseTenantMap[l.tenant_id] || { id: l.tenant_id, firstName: '', lastName: '', avatarUrl: null },
        property: leasePropMap[l.property_id] || { id: l.property_id, title: '', address: '', city: '' },
      }))

    const receivedScores = reviewsReceived.map(r => r.score)
    const averageScoreReceived = receivedScores.length > 0
      ? Math.round((receivedScores.reduce((s: number, v: number) => s + v, 0) / receivedScores.length) * 10) / 10
      : 0

    const resp = NextResponse.json({
      data: {
        received: reviewsReceived,
        given: reviewsGiven,
        leasesToReview,
      },
      stats: {
        receivedCount: reviewsReceived.length,
        givenCount: reviewsGiven.length,
        averageScoreReceived,
        pendingReviews: leasesToReview.length,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Owner reviews GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
