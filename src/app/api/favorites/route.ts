import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type FavProperty = {
  id: string
  title: string
  type: string
  price: number
  currency: string
  area: number
  bedrooms: number | null
  city: string
  commune: string | null
  address: string
  rental_status: string
  is_furnished: boolean
  is_verified: boolean
  views_count: number
  owner_id: string
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()

    const { data: favRows, error } = await admin
      .from('favorites')
      .select(`
        id, created_at, property_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const propertyIds = [...new Set((favRows ?? []).map((r) => r.property_id).filter(Boolean))]

    let propMap = new Map<string, FavProperty>()
    let imgMap = new Map<string, { url: string }[]>()
    let ownerMap = new Map<string, { id: string; first_name: string; last_name: string }>()

    if (propertyIds.length > 0) {
      const [propsRes, imgsRes] = await Promise.all([
        admin.from('properties').select('*').in('id', propertyIds),
        admin.from('property_images').select('url, property_id').in('property_id', propertyIds).order('order', { ascending: true }),
      ])

      for (const p of propsRes.data ?? []) {
        propMap.set(p.id, p as unknown as FavProperty)
      }

      for (const img of imgsRes.data ?? []) {
        const list = imgMap.get(img.property_id) ?? []
        list.push({ url: img.url })
        imgMap.set(img.property_id, list)
      }

      const ownerIds = [...new Set((propsRes.data ?? []).map((p) => p.owner_id).filter(Boolean))]
      if (ownerIds.length > 0) {
        const { data: owners } = await admin
          .from('users')
          .select('id, first_name, last_name')
          .in('id', ownerIds)
        for (const o of owners ?? []) {
          ownerMap.set(o.id, o)
        }
      }
    }

    const favorites = (favRows ?? []).map((fav) => {
      const prop = propMap.get(fav.property_id)
      if (!prop) return null
      const owner = ownerMap.get(prop.owner_id)
      return {
        id: fav.id,
        createdAt: fav.created_at,
        property: {
          ...prop,
          images: imgMap.get(prop.id) ?? [],
          owner: owner
            ? { id: owner.id, firstName: owner.first_name, lastName: owner.last_name }
            : null,
        },
      }
    }).filter(Boolean)

    const response = NextResponse.json({ favorites })
    return applyCookies(response)
  } catch (error) {
    console.error('Favorites GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { propertyId } = await req.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId requis' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()

    const { data: property } = await admin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .maybeSingle()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    const { data: existing } = await admin
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from('favorites')
        .delete()
        .eq('id', existing.id)

      if (error) throw error

      const response = NextResponse.json({ isFavorite: false, action: 'removed' })
      return applyCookies(response)
    }

    const { error } = await admin
      .from('favorites')
      .insert({ id: crypto.randomUUID(), user_id: userId, property_id: propertyId })

    if (error) throw error

    const response = NextResponse.json({ isFavorite: true, action: 'added' })
    return applyCookies(response)
  } catch (error) {
    console.error('Favorites POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
