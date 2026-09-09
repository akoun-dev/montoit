import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    const effectiveRole = userRow?.role

    if (effectiveRole === 'LOCATAIRE') {
      const { data: leases } = await supabase
        .from('leases')
        .select(`
          id,
          property:properties(id, title, city, images:property_images(url, order)),
          owner:users!leases_owner_id_fkey(id, first_name, last_name, avatar_url, phone, email, role)
        `)
        .eq('tenant_id', userId)
        .in('status', ['ACTIVE', 'PENDING_SIGNATURE'])

      const ownerMap = new Map<string, {
        id: string
        firstName: string
        lastName: string
        avatarUrl: string | null
        phone: string | null
        email: string | null
        role: string
        properties: Array<{ id: string; title: string; city: string; leaseId: string }>
      }>()

      ;(leases || []).forEach((lease: Record<string, unknown>) => {
        const owner = (lease as any).owner
        const property = (lease as any).property
        if (!owner || !ownerMap.has(owner.id)) {
          if (!owner) return
          ownerMap.set(owner.id, {
            id: owner.id,
            firstName: owner.first_name,
            lastName: owner.last_name,
            avatarUrl: owner.avatar_url,
            phone: owner.phone,
            email: owner.email,
            role: owner.role,
            properties: [],
          })
        }
        if (owner && property) {
          const images = (property as any).images || []
          ownerMap.get(owner.id)!.properties.push({
            id: property.id,
            title: property.title,
            city: property.city,
            leaseId: lease.id as string,
          })
        }
      })

      const propertyIds = (leases || []).map((l: Record<string, unknown>) => ((l as any).property as any)?.id).filter(Boolean)

      let mandats: Record<string, unknown>[] = []
      if (propertyIds.length > 0) {
        const { data: m } = await supabase
          .from('mandats')
          .select(`
            agency:users!mandats_agency_id_fkey(id, first_name, last_name, avatar_url, phone, email, role),
            property:properties(id, title, city)
          `)
          .in('property_id', propertyIds)
          .eq('status', 'ACTIVE')
        mandats = (m as any) || []
      }

      const agenceMap = new Map<string, {
        id: string
        firstName: string
        lastName: string
        avatarUrl: string | null
        phone: string | null
        email: string | null
        role: string
        properties: Array<{ id: string; title: string; city: string }>
      }>()

      mandats.forEach((mandat: Record<string, unknown>) => {
        const agency = (mandat as any).agency
        const property = (mandat as any).property
        if (!agency || !agenceMap.has(agency.id)) {
          if (!agency) return
          agenceMap.set(agency.id, {
            id: agency.id,
            firstName: agency.first_name,
            lastName: agency.last_name,
            avatarUrl: agency.avatar_url,
            phone: agency.phone,
            email: agency.email,
            role: agency.role,
            properties: [],
          })
        }
        if (agency && property) {
          agenceMap.get(agency.id)!.properties.push({
            id: property.id,
            title: property.title,
            city: property.city,
          })
        }
      })

      const resp = NextResponse.json({
        owners: Array.from(ownerMap.values()),
        agences: Array.from(agenceMap.values()),
      })
      return applyCookies(resp)
    }

    if (effectiveRole === 'PROPRIETAIRE') {
      const { data: leases } = await supabase
        .from('leases')
        .select(`
          id,
          tenant:users!leases_tenant_id_fkey(id, first_name, last_name, avatar_url, phone, email, role),
          property:properties(id, title, city)
        `)
        .eq('owner_id', userId)
        .in('status', ['ACTIVE', 'PENDING_SIGNATURE'])

      const tenantMap = new Map<string, {
        id: string
        firstName: string
        lastName: string
        avatarUrl: string | null
        phone: string | null
        email: string | null
        role: string
        properties: Array<{ id: string; title: string; city: string; leaseId: string }>
      }>()

      ;(leases || []).forEach((lease: Record<string, unknown>) => {
        const tenant = (lease as any).tenant
        const property = (lease as any).property
        if (!tenant) return
        if (!tenantMap.has(tenant.id)) {
          tenantMap.set(tenant.id, {
            id: tenant.id,
            firstName: tenant.first_name,
            lastName: tenant.last_name,
            avatarUrl: tenant.avatar_url,
            phone: tenant.phone,
            email: tenant.email,
            role: tenant.role,
            properties: [],
          })
        }
        if (property) {
          tenantMap.get(tenant.id)!.properties.push({
            id: property.id,
            title: property.title,
            city: property.city,
            leaseId: lease.id as string,
          })
        }
      })

      const { data: properties } = await supabase.from('properties').select('id, title, city').eq('owner_id', userId)
      const propertyIds = (properties ?? []).map((property) => property.id)
      if (propertyIds.length > 0) {
        const { data: applications } = await supabase
          .from('applications')
          .select('tenant_id, property_id')
          .in('property_id', propertyIds)
          .in('status', ['SUBMITTED', 'TC_REVIEW', 'VALIDATED', 'ACCEPTED'])
        const tenantIds = [...new Set((applications ?? []).map((application: any) => application.tenant_id).filter(Boolean))]
        const { data: applicants } = tenantIds.length ? await supabase.from('users').select('id, first_name, last_name, avatar_url, phone, email, role').in('id', tenantIds) : { data: [] as any[] }
        const propertyMap = new Map((properties ?? []).map((property) => [property.id, property]))
        for (const tenant of applicants ?? []) {
          if (!tenantMap.has(tenant.id)) tenantMap.set(tenant.id, { id: tenant.id, firstName: tenant.first_name, lastName: tenant.last_name, avatarUrl: tenant.avatar_url, phone: tenant.phone, email: tenant.email, role: tenant.role, properties: [] })
          for (const application of (applications ?? []) as any[]) if (application.tenant_id === tenant.id) {
            const property = propertyMap.get(application.property_id)
            if (property && !tenantMap.get(tenant.id)!.properties.some((item) => item.id === property.id)) tenantMap.get(tenant.id)!.properties.push({ id: property.id, title: property.title, city: property.city, leaseId: '' })
          }
        }
      }

      const resp = NextResponse.json({
        tenants: Array.from(tenantMap.values()),
      })
      return applyCookies(resp)
    }

    if (effectiveRole === 'AGENCE') {
      const { data: mandats } = await supabase
        .from('mandats')
        .select('property_id')
        .eq('agency_id', userId)
        .eq('status', 'ACTIVE') as any

      const propertyIds = (mandats || []).map((m: any) => m.property_id).filter(Boolean)

      let leases: Record<string, unknown>[] = []
      if (propertyIds.length > 0) {
        const { data: l } = await supabase
          .from('leases')
          .select(`
            id,
            tenant:users!leases_tenant_id_fkey(id, first_name, last_name, avatar_url, phone, email, role),
            property:properties(id, title, city)
          `)
          .in('property_id', propertyIds)
          .in('status', ['ACTIVE', 'PENDING_SIGNATURE'])
        leases = (l as any) || []
      }

      const tenantMap = new Map<string, {
        id: string
        firstName: string
        lastName: string
        avatarUrl: string | null
        phone: string | null
        email: string | null
        role: string
        properties: Array<{ id: string; title: string; city: string; leaseId: string }>
      }>()

      ;(leases || []).forEach((lease: Record<string, unknown>) => {
        const tenant = (lease as any).tenant
        const property = (lease as any).property
        if (!tenant) return
        if (!tenantMap.has(tenant.id)) {
          tenantMap.set(tenant.id, {
            id: tenant.id,
            firstName: tenant.first_name,
            lastName: tenant.last_name,
            avatarUrl: tenant.avatar_url,
            phone: tenant.phone,
            email: tenant.email,
            role: tenant.role,
            properties: [],
          })
        }
        if (property) {
          tenantMap.get(tenant.id)!.properties.push({
            id: property.id,
            title: property.title,
            city: property.city,
            leaseId: lease.id as string,
          })
        }
      })

      let owners: Record<string, unknown>[] = []
      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select(`
            owner:users!properties_owner_id_fkey(id, first_name, last_name, avatar_url, phone, email, role)
          `)
          .in('id', propertyIds)
        owners = (props as any) || []
      }

      const ownerMap = new Map<string, {
        id: string
        firstName: string
        lastName: string
        avatarUrl: string | null
        phone: string | null
        email: string | null
        role: string
      }>()

      owners.forEach((p: Record<string, unknown>) => {
        const owner = (p as any).owner
        if (!owner || ownerMap.has(owner.id)) return
        ownerMap.set(owner.id, {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          avatarUrl: owner.avatar_url,
          phone: owner.phone,
          email: owner.email,
          role: owner.role,
        })
      })

      const resp = NextResponse.json({
        tenants: Array.from(tenantMap.values()),
        owners: Array.from(ownerMap.values()),
      })
      return applyCookies(resp)
    }

    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  } catch (error) {
    console.error('Contacts GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
