import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/locataire/my-recipients — Get propriétaires and agences for a locataire
// Query params: search (filter by name)
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès réservé aux locataires' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''

    // Find all active leases for this tenant
    const leases = await db.lease.findMany({
      where: {
        tenantId: userId,
        status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
      },
      select: {
        id: true,
        propertyId: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
            mandats: {
              where: { status: 'ACTIVE' },
              select: {
                agency: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    companyName: true,
                    phone: true,
                    email: true,
                    showPhone: true,
                    showEmail: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            companyName: true,
            phone: true,
            email: true,
            showPhone: true,
            showEmail: true,
            avatarUrl: true,
          },
        },
      },
    })

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

    leases.forEach((lease) => {
      const owner = lease.owner
      if (!ownerMap.has(owner.id)) {
        ownerMap.set(owner.id, {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          role: owner.role,
          companyName: owner.companyName,
          phone: owner.showPhone ? owner.phone : null,
          email: owner.showEmail ? owner.email : null,
          avatarUrl: owner.avatarUrl,
          type: 'PROPRIETAIRE',
          properties: [],
        })
      }
      ownerMap.get(owner.id)!.properties.push({
        id: lease.property.id,
        title: lease.property.title,
        city: lease.property.city,
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

    leases.forEach((lease) => {
      lease.property.mandats.forEach((mandat) => {
        const agency = mandat.agency
        if (!agenceMap.has(agency.id)) {
          agenceMap.set(agency.id, {
            id: agency.id,
            firstName: agency.firstName,
            lastName: agency.lastName,
            role: agency.role,
            companyName: agency.companyName,
            phone: agency.showPhone ? agency.phone : null,
            email: agency.showEmail ? agency.email : null,
            avatarUrl: agency.avatarUrl,
            type: 'AGENCE',
            properties: [],
          })
        }
        // Avoid duplicate properties for same agency
        const existing = agenceMap.get(agency.id)!.properties
        if (!existing.find((p) => p.id === lease.property.id)) {
          agenceMap.get(agency.id)!.properties.push({
            id: lease.property.id,
            title: lease.property.title,
            city: lease.property.city,
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

    return NextResponse.json({ recipients: filtered })
  } catch (error) {
    console.error('my-recipients GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
