import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// GET /api/renewals — List renewal requests for the current user's leases
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', auth.userId)
      .single()

    const role = user?.active_role || user?.role

    let leasesQuery = supabase
      .from('leases')
      .select('*')
      .not('renewal_status', 'is', null)
      .order('renewal_requested_at', { ascending: false })

    if (role === 'LOCATAIRE') {
      leasesQuery = leasesQuery.eq('tenant_id', auth.userId)
    } else if (role === 'PROPRIETAIRE' || role === 'AGENCE') {
      leasesQuery = leasesQuery.eq('owner_id', auth.userId)
    } else {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: leases, error } = await leasesQuery

    if (error) throw error

    const propertyIds = [...new Set((leases ?? []).map((l: any) => l.property_id).filter(Boolean))]

    const { data: properties } = propertyIds.length > 0
      ? await supabase.from('properties').select('id, title, address, city').in('id', propertyIds)
      : { data: [] }

    const propertyMap = new Map((properties ?? []).map((p: any) => [p.id, p]))

    // For proprietaire, also fetch tenant info
    const tenantIds = role === 'PROPRIETAIRE' || role === 'AGENCE'
      ? [...new Set((leases ?? []).map((l: any) => l.tenant_id).filter(Boolean))]
      : []

    const { data: tenants } = tenantIds.length > 0
      ? await supabase.from('users').select('id, first_name, last_name, email, phone, avatar_url').in('id', tenantIds)
      : { data: [] }

    const tenantMap = new Map((tenants ?? []).map((t: any) => [t.id, t]))

    const result = (leases ?? []).map((lease: any) => {
      const prop = propertyMap.get(lease.property_id)
      const tenant = role === 'PROPRIETAIRE' || role === 'AGENCE' ? tenantMap.get(lease.tenant_id) : undefined
      return {
        id: lease.id,
        renewalStatus: lease.renewal_status,
        renewalRequestedAt: lease.renewal_requested_at,
        renewalNotes: lease.renewal_notes,
        renewedLeaseId: lease.renewed_lease_id,
        monthlyRent: lease.monthly_rent,
        startDate: lease.start_date,
        endDate: lease.end_date,
        property: prop ? { id: prop.id, title: prop.title, address: prop.address, city: prop.city } : undefined,
        tenant: tenant ? {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          email: tenant.email,
          phone: tenant.phone,
          avatarUrl: tenant.avatar_url,
        } : undefined,
      }
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Renewals GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/renewals — Request a lease renewal
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', auth.userId)
      .single()

    const role = user?.active_role || user?.role
    if (role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { leaseId, notes } = body as { leaseId?: string; notes?: string }

    if (!leaseId) {
      return NextResponse.json({ error: 'ID du bail requis' }, { status: 400 })
    }

    // Fetch the lease
    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .eq('tenant_id', auth.userId)
      .maybeSingle()

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    if ((lease as any).status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Seul un bail actif peut être renouvelé' }, { status: 400 })
    }

    if ((lease as any).renewal_status === 'REQUESTED') {
      return NextResponse.json({ error: 'Une demande de renouvellement est déjà en cours' }, { status: 400 })
    }

    if ((lease as any).renewal_status === 'RENEWED') {
      return NextResponse.json({ error: 'Ce bail a déjà été renouvelé' }, { status: 400 })
    }

    // Update the lease with renewal request
    const { data: updated, error } = await supabase
      .from('leases')
      .update({
        renewal_status: 'REQUESTED',
        renewal_requested_at: new Date().toISOString(),
        renewal_notes: notes || null,
      } as any)
      .eq('id', leaseId)
      .select()
      .single()

    if (error) throw error

    // Notify the owner
    const { data: property } = await supabase
      .from('properties')
      .select('title')
      .eq('id', (lease as any).property_id)
      .maybeSingle()

    await notify({
      userId: (lease as any).owner_id,
      type: 'LEASE_UPDATE',
      title: 'Demande de renouvellement de bail',
      message: `Le locataire a demandé le renouvellement du bail pour "${(property as any)?.title || ''}".`,
      actionUrl: 'my-leases',
      entityId: leaseId,
    })

    const updatedAny = updated as any
    return NextResponse.json({
      data: {
        id: updatedAny.id,
        renewalStatus: updatedAny.renewal_status,
        renewalRequestedAt: updatedAny.renewal_requested_at,
        renewalNotes: updatedAny.renewal_notes,
      },
    })
  } catch (error) {
    console.error('Renewals POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
