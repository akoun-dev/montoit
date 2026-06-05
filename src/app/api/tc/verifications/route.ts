import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')

    if (propertyId) {
      const { data: property } = await ((supabase as any)
        .from('properties')
        .select('*, owner:users!owner_id(id, first_name, last_name, email, phone, avatar_url, created_at), images:property_images(id, url, order)')
        .eq('id', propertyId)
        .order('order', { foreignTable: 'property_images', ascending: true })
        .single() as any)

      if (!property) {
        return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
      }

      // Le TC ne doit pas voir les biens en brouillon
      if (property.status === 'DRAFT') {
        return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
      }

      const mappedProperty = {
        id: property.id,
        title: property.title,
        address: property.address,
        city: property.city,
        commune: property.commune,
        type: property.type,
        status: property.status,
        isVerified: property.is_verified,
        ownerId: property.owner_id,
        createdAt: property.created_at,
        updatedAt: property.updated_at,
        owner: property.owner ? {
          id: property.owner.id,
          firstName: property.owner.first_name,
          lastName: property.owner.last_name,
          email: property.owner.email,
          phone: property.owner.phone,
          avatarUrl: property.owner.avatar_url,
          createdAt: property.owner.created_at,
        } : null,
        images: (property.images ?? []).map((img: any) => ({
          id: img.id,
          url: img.url,
          order: img.order,
        })),
      }

      const resp = NextResponse.json({ property: mappedProperty })
      return applyCookies(resp)
    }

    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const commune = searchParams.get('commune')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const statusFilter = searchParams.get('status')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase
      .from('properties')
      .select('*, owner:users!owner_id(id, first_name, last_name, email, phone, avatar_url, created_at), images:property_images(id, url, order)', { count: 'exact' })
      .eq('status', statusFilter || 'PENDING_VERIFICATION')

    if (commune) query = query.ilike('commune', `%${commune}%`)
    if (type) query = query.eq('type', type)
    if (search) {
      query = query.or(`title.ilike.%${search}%,commune.ilike.%${search}%,address.ilike.%${search}%`)
    }

    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
      .order('order', { foreignTable: 'property_images', ascending: true })

    const { data: propertiesData, count: total } = await (query as any)

    const properties = ((propertiesData ?? []) as any[]).map((p: any) => ({
      id: p.id,
      title: p.title,
      address: p.address,
      city: p.city,
      commune: p.commune,
      type: p.type,
      status: p.status,
      isVerified: p.is_verified,
      ownerId: p.owner_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      owner: p.owner ? {
        id: p.owner.id,
        firstName: p.owner.first_name,
        lastName: p.owner.last_name,
        email: p.owner.email,
        phone: p.owner.phone,
        avatarUrl: p.owner.avatar_url,
        createdAt: p.owner.created_at,
      } : null,
      images: (p.images ?? []).map((img: any) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
    }))

    const resp = NextResponse.json({
      properties,
      pagination: {
        total: total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (total ?? 0),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC verifications GET error:', error)
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

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
    }

    const body = await req.json()
    const { propertyId, action, comment } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE ou REJECT' }, { status: 400 })
    }

    const { data: property } = await ((supabase as any)
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single() as any)

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }
    if (property.status !== 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'Ce bien n\'est pas en attente de vérification' },
        { status: 400 }
      )
    }

    let updatedProperty: any

    if (action === 'APPROVE') {
      // Vérifier qu'il existe au moins un état des lieux COMPLETED
      const { data: inventoryReports, count: inventoryCount } = await (supabase
        .from('inventory_reports') as any)
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('status', 'COMPLETED')

      if (!inventoryCount) {
        return NextResponse.json(
          { error: 'Un état des lieux (inventaire) COMPLETED est obligatoire avant de pouvoir approuver ce bien. Veuillez d\'abord créer un état des lieux.' },
          { status: 400 }
        )
      }

      const { data: updated } = await ((supabase as any)
        .from('properties')
        .update({
          status: 'ACTIVE',
          is_verified: true,
        })
        .eq('id', propertyId)
        .select('*, owner:users!owner_id(id, first_name, last_name, email, phone), images:property_images(id, url, order)')
        .order('order', { foreignTable: 'property_images', ascending: true })
        .single() as any)
      updatedProperty = updated

      await (supabase.from('audit_logs') as any).insert({
        action: 'PROPERTY_APPROVED',
        entity: 'Property',
        entity_id: propertyId,
        details: JSON.stringify({ comment: comment || null, reviewerId: userId }),
        user_id: userId,
      })

      await notify({
        userId: property.owner_id,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce approuvée',
        message: `Votre annonce "${property.title}" a été approuvée et est maintenant visible.`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })

      // Notifier l'agence si le bien est géré via un mandat actif
      const { data: activeMandats } = await (supabase
        .from('mandats') as any)
        .select('agency_id')
        .eq('property_id', propertyId)
        .eq('status', 'ACTIVE')

      if (activeMandats && (activeMandats as any[]).length > 0) {
        const agencyIds: string[] = [...new Set((activeMandats as any[]).map((m: any) => m.agency_id))]
        for (const agencyId of agencyIds) {
          await notify({
            userId: agencyId,
            type: 'DOSSIER_UPDATE',
            title: 'Bien sous gestion approuvé',
            message: `Le bien "${property.title}" que vous gérez a été approuvé par le Tiers de Confiance et est maintenant visible.`,
            actionUrl: 'portfolio',
            entityId: propertyId,
          })
        }
      }
    } else {
      const existingTerms = property.rental_terms
        ? (typeof property.rental_terms === 'string' ? JSON.parse(property.rental_terms) : property.rental_terms)
        : {}

      const { data: updated } = await ((supabase as any)
        .from('properties')
        .update({
          status: 'SUSPENDED',
          rental_terms: JSON.stringify({
            ...existingTerms,
            rejectionReason: comment || 'Non spécifié',
            rejectedAt: new Date().toISOString(),
            rejectedBy: userId,
          }),
        })
        .eq('id', propertyId)
        .select('*, owner:users!owner_id(id, first_name, last_name, email, phone), images:property_images(id, url, order)')
        .order('order', { foreignTable: 'property_images', ascending: true })
        .single() as any)
      updatedProperty = updated

      await (supabase.from('audit_logs') as any).insert({
        action: 'PROPERTY_REJECTED',
        entity: 'Property',
        entity_id: propertyId,
        details: JSON.stringify({ comment: comment || null, reviewerId: userId }),
        user_id: userId,
      })

      await notify({
        userId: property.owner_id,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce rejetée',
        message: `Votre annonce "${property.title}" a été rejetée. Raison : ${comment || 'Non spécifié'}`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })

      // Notifier l'agence si le bien est géré via un mandat actif
      const { data: activeMandatsRej } = await (supabase
        .from('mandats') as any)
        .select('agency_id')
        .eq('property_id', propertyId)
        .eq('status', 'ACTIVE')

      if (activeMandatsRej && (activeMandatsRej as any[]).length > 0) {
        const agencyIds: string[] = [...new Set((activeMandatsRej as any[]).map((m: any) => m.agency_id))]
        for (const agencyId of agencyIds) {
          await notify({
            userId: agencyId,
            type: 'DOSSIER_UPDATE',
            title: 'Bien sous gestion rejeté',
            message: `Le bien "${property.title}" que vous gérez a été rejeté par le Tiers de Confiance. Raison : ${comment || 'Non spécifié'}`,
            actionUrl: 'portfolio',
            entityId: propertyId,
          })
        }
      }
    }

    const updatedPropertyAny = updatedProperty as any
    const mappedProperty = {
      id: updatedPropertyAny.id,
      title: updatedPropertyAny.title,
      address: updatedPropertyAny.address,
      city: updatedPropertyAny.city,
      commune: updatedPropertyAny.commune,
      type: updatedPropertyAny.type,
      status: updatedPropertyAny.status,
      isVerified: updatedPropertyAny.is_verified,
      ownerId: updatedPropertyAny.owner_id,
      createdAt: updatedPropertyAny.created_at,
      updatedAt: updatedPropertyAny.updated_at,
      owner: updatedPropertyAny.owner ? {
        id: updatedPropertyAny.owner.id,
        firstName: updatedPropertyAny.owner.first_name,
        lastName: updatedPropertyAny.owner.last_name,
        email: updatedPropertyAny.owner.email,
        phone: updatedPropertyAny.owner.phone,
      } : null,
      images: (updatedPropertyAny.images ?? []).map((img: any) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
    }

    const resp = NextResponse.json({ property: mappedProperty })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC verifications PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
