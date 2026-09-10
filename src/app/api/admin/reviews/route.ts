import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// GET /api/admin/reviews — List ratings for moderation, with the count of
// REVIEW-type signalements raised against each one so admins can see which
// reviews were actually reported instead of scanning every review blindly.
export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const reportedOnly = searchParams.get('reportedOnly') === 'true'

    let query = (admin as any).from('ratings').select('*')
    if (status) query = query.eq('status', status)
    const { data: ratingsData } = await query.order('created_at', { ascending: false }).limit(200)
    const ratings = (ratingsData ?? []) as any[]

    const { data: signalementsData } = await (admin as any)
      .from('signalements')
      .select('id, entity_id, status, reason, description, created_at')
      .eq('entity_type', 'REVIEW')
      .in('entity_id', ratings.map((r) => r.id).length > 0 ? ratings.map((r) => r.id) : ['none'])

    const signalementsByRating = new Map<string, any[]>()
    for (const s of signalementsData ?? []) {
      if (!signalementsByRating.has(s.entity_id)) signalementsByRating.set(s.entity_id, [])
      signalementsByRating.get(s.entity_id)!.push(s)
    }

    const filteredRatings = reportedOnly
      ? ratings.filter((r) => (signalementsByRating.get(r.id) ?? []).length > 0)
      : ratings

    const userIds = [...new Set([
      ...filteredRatings.map((r) => r.from_user_id).filter(Boolean),
      ...filteredRatings.map((r) => r.to_user_id).filter(Boolean),
      ...filteredRatings.map((r) => r.moderated_by_id).filter(Boolean),
    ])]
    const { data: users } = userIds.length > 0
      ? await admin.from('users').select('id, first_name, last_name').in('id', userIds)
      : { data: [] as any[] }
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    const propertyIds = [...new Set(filteredRatings.map((r) => r.property_id).filter(Boolean))]
    const { data: properties } = propertyIds.length > 0
      ? await admin.from('properties').select('id, title').in('id', propertyIds)
      : { data: [] as any[] }
    const propertyMap = new Map((properties ?? []).map((p: any) => [p.id, p]))

    const mapped = filteredRatings.map((r: any) => {
      const from = userMap.get(r.from_user_id)
      const to = userMap.get(r.to_user_id)
      const moderator = r.moderated_by_id ? userMap.get(r.moderated_by_id) : null
      const property = r.property_id ? propertyMap.get(r.property_id) : null
      const reports = signalementsByRating.get(r.id) ?? []
      return {
        id: r.id,
        score: r.score,
        comment: r.comment,
        reply: r.reply,
        status: r.status || 'PUBLISHED',
        moderatedAt: r.moderated_at,
        moderationReason: r.moderation_reason,
        createdAt: r.created_at,
        leaseId: r.lease_id,
        fromUser: from ? { id: from.id, firstName: from.first_name, lastName: from.last_name } : null,
        toUser: to ? { id: to.id, firstName: to.first_name, lastName: to.last_name } : null,
        moderatedBy: moderator ? { id: moderator.id, firstName: moderator.first_name, lastName: moderator.last_name } : null,
        property: property ? { id: property.id, title: property.title } : null,
        reportsCount: reports.length,
        reportReasons: reports.map((s: any) => s.reason),
      }
    })

    const resp = NextResponse.json({
      data: mapped,
      stats: {
        total: ratings.length,
        published: ratings.filter((r) => (r.status || 'PUBLISHED') === 'PUBLISHED').length,
        hidden: ratings.filter((r) => r.status === 'HIDDEN').length,
        reported: ratings.filter((r) => (signalementsByRating.get(r.id) ?? []).length > 0).length,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin reviews GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/admin/reviews — Hide or restore a review, and resolve any
// REVIEW signalements raised against it in the same decision.
export async function PATCH(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { id, status, reason } = body as { id?: string; status?: string; reason?: string }

    if (!id || (status !== 'HIDDEN' && status !== 'PUBLISHED')) {
      return NextResponse.json({ error: 'id et status (HIDDEN ou PUBLISHED) requis' }, { status: 400 })
    }

    const { data: updated } = await (admin as any)
      .from('ratings')
      .update({
        status,
        moderated_at: new Date().toISOString(),
        moderated_by_id: userId,
        moderation_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (!updated) {
      return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 })
    }

    // Resolve any open signalements filed against this review so the
    // decision here is reflected in the signalements queue too.
    const { data: openSignalements } = await admin
      .from('signalements')
      .select('id, reporter_id')
      .eq('entity_type', 'REVIEW')
      .eq('entity_id', id)
      .in('status', ['PENDING', 'IN_REVIEW', 'ESCALATED'])

    if (openSignalements && openSignalements.length > 0) {
      const resolution = status === 'HIDDEN' ? 'VALIDATED' : 'REJECTED'
      await (admin as any)
        .from('signalements')
        .update({
          status: resolution,
          handled_by_id: userId,
          admin_notes: reason || (status === 'HIDDEN' ? 'Avis masqué par un administrateur' : 'Avis restauré par un administrateur'),
        })
        .eq('entity_type', 'REVIEW')
        .eq('entity_id', id)
        .in('status', ['PENDING', 'IN_REVIEW', 'ESCALATED'])

      await Promise.all(openSignalements.map((s: any) =>
        notify({
          userId: s.reporter_id,
          type: 'SYSTEM',
          title: 'Mise à jour de votre signalement',
          message: status === 'HIDDEN'
            ? 'L\'avis que vous avez signalé a été masqué par un administrateur.'
            : 'Votre signalement concernant un avis a été examiné et rejeté.',
          actionUrl: 'signalements',
          entityId: s.id,
        })
      ))
    }

    if (status === 'HIDDEN' && updated.from_user_id) {
      await notify({
        userId: updated.from_user_id,
        type: 'REVIEW',
        title: 'Votre avis a été masqué',
        message: `Un administrateur a masqué votre avis.${reason ? ` Raison : ${reason}` : ''}`,
        actionUrl: 'reviews',
        entityId: updated.id,
      })
    }

    return applyCookies(NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        moderatedAt: updated.moderated_at,
        moderationReason: updated.moderation_reason,
      },
    }))
  } catch (error) {
    console.error('Admin reviews PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
