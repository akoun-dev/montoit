import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/messages/contacts — Get the locataire's propriétaires and agences
// Returns owners and agencies the tenant has active leases with
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    // Only LOCATAIRE can use this endpoint to find their owners/agences
    if (effectiveRole === 'LOCATAIRE') {
      // Find all active leases for this tenant
      const leases = await db.lease.findMany({
        where: {
          tenantId: userId,
          status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
        },
        select: {
          id: true,
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
            },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              phone: true,
              email: true,
              role: true,
            },
          },
        },
      })

      // Deduplicate owners (a tenant might have multiple leases with the same owner)
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

      leases.forEach((lease) => {
        const owner = lease.owner
        if (!ownerMap.has(owner.id)) {
          ownerMap.set(owner.id, {
            id: owner.id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            avatarUrl: owner.avatarUrl,
            phone: owner.phone,
            email: owner.email,
            role: owner.role,
            properties: [],
          })
        }
        ownerMap.get(owner.id)!.properties.push({
          id: lease.property.id,
          title: lease.property.title,
          city: lease.property.city,
          leaseId: lease.id,
        })
      })

      // Also find agences managing properties the tenant has leases for
      const propertyIds = leases.map((l) => l.property.id)
      const mandats = propertyIds.length > 0
        ? await db.mandat.findMany({
            where: {
              propertyId: { in: propertyIds },
              status: 'ACTIVE',
            },
            select: {
              agency: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  phone: true,
                  email: true,
                  role: true,
                },
              },
              property: {
                select: { id: true, title: true, city: true },
              },
            },
          })
        : []

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

      mandats.forEach((mandat) => {
        const agency = mandat.agency
        if (!agenceMap.has(agency.id)) {
          agenceMap.set(agency.id, {
            id: agency.id,
            firstName: agency.firstName,
            lastName: agency.lastName,
            avatarUrl: agency.avatarUrl,
            phone: agency.phone,
            email: agency.email,
            role: agency.role,
            properties: [],
          })
        }
        agenceMap.get(agency.id)!.properties.push({
          id: mandat.property.id,
          title: mandat.property.title,
          city: mandat.property.city,
        })
      })

      return NextResponse.json({
        owners: Array.from(ownerMap.values()),
        agences: Array.from(agenceMap.values()),
      })
    }

    // For PROPRIETAIRE: find their tenants
    if (effectiveRole === 'PROPRIETAIRE') {
      const leases = await db.lease.findMany({
        where: {
          ownerId: userId,
          status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
        },
        select: {
          id: true,
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              phone: true,
              email: true,
              role: true,
            },
          },
          property: {
            select: { id: true, title: true, city: true },
          },
        },
      })

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

      leases.forEach((lease) => {
        const tenant = lease.tenant
        if (!tenantMap.has(tenant.id)) {
          tenantMap.set(tenant.id, {
            id: tenant.id,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            avatarUrl: tenant.avatarUrl,
            phone: tenant.phone,
            email: tenant.email,
            role: tenant.role,
            properties: [],
          })
        }
        tenantMap.get(tenant.id)!.properties.push({
          id: lease.property.id,
          title: lease.property.title,
          city: lease.property.city,
          leaseId: lease.id,
        })
      })

      return NextResponse.json({
        tenants: Array.from(tenantMap.values()),
      })
    }

    // For AGENCE: find tenants of their managed properties
    if (effectiveRole === 'AGENCE') {
      const mandats = await db.mandat.findMany({
        where: { agencyId: userId, status: 'ACTIVE' },
        select: { propertyId: true },
      })
      const propertyIds = mandats.map((m) => m.propertyId)

      const leases = propertyIds.length > 0
        ? await db.lease.findMany({
            where: {
              propertyId: { in: propertyIds },
              status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
            },
            select: {
              id: true,
              tenant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  phone: true,
                  email: true,
                  role: true,
                },
              },
              property: {
                select: { id: true, title: true, city: true },
              },
            },
          })
        : []

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

      leases.forEach((lease) => {
        const tenant = lease.tenant
        if (!tenantMap.has(tenant.id)) {
          tenantMap.set(tenant.id, {
            id: tenant.id,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            avatarUrl: tenant.avatarUrl,
            phone: tenant.phone,
            email: tenant.email,
            role: tenant.role,
            properties: [],
          })
        }
        tenantMap.get(tenant.id)!.properties.push({
          id: lease.property.id,
          title: lease.property.title,
          city: lease.property.city,
          leaseId: lease.id,
        })
      })

      // Also return the owners
      const owners = propertyIds.length > 0
        ? await db.property.findMany({
            where: { id: { in: propertyIds } },
            select: {
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  phone: true,
                  email: true,
                  role: true,
                },
              },
            },
          })
        : []

      const ownerMap = new Map<string, {
        id: string
        firstName: string
        lastName: string
        avatarUrl: string | null
        phone: string | null
        email: string | null
        role: string
      }>()

      owners.forEach((p) => {
        const owner = p.owner
        if (!ownerMap.has(owner.id)) {
          ownerMap.set(owner.id, {
            id: owner.id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            avatarUrl: owner.avatarUrl,
            phone: owner.phone,
            email: owner.email,
            role: owner.role,
          })
        }
      })

      return NextResponse.json({
        tenants: Array.from(tenantMap.values()),
        owners: Array.from(ownerMap.values()),
      })
    }

    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  } catch (error) {
    console.error('Contacts GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
