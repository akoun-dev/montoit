import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// POST /api/reviews/[id]/reply — Reply to a review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { id } = await params
    const body = await req.json()
    const { reply } = body as { reply?: string }

    if (!reply || reply.trim().length === 0) {
      return NextResponse.json(
        { error: 'Veuillez fournir une réponse' },
        { status: 400 }
      )
    }

    const { data: rating, error: ratingError } = await (supabase
      .from('ratings')
      .select('id, to_user_id, from_user_id, score')
      .eq('id', id)
      .single() as any)

    if (ratingError || !rating) {
      return NextResponse.json(
        { error: 'Avis introuvable' },
        { status: 404 }
      )
    }

    if (rating.to_user_id !== userId) {
      return NextResponse.json(
        { error: 'Seul l\'utilisateur évalué peut répondre à cet avis' },
        { status: 403 }
      )
    }

    const { data: existing } = await (supabase
      .from('ratings')
      .select('reply')
      .eq('id', id)
      .single() as any)

    if (existing?.reply) {
      return NextResponse.json(
        { error: 'Vous avez déjà répondu à cet avis' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await (supabase
      .from('ratings')
      .update({
        reply: reply.trim(),
        replied_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single() as any)

    if (updateError || !updated) {
      throw updateError || new Error('Failed to update rating')
    }

    const { data: leaseData } = await (supabase
      .from('leases')
      .select('id, property:properties(id, title, city)')
      .eq('id', updated.lease_id)
      .single() as any)

    const { data: fromUser } = await (supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', updated.from_user_id)
      .single() as any)

    const { data: toUser } = await (supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', updated.to_user_id)
      .single() as any)

    const mapped = {
      id: updated.id,
      score: updated.score,
      comment: updated.comment,
      reply: updated.reply,
      repliedAt: updated.replied_at,
      createdAt: updated.created_at,
      leaseId: updated.lease_id,
      fromUserId: updated.from_user_id,
      toUserId: updated.to_user_id,
      propertyId: updated.property_id,
      lease: leaseData ? {
        id: leaseData.id,
        property: leaseData.property ? {
          id: leaseData.property.id,
          title: leaseData.property.title,
          city: leaseData.property.city,
        } : null,
      } : null,
      fromUser: fromUser ? {
        id: fromUser.id,
        firstName: fromUser.first_name,
        lastName: fromUser.last_name,
      } : null,
      toUser: toUser ? {
        id: toUser.id,
        firstName: toUser.first_name,
        lastName: toUser.last_name,
      } : null,
    }

    await notify({
      userId: rating.from_user_id,
      type: 'REVIEW',
      title: 'Réponse à votre avis',
      message: `${toUser?.first_name || ''} ${toUser?.last_name || ''} a répondu à votre avis sur "${leaseData?.property?.title || 'bien'}".`,
      actionUrl: 'reviews',
      entityId: rating.id,
    })

    const response = NextResponse.json({ data: mapped })
    return applyCookies(response)
  } catch (error) {
    console.error('Review reply error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
