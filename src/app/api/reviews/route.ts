import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// GET /api/reviews — List ratings given and received for current user + stats
// Supports both LOCATAIRE and PROPRIETAIRE roles
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
    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const direction = searchParams.get('direction') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const [givenRaw, receivedRaw, givenCountRaw, receivedCountRaw, receivedScoresRaw] = await Promise.all([
      (direction === 'all' || direction === 'given')
        ? supabase
            .from('ratings')
            .select('*')
            .eq('from_user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1)
        : { data: [] as any[], error: null },
      (direction === 'all' || direction === 'received')
        ? supabase
            .from('ratings')
            .select('*')
            .eq('to_user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1)
        : { data: [] as any[], error: null },
      supabase
        .from('ratings')
        .select('id', { count: 'exact', head: true })
        .eq('from_user_id', userId),
      supabase
        .from('ratings')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', userId),
      supabase
        .from('ratings')
        .select('score')
        .eq('to_user_id', userId),
    ])

    const ratingsGiven = givenRaw.data || []
    const ratingsReceived = receivedRaw.data || []
    const givenCount = givenCountRaw.count || 0
    const receivedCount = receivedCountRaw.count || 0
    const receivedScores = receivedScoresRaw.data || []

    // Fetch related lease, property, and user data
    const allUserIds = [...new Set([
      ...ratingsGiven.map((r: any) => r.to_user_id).filter(Boolean),
      ...ratingsReceived.map((r: any) => r.from_user_id).filter(Boolean),
    ])]
    const allLeaseIds = [...new Set([
      ...ratingsGiven.map((r: any) => r.lease_id).filter(Boolean),
      ...ratingsReceived.map((r: any) => r.lease_id).filter(Boolean),
    ])]

    const [{ data: users }, { data: leases }] = await Promise.all([
      allUserIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', allUserIds)
        : { data: [] as any[] },
      allLeaseIds.length > 0
        ? supabase.from('leases').select('id, start_date, end_date, property_id').in('id', allLeaseIds)
        : { data: [] as any[] },
    ])

    const userMap: Record<string, any> = {}
    for (const u of (users || [])) {
      userMap[u.id] = { id: u.id, firstName: u.first_name, lastName: u.last_name, avatarUrl: u.avatar_url }
    }

    const leaseMap: Record<string, any> = {}
    for (const l of (leases || [])) {
      leaseMap[l.id] = { id: l.id, startDate: l.start_date, endDate: l.end_date, propertyId: l.property_id }
    }

    const propertyIds = [...new Set((leases || []).map((l: any) => l.property_id).filter(Boolean))]
    const { data: properties } = propertyIds.length > 0
      ? await supabase.from('properties').select('id, title, address, city').in('id', propertyIds)
      : { data: [] as any[] }

    const propertyMap: Record<string, any> = {}
    for (const p of (properties || [])) {
      propertyMap[p.id] = { id: p.id, title: p.title, address: p.address, city: p.city }
    }

    const mapRating = (r: any) => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      reply: r.reply,
      repliedAt: r.replied_at,
      createdAt: r.created_at,
      leaseId: r.lease_id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
    })

    const enrichRating = (r: any, key: string) => {
      const lease = leaseMap[r.lease_id]
      return {
        ...mapRating(r),
        lease: lease ? {
          ...lease,
          property: propertyMap[lease.propertyId] || null,
        } : null,
        [key]: userMap[r[key === 'toUser' ? 'to_user_id' : 'from_user_id']] || null,
      }
    }

    const enrichedGiven = ratingsGiven.map((r: any) => enrichRating(r, 'toUser'))
    const enrichedReceived = ratingsReceived.map((r: any) => enrichRating(r, 'fromUser'))

    const averageScoreReceived = receivedScores.length > 0
      ? receivedScores.reduce((sum: number, r: any) => sum + r.score, 0) / receivedScores.length
      : 0

    const pagination =
      direction === 'given'
        ? { page, limit, total: givenCount, totalPages: Math.ceil(givenCount / limit) }
        : direction === 'received'
          ? { page, limit, total: receivedCount, totalPages: Math.ceil(receivedCount / limit) }
          : { page: 1, limit: 0, total: givenCount + receivedCount, totalPages: 1 }

    const resp = NextResponse.json({
      data: {
        given: enrichedGiven,
        received: enrichedReceived,
      },
      stats: {
        givenCount,
        receivedCount,
        averageScoreReceived: Math.round(averageScoreReceived * 10) / 10,
      },
      pagination,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/reviews — Create a review/rating (LOCATAIRE or PROPRIETAIRE)
export async function POST(req: NextRequest) {
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
    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Seuls les locataires et propriétaires peuvent laisser un avis' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { leaseId, toUserId, score, comment, propertyId } = body as {
      leaseId?: string
      toUserId?: string
      score?: number
      comment?: string
      propertyId?: string
    }

    if (!leaseId || !toUserId || !score) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: leaseId, toUserId, score' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'La note doit être un entier entre 1 et 5' },
        { status: 400 }
      )
    }

    const { data: lease } = await supabase
      .from('leases')
      .select('*, property:properties(id, title, owner_id), tenant:users!leases_tenant_id_fkey(id, first_name, last_name), owner:users!leases_owner_id_fkey(id, first_name, last_name)')
      .eq('id', leaseId)
      .single()

    if (!lease) {
      return NextResponse.json(
        { error: 'Bail introuvable ou ne vous appartenant pas' },
        { status: 404 }
      )
    }

    const leaseCheck = lease as any
    if (effectiveRole === 'LOCATAIRE' && leaseCheck.tenant_id !== userId) {
      return NextResponse.json(
        { error: 'Bail introuvable ou ne vous appartenant pas' },
        { status: 404 }
      )
    }
    if ((effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') && leaseCheck.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Bail introuvable ou ne vous appartenant pas' },
        { status: 404 }
      )
    }

    if (effectiveRole === 'LOCATAIRE' && leaseCheck.owner_id !== toUserId) {
      return NextResponse.json(
        { error: 'L\'utilisateur évalué doit être le propriétaire du bail' },
        { status: 400 }
      )
    }
    if ((effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') && leaseCheck.tenant_id !== toUserId) {
      return NextResponse.json(
        { error: 'L\'utilisateur évalué doit être le locataire du bail' },
        { status: 400 }
      )
    }

    if (propertyId && leaseCheck.property_id !== propertyId) {
      return NextResponse.json(
        { error: 'La propriété ne correspond pas au bail' },
        { status: 400 }
      )
    }

    const { data: existingReview } = await supabase
      .from('ratings')
      .select('id')
      .eq('lease_id', leaseId)
      .eq('from_user_id', userId)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Vous avez déjà laissé un avis pour ce bail' },
        { status: 400 }
      )
    }

    const { data: rating, error: createError } = await supabase
      .from('ratings')
      .insert({
        score,
        comment: comment || null,
        property_id: propertyId || null,
        lease_id: leaseId,
        from_user_id: userId,
        to_user_id: toUserId,
      })
      .select()
      .single()

    if (createError || !rating) {
      throw createError || new Error('Failed to create rating')
    }

    const propertyTitle = leaseCheck.property?.title || 'bien'

    await notify({
      userId: toUserId,
      type: 'REVIEW',
      title: 'Nouvel avis reçu',
      message: `Vous avez reçu un avis de ${score}/5 pour le bail "${propertyTitle}".`,
      actionUrl: 'reviews',
      entityId: rating.id,
    })

    const mappedRating = {
      id: rating.id,
      score: rating.score,
      comment: rating.comment,
      reply: rating.reply,
      repliedAt: rating.replied_at,
      createdAt: rating.created_at,
      leaseId: rating.lease_id,
      fromUserId: rating.from_user_id,
      toUserId: rating.to_user_id,
      propertyId: rating.property_id,
      lease: {
        id: leaseCheck.id,
        startDate: leaseCheck.start_date,
        endDate: leaseCheck.end_date,
        property: leaseCheck.property ? {
          id: leaseCheck.property.id,
          title: leaseCheck.property.title,
          city: leaseCheck.property.city,
        } : null,
      },
      toUser: {
        id: leaseCheck.to_user_id || leaseCheck.owner_id,
        firstName: leaseCheck.owner?.first_name || '',
        lastName: leaseCheck.owner?.last_name || '',
      },
      property: rating.property_id ? { id: rating.property_id, title: propertyTitle } : null,
    }

    const response = NextResponse.json({ data: mappedRating }, { status: 201 })
    return applyCookies(response)
  } catch (error) {
    console.error('Reviews POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
