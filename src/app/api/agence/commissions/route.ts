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

    const { data: rawCommissions } = await supabase
      .from('commissions')
      .select('*')
      .eq('agency_id', userId)
      .order('created_at', { ascending: false })

    const commissionsList = (rawCommissions || []) as any[]

    const agentIds = [...new Set(commissionsList.map(c => c.agent_id).filter(Boolean))]
    const mandatIds = [...new Set(commissionsList.map(c => c.mandat_id).filter(Boolean))]
    const leaseIds = [...new Set(commissionsList.map(c => c.lease_id).filter(Boolean))]

    const [{ data: agents }, { data: mandats }, { data: leases }] = await Promise.all([
      agentIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, email, role').in('id', agentIds)
        : { data: [] as any[] },
      mandatIds.length > 0
        ? supabase.from('mandats').select('id, commission_rate, property_id').in('id', mandatIds)
        : { data: [] as any[] },
      leaseIds.length > 0
        ? supabase.from('leases').select('id, monthly_rent, property_id, tenant_id').in('id', leaseIds)
        : { data: [] as any[] },
    ])

    const agentMap: Record<string, any> = {}
    for (const a of (agents || [])) {
      agentMap[a.id] = { id: a.id, firstName: a.first_name, lastName: a.last_name, email: a.email, role: a.role }
    }

    const mandatPropertyIds = [...new Set((mandats || []).map(m => m.property_id).filter(Boolean))]
    const { data: mandatProps } = mandatPropertyIds.length > 0
      ? await supabase.from('properties').select('id, title, city').in('id', mandatPropertyIds)
      : { data: [] as any[] }

    const mandatPropMap: Record<string, any> = {}
    for (const p of (mandatProps || [])) {
      mandatPropMap[p.id] = { id: p.id, title: p.title, city: p.city }
    }

    const mandatMap: Record<string, any> = {}
    for (const m of (mandats || [])) {
      mandatMap[m.id] = {
        id: m.id,
        commissionRate: m.commission_rate,
        property: mandatPropMap[m.property_id] || { id: '', title: '', city: '' },
      }
    }

    const leasePropertyIds = [...new Set((leases || []).map(l => l.property_id).filter(Boolean))]
    const leaseTenantIds = [...new Set((leases || []).map(l => l.tenant_id).filter(Boolean))]

    const [{ data: leaseProps }, { data: leaseTenants }] = await Promise.all([
      leasePropertyIds.length > 0
        ? supabase.from('properties').select('id, title').in('id', leasePropertyIds)
        : { data: [] as any[] },
      leaseTenantIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name').in('id', leaseTenantIds)
        : { data: [] as any[] },
    ])

    const leasePropMap: Record<string, any> = {}
    for (const p of (leaseProps || [])) {
      leasePropMap[p.id] = { id: p.id, title: p.title }
    }

    const leaseTenantMap: Record<string, any> = {}
    for (const t of (leaseTenants || [])) {
      leaseTenantMap[t.id] = { firstName: t.first_name, lastName: t.last_name }
    }

    const leaseMap: Record<string, any> = {}
    for (const l of (leases || [])) {
      leaseMap[l.id] = {
        id: l.id,
        monthlyRent: l.monthly_rent,
        property: leasePropMap[l.property_id] || { id: '', title: '' },
        tenant: leaseTenantMap[l.tenant_id] || { firstName: '', lastName: '' },
      }
    }

    const commissions = commissionsList.map((c: any) => ({
      id: c.id,
      amount: c.amount,
      status: c.status,
      type: c.type,
      createdAt: c.created_at,
      paidAt: c.paid_at,
      dueDate: c.due_date,
      agencyId: c.agency_id,
      agentId: c.agent_id,
      mandatId: c.mandat_id,
      leaseId: c.lease_id,
      agent: agentMap[c.agent_id] || null,
      mandat: mandatMap[c.mandat_id] || null,
      lease: leaseMap[c.lease_id] || null,
    }))

    const resp = NextResponse.json({ commissions })
    return applyCookies(resp)
  } catch (error) {
    console.error('Get commissions error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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
    const { commissionId } = body

    if (!commissionId) {
      return NextResponse.json({ error: 'ID de commission requis' }, { status: 400 })
    }

    const commissionResult = await supabase
      .from('commissions')
      .select('*')
      .eq('id', commissionId)
      .eq('agency_id', userId)
      .maybeSingle()
    const commission = commissionResult.data as any

    if (!commission) {
      return NextResponse.json({ error: 'Commission non trouvée' }, { status: 404 })
    }

    if (commission.status === 'PAID') {
      return NextResponse.json({ error: 'Commission déjà payée' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      status: 'PAID',
      paid_at: new Date().toISOString(),
    }

    const { data: updated } = await (supabase
      .from('commissions') as any)
      .update(updateData)
      .eq('id', commissionId)
      .select()
      .single()

    if (!updated) {
      return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
    }

    const u = updated as any
    const resp = NextResponse.json({
      commission: {
        id: u.id,
        amount: u.amount,
        status: u.status,
        type: u.type,
        createdAt: u.created_at,
        paidAt: u.paid_at,
        dueDate: u.due_date,
        agencyId: u.agency_id,
        agentId: u.agent_id,
        mandatId: u.mandat_id,
        leaseId: u.lease_id,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Update commission error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
