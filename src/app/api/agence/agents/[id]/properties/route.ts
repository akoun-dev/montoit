import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function authorizeAgencyAndAgent(supabase: ReturnType<typeof getSupabaseAdminClient>, req: NextRequest, agentId: string) {
  const { userId, applyCookies } = await resolveRequestUser(req)
  if (!userId) {
    return { error: applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 })) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single()
  const effectiveRole = profile?.active_role || profile?.role
  if (effectiveRole !== 'AGENCE') {
    return { error: applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 })) }
  }

  const { data: agent } = await (supabase as any)
    .from('agency_agents')
    .select('id, agency_id')
    .eq('id', agentId)
    .eq('agency_id', userId)
    .maybeSingle()
  if (!agent) {
    return { error: applyCookies(NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })) }
  }

  return { userId, applyCookies }
}

// A property is "in the agency's portfolio" when the agency owns it directly
// or manages it under an ACTIVE mandat — same rule dashboard/agence uses to
// build its property list.
async function isAgencyProperty(supabase: ReturnType<typeof getSupabaseAdminClient>, agencyId: string, propertyId: string) {
  const { data: owned } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', agencyId)
    .maybeSingle()
  if (owned) return true

  const { data: mandat } = await (supabase as any)
    .from('mandats')
    .select('id')
    .eq('property_id', propertyId)
    .eq('agency_id', agencyId)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  return !!mandat
}

// POST /api/agence/agents/[id]/properties — Assign an agent to a property in the agency's portfolio
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: agentId } = await params
    const supabase = getSupabaseAdminClient()
    const auth = await authorizeAgencyAndAgent(supabase, req, agentId)
    if ('error' in auth) return auth.error
    const { userId, applyCookies } = auth

    const body = await req.json()
    const { propertyId } = body as { propertyId?: string }
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    if (!(await isAgencyProperty(supabase, userId, propertyId))) {
      return NextResponse.json({ error: 'Ce bien n\'appartient pas au portefeuille de votre agence' }, { status: 403 })
    }

    const { data: existing } = await (supabase as any)
      .from('agency_agent_properties')
      .select('id')
      .eq('agent_id', agentId)
      .eq('property_id', propertyId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Cet agent est déjà assigné à ce bien' }, { status: 409 })
    }

    const { data: assignment, error } = await (supabase as any)
      .from('agency_agent_properties')
      .insert({ id: generateId(), agent_id: agentId, property_id: propertyId })
      .select()
      .single()

    if (error) throw error

    const resp = NextResponse.json({ assignment: { id: assignment.id, agentId: assignment.agent_id, propertyId: assignment.property_id, assignedAt: assignment.assigned_at } }, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Assign agent to property error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/agence/agents/[id]/properties?propertyId=... — Unassign
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: agentId } = await params
    const supabase = getSupabaseAdminClient()
    const auth = await authorizeAgencyAndAgent(supabase, req, agentId)
    if ('error' in auth) return auth.error
    const { applyCookies } = auth

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    await (supabase as any)
      .from('agency_agent_properties')
      .delete()
      .eq('agent_id', agentId)
      .eq('property_id', propertyId)

    const resp = NextResponse.json({ success: true })
    return applyCookies(resp)
  } catch (error) {
    console.error('Unassign agent from property error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
