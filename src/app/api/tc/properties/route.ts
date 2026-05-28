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
    const search = searchParams.get('search')
    const commune = searchParams.get('commune')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase
      .from('properties')
      .select('*, owner:users!owner_id(id, first_name, last_name, email, phone, avatar_url, created_at), images:property_images(id, url, order)', { count: 'exact' })
      .neq('status', 'DRAFT')

    // Filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,commune.ilike.%${search}%,address.ilike.%${search}%`)
    }
    if (commune) {
      query = query.ilike('commune', `%${commune}%`)
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (status) {
      query = query.eq('status', status)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .order('order', { foreignTable: 'property_images', ascending: true })

    const { data: propertiesData, count: total } = await (query as any)

    if (!propertiesData) {
      const resp = NextResponse.json({ properties: [], pagination: { total: 0, limit, offset, hasMore: false } })
      return applyCookies(resp)
    }

    // Get inventory report counts per property
    const propertyIds = (propertiesData as any[]).map((p: any) => p.id)
    let inventoryCounts = new Map<string, number>()

    if (propertyIds.length > 0) {
      const { data: reportCounts } = await (supabase
        .from('inventory_reports') as any)
        .select('property_id', { count: 'exact', head: false })
        .in('property_id', propertyIds)
        .eq('status', 'COMPLETED')

      if (reportCounts) {
        const countMap = new Map<string, number>()
        for (const r of reportCounts as any[]) {
          countMap.set(r.property_id, (countMap.get(r.property_id) || 0) + 1)
        }
        inventoryCounts = countMap
      }
    }

    const properties = ((propertiesData ?? []) as any[]).map((p: any) => ({
      id: p.id,
      title: p.title,
      address: p.address,
      city: p.city,
      commune: p.commune,
      type: p.type,
      status: p.status,
      price: p.price,
      area: p.area,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      isVerified: p.is_verified,
      isFurnished: p.is_furnished,
      hasParking: p.has_parking,
      hasClimate: p.has_climate,
      ownerId: p.owner_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      owner: p.owner ? {
        id: p.owner.id,
        firstName: p.owner.first_name,
        lastName: p.owner.last_name,
        email: p.owner.email,
        phone: p.owner.phone,
      } : null,
      images: (p.images ?? []).map((img: any) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
      inventoryReportCount: inventoryCounts.get(p.id) || 0,
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
    console.error('TC properties GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
