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
    if (effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { data: agents } = await supabase
      .from('agency_agents')
      .select('*')
      .eq('agency_id', userId)
      .order('created_at', { ascending: false })

    const agentIds = ((agents || []) as any[]).map(a => a.id)

    const [assignedPropsRes, commissionsRes] = await Promise.all([
      agentIds.length > 0
        ? supabase
            .from('agency_agent_properties')
            .select('id, agent_id, property_id, assigned_at')
            .in('agent_id', agentIds)
        : { data: [] as any[] },
      agentIds.length > 0
        ? supabase
            .from('commissions')
            .select('agent_id, amount')
            .eq('status', 'PAID')
            .in('agent_id', agentIds)
        : { data: [] as any[] },
    ])

    const assignedProps = assignedPropsRes.data || []
    const commissions = commissionsRes.data || []

    const propertyIds = [...new Set(assignedProps.map(ap => ap.property_id).filter(Boolean))]
    const { data: props } = propertyIds.length > 0
      ? await supabase.from('properties').select('id, title, city, status').in('id', propertyIds)
      : { data: [] as any[] }

    const propMap: Record<string, any> = {}
    for (const p of (props || [])) {
      propMap[p.id] = { id: p.id, title: p.title, city: p.city, status: p.status }
    }

    const assignedByAgent: Record<string, any[]> = {}
    for (const ap of assignedProps) {
      if (!assignedByAgent[ap.agent_id]) assignedByAgent[ap.agent_id] = []
      assignedByAgent[ap.agent_id].push({
        id: ap.id,
        propertyId: ap.property_id,
        propertyTitle: propMap[ap.property_id]?.title,
        propertyCity: propMap[ap.property_id]?.city,
        propertyStatus: propMap[ap.property_id]?.status,
        assignedAt: ap.assigned_at,
      })
    }

    const commissionsByAgent: Record<string, number> = {}
    for (const c of commissions) {
      commissionsByAgent[c.agent_id] = (commissionsByAgent[c.agent_id] || 0) + c.amount
    }

    const agentsWithStats = (agents || []).map((agent: any) => ({
      id: agent.id,
      firstName: agent.first_name,
      lastName: agent.last_name,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      status: agent.status,
      avatarUrl: agent.avatar_url,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
      assignedPropertiesCount: (assignedByAgent[agent.id] || []).length,
      assignedProperties: assignedByAgent[agent.id] || [],
      totalCommissions: commissionsByAgent[agent.id] || 0,
    }))

    const resp = NextResponse.json({ agents: agentsWithStats })
    return applyCookies(resp)
  } catch (error) {
    console.error('Get agents error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

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
    if (effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { firstName, lastName, email, phone, role } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Prénom, nom et email sont requis' }, { status: 400 })
    }
    if (phone && phone.length !== 10) {
      return NextResponse.json(
        { error: 'Numéro de téléphone ivoirien invalide (10 chiffres requis)' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('agency_agents')
      .select('id')
      .eq('email', email)
      .eq('agency_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Un agent avec cet email existe déjà' }, { status: 409 })
    }

    const { data: agent } = await supabase
      .from('agency_agents')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        role: role || 'AGENT',
        status: 'ACTIVE',
        agency_id: userId,
      } as any)
      .select()
      .single()

    const resp = NextResponse.json({ agent }, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
