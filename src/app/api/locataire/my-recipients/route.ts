import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

// GET /api/locataire/my-recipients — Get propriétaires and agences for a locataire
// Query params: search (filter by name)
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
    if (effectiveRole !== 'LOCATAIRE') {
      const resp = NextResponse.json({ error: 'Accès réservé aux locataires' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''

    const { data: leases } = await supabase
      .from('leases')
      .select(`
        id, property_id, tenant_id, owner_id,
        property:properties(
          id, title, city,
          images:property_images(order, url),
          mandats:mandats(
            status,
            agency:users!mandats_agency_id_fkey(
              id, first_name, last_name, role, company_name, phone, email, show_phone, show_email, avatar_url
            )
          )
        ),
        owner:users!leases_owner_id_fkey(
          id, first_name, last_name, role, company_name, phone, email, show_phone, show_email, avatar_url
        )
      `)
      .eq('tenant_id', userId)
      .in('status', ['ACTIVE', 'PENDING_SIGNATURE'])

    // Build deduplicated map of propriétaires
    const ownerMap = new Map<string, {
      id: string
      firstName: string
      lastName: string
      role: string
      companyName: string | null
      phone: string | null
      email: string | null
      avatarUrl: string | null
      type: 'PROPRIETAIRE'
      properties: Array<{ id: string; title: string; city: string }>
    }>()

    ;(leases || []).forEach((lease: any) => {
      const owner = lease.owner
      if (!owner) return
      if (!ownerMap.has(owner.id)) {
        ownerMap.set(owner.id, {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          role: owner.role,
          companyName: owner.company_name,
          phone: owner.show_phone ? owner.phone : null,
          email: owner.show_email ? owner.email : null,
          avatarUrl: owner.avatar_url,
          type: 'PROPRIETAIRE',
          properties: [],
        })
      }
      ownerMap.get(owner.id)!.properties.push({
        id: lease.property?.id || '',
        title: lease.property?.title || '',
        city: lease.property?.city || '',
      })
    })

    // Build deduplicated map of agences (from mandats on leased properties)
    const agenceMap = new Map<string, {
      id: string
      firstName: string
      lastName: string
      role: string
      companyName: string | null
      phone: string | null
      email: string | null
      avatarUrl: string | null
      type: 'AGENCE'
      properties: Array<{ id: string; title: string; city: string }>
    }>()

    ;(leases || []).forEach((lease: any) => {
      if (!lease.property?.mandats) return
      lease.property.mandats.forEach((mandat: any) => {
        if (mandat.status !== 'ACTIVE') return
        const agency = mandat.agency
        if (!agency) return
        if (!agenceMap.has(agency.id)) {
          agenceMap.set(agency.id, {
            id: agency.id,
            firstName: agency.first_name,
            lastName: agency.last_name,
            role: agency.role,
            companyName: agency.company_name,
            phone: agency.show_phone ? agency.phone : null,
            email: agency.show_email ? agency.email : null,
            avatarUrl: agency.avatar_url,
            type: 'AGENCE',
            properties: [],
          })
        }
        const existing = agenceMap.get(agency.id)!.properties
        if (!existing.find((p) => p.id === lease.property?.id)) {
          existing.push({
            id: lease.property?.id || '',
            title: lease.property?.title || '',
            city: lease.property?.city || '',
          })
        }
      })
    })

    // Combine all recipients
    const allRecipients = [
      ...Array.from(ownerMap.values()),
      ...Array.from(agenceMap.values()),
    ]

    // Apply search filter
    const filtered = search
      ? allRecipients.filter((r) => {
          const name = `${r.firstName} ${r.lastName}`.toLowerCase()
          const company = (r.companyName || '').toLowerCase()
          const query = search.toLowerCase()
          return name.includes(query) || company.includes(query)
        })
      : allRecipients

    const response = NextResponse.json({ recipients: filtered })
    return applyCookies(response)
  } catch (error) {
    console.error('my-recipients GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
