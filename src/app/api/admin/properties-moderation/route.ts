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

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé — rôle ADMIN requis' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const type = searchParams.get('type')
    const commune = searchParams.get('commune')
    const search = searchParams.get('search')
    const statusFilter = searchParams.get('status')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase.from('properties').select('*', { count: 'exact' })
    query = query.eq('status', statusFilter || 'PENDING_VERIFICATION')
    if (type) query = query.eq('type', type)
    if (commune) query = query.ilike('commune', `%${commune}%`)
    if (search) {
      query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%,commune.ilike.%${search}%`)
    }

    const { data: properties, count: total } = await query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const propertyIds = (properties ?? []).map(p => p.id)
    const ownerIds = [...new Set((properties ?? []).map(p => p.owner_id).filter(Boolean))]

    const [{ data: owners }, { data: images }] = await Promise.all([
      ownerIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, email, phone, avatar_url, role').in('id', ownerIds)
        : { data: [] as any[] },
      propertyIds.length > 0
        ? supabase.from('property_images').select('*').in('property_id', propertyIds).order('order', { ascending: true })
        : { data: [] as any[] },
    ])

    const ownerMap = new Map((owners ?? []).map((o: any) => [o.id, o]))
    const imagesByProp = new Map<string, any[]>()
    for (const img of images ?? []) {
      if (!imagesByProp.has(img.property_id)) imagesByProp.set(img.property_id, [])
      imagesByProp.get(img.property_id)!.push(img)
    }

    const result = (properties ?? []).map((p: any) => {
      const owner = ownerMap.get(p.owner_id)
      const propImages = imagesByProp.get(p.id) ?? []
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        type: p.type,
        price: p.price,
        address: p.address,
        city: p.city,
        commune: p.commune,
        area: p.area,
        bedrooms: p.bedrooms,
        status: p.status,
        isVerified: p.is_verified,
        rentalTerms: p.rental_terms,
        ownerId: p.owner_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        owner: owner ? {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          email: owner.email,
          phone: owner.phone,
          avatarUrl: owner.avatar_url,
          role: owner.role,
        } : null,
        image: propImages.length > 0 ? propImages[0].url : null,
      }
    })

    const resp = NextResponse.json({
      properties: result,
      pagination: { total: total ?? 0, limit, offset, hasMore: offset + limit < (total ?? 0) },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin properties-moderation GET error:', error)
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
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé — rôle ADMIN requis' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { propertyId, action, comment } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE ou REJECT' }, { status: 400 })
    }

    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.status !== 'PENDING_VERIFICATION' && property.status !== 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Ce bien n\'est pas en attente de modération' },
        { status: 400 }
      )
    }

    let updatedProperty: any

    if (action === 'APPROVE') {
      const { data: updated } = await supabase
        .from('properties')
        .update({ status: 'ACTIVE', is_verified: true } as any)
        .eq('id', propertyId)
        .select()
        .single()

      updatedProperty = updated

      await supabase.from('audit_logs').insert({
        action: 'PROPERTY_APPROVED_BY_ADMIN',
        entity: 'Property',
        entity_id: propertyId,
        details: JSON.stringify({ comment: comment || null, adminId: userId }),
        user_id: userId,
      } as any)

      await notify({
        userId: property.owner_id,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce approuvée',
        message: `Votre annonce "${property.title}" a été approuvée par l'administration et est maintenant visible.`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })
    } else {
      const rentalTerms = property.rental_terms
        ? (typeof property.rental_terms === 'string' ? JSON.parse(property.rental_terms) : property.rental_terms)
        : {}

      const { data: updated } = await supabase
        .from('properties')
        .update({
          status: 'SUSPENDED',
          rental_terms: JSON.stringify({
            ...rentalTerms,
            rejectionReason: comment || 'Non spécifié',
            rejectedAt: new Date().toISOString(),
            rejectedBy: userId,
          }),
        } as any)
        .eq('id', propertyId)
        .select()
        .single()

      updatedProperty = updated

      await supabase.from('audit_logs').insert({
        action: 'PROPERTY_REJECTED_BY_ADMIN',
        entity: 'Property',
        entity_id: propertyId,
        details: JSON.stringify({ comment: comment || null, adminId: userId }),
        user_id: userId,
      } as any)

      await notify({
        userId: property.owner_id,
        type: 'DOSSIER_UPDATE',
        title: 'Annonce rejetée',
        message: `Votre annonce "${property.title}" a été rejetée. Raison : ${comment || 'Non spécifié'}`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })
    }

    const [{ data: owners }, { data: images }] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, email, phone').eq('id', updatedProperty.owner_id),
      supabase.from('property_images').select('*').eq('property_id', propertyId).order('order', { ascending: true }),
    ])

    const owner = owners?.[0] ?? null
    const propImages = images ?? []

    const resp = NextResponse.json({
      property: {
        ...updatedProperty,
        owner: owner ? {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          email: owner.email,
          phone: owner.phone,
        } : null,
        images: propImages.map((i: any) => ({
          id: i.id,
          url: i.url,
          order: i.order,
          propertyId: i.property_id,
          createdAt: i.created_at,
        })),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin properties-moderation PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
