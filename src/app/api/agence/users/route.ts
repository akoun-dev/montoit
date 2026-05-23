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

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')

    if (!role) {
      const resp = NextResponse.json({ error: 'Paramètre role requis' }, { status: 400 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()

    // Vérifier que l'utilisateur est bien une agence
    const { data: profile } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    // Récupérer les propriétaires via les mandats
    const { data: mandats } = await admin
      .from('mandats')
      .select('owner_id, status, created_at')
      .eq('agency_id', userId)

    const ownerIds = [...new Set(mandats?.map(m => m.owner_id).filter(Boolean) || [])]

    let clients: any[] = []

    if (ownerIds.length > 0) {
      // Récupérer les infos des propriétaires
      const { data: owners } = await admin
        .from('users')
        .select('id, first_name, last_name, email, phone, created_at, updated_at')
        .in('id', ownerIds)

      // Récupérer le nombre de propriétés par propriétaire via les mandats
      const { data: mandatsByOwner } = await admin
        .from('mandats')
        .select('owner_id, property_id')
        .in('owner_id', ownerIds)

      const propertyCounts = new Map<string, number>()
      mandatsByOwner?.forEach(m => {
        const current = propertyCounts.get(m.owner_id) || 0
        if (m.property_id) {
          propertyCounts.set(m.owner_id, current + 1)
        }
      })

      clients = owners?.map(owner => {
        const ownerMandats = mandats?.filter(m => m.owner_id === owner.id) || []
        const lastMandat = ownerMandats.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        // Déterminer le statut : actif s'il a un mandat actif, sinon prospect/inactif
        const hasActiveMandat = ownerMandats.some(m => m.status === 'ACTIVE')
        const status = hasActiveMandat ? 'actif' : ownerMandats.length > 0 ? 'inactif' : 'prospect'

        return {
          id: owner.id,
          firstName: owner.first_name || '',
          lastName: owner.last_name || '',
          email: owner.email,
          phone: owner.phone,
          status,
          propertiesCount: propertyCounts.get(owner.id) || 0,
          lastActivity: lastMandat?.created_at || owner.updated_at,
        }
      }) || []
    }

    const resp = NextResponse.json({ clients })
    return applyCookies(resp)
  } catch (error) {
    console.error('[API /agence/users] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies(resp)
  }
}