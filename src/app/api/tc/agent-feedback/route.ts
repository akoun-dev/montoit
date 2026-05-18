import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

async function authorizeTC(request: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(request)
  if (!userId) return { error: applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 })) }

  const supabase = getSupabaseAdminClient()
  const { data: profile } = await ((supabase as any)
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single() as any)

  const effectiveRole = profile?.active_role || profile?.role
  if (effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 }) }

  return { userId, applyCookies, supabase }
}

export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId: tcUserId, applyCookies, supabase } = auth

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
  const offset = offsetParam ? parseInt(offsetParam) : 0

  if (agentId) {
    const { data: agent } = await ((supabase as any)
      .from('verification_agents')
      .select('tc_id')
      .eq('id', agentId)
      .single() as any)
    if (!agent || agent.tc_id !== tcUserId) {
      return NextResponse.json({ error: 'Cet agent ne vous appartient pas' }, { status: 403 })
    }
  }

  let query = supabase
    .from('agent_feedback')
    .select('*', { count: 'exact' })
    .eq('tc_id', tcUserId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (agentId) query = query.eq('agent_id', agentId)

  const { data: feedbacksData, count: total } = await (query as any)
  const feedbackRows = (feedbacksData ?? []) as any[]

  const agentIds = [...new Set(feedbackRows.map((f: any) => f.agent_id).filter(Boolean))]
  const { data: agentsData } = agentIds.length > 0
    ? await ((supabase.from('verification_agents') as any).select('id, first_name, last_name, email, phone, is_active').in('id', agentIds))
    : { data: [] as any[] }

  const agentMap = new Map<string, any>((agentsData ?? []).map((a: any) => [a.id, a]))

  const feedbacks = feedbackRows.map((f: any) => ({
    id: f.id,
    agentId: f.agent_id,
    tcId: f.tc_id,
    rating: f.rating,
    comment: f.comment,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    agent: agentMap.get(f.agent_id) ? {
      id: agentMap.get(f.agent_id).id,
      firstName: agentMap.get(f.agent_id).first_name,
      lastName: agentMap.get(f.agent_id).last_name,
      email: agentMap.get(f.agent_id).email,
      phone: agentMap.get(f.agent_id).phone,
      isActive: agentMap.get(f.agent_id).is_active,
    } : null,
  }))

  const resp = NextResponse.json({
    feedbacks,
    pagination: {
      total: total ?? 0,
      limit,
      offset,
      hasMore: offset + limit < (total ?? 0),
    },
  })
  return applyCookies(resp)
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId: tcUserId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { agentId, rating, comment } = body

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: "L'identifiant de l'agent est requis" }, { status: 400 })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'La note doit être un entier entre 1 et 5' }, { status: 400 })
    }

    const { data: agent } = await ((supabase as any)
      .from('verification_agents')
      .select('id, tc_id')
      .eq('id', agentId)
      .single() as any)
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }
    if (agent.tc_id !== tcUserId) {
      return NextResponse.json({ error: 'Cet agent ne vous appartient pas' }, { status: 403 })
    }

    const { data: feedback } = await ((supabase as any)
      .from('agent_feedback')
      .insert({
        agent_id: agentId,
        tc_id: tcUserId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single() as any)

    const { data: agentDetail } = await ((supabase as any)
      .from('verification_agents')
      .select('id, first_name, last_name, email, phone, is_active')
      .eq('id', agentId)
      .single() as any)

    const feedbackWithRelations = {
      ...feedback,
      agentId: feedback.agent_id,
      tcId: feedback.tc_id,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      agent: agentDetail ? {
        id: agentDetail.id,
        firstName: agentDetail.first_name,
        lastName: agentDetail.last_name,
        email: agentDetail.email,
        phone: agentDetail.phone,
        isActive: agentDetail.is_active,
      } : null,
    }

    await (supabase.from('audit_logs') as any).insert({
      user_id: tcUserId,
      action: 'AGENT_FEEDBACK_CREATED',
      entity: 'AgentFeedback',
      entity_id: feedback.id,
      details: JSON.stringify({
        agentId,
        rating,
        hasComment: !!comment,
      }),
    })

    const resp = NextResponse.json(feedbackWithRelations, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Agent Feedback POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
