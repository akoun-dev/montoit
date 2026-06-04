import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

const VALID_PROPERTY_TYPES = [
  'APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA',
] as const

const MAX_NAME_LENGTH = 100
const MAX_CITY_LENGTH = 100
const MAX_QUERY_LENGTH = 200

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function validateAlertInput(body: {
  name?: string
  searchQuery?: string
  city?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
}): string | null {
  if (body.name !== undefined && !body.name?.trim()) {
    return 'Le nom de l\'alerte est requis'
  }
  if (body.name !== undefined && body.name.trim().length > MAX_NAME_LENGTH) {
    return `Le nom ne doit pas dépasser ${MAX_NAME_LENGTH} caractères`
  }
  if (body.searchQuery && body.searchQuery.length > MAX_QUERY_LENGTH) {
    return `Le mot-clé ne doit pas dépasser ${MAX_QUERY_LENGTH} caractères`
  }
  if (body.city && body.city.length > MAX_CITY_LENGTH) {
    return `La ville ne doit pas dépasser ${MAX_CITY_LENGTH} caractères`
  }
  if (body.propertyType && !VALID_PROPERTY_TYPES.includes(body.propertyType as typeof VALID_PROPERTY_TYPES[number])) {
    return `Type de bien invalide. Valeurs acceptées : ${VALID_PROPERTY_TYPES.join(', ')}`
  }
  if (body.minPrice !== undefined && body.minPrice < 0) {
    return 'Le prix minimum ne peut pas être négatif'
  }
  if (body.maxPrice !== undefined && body.maxPrice < 0) {
    return 'Le prix maximum ne peut pas être négatif'
  }
  if (
    body.minPrice !== undefined &&
    body.maxPrice !== undefined &&
    body.minPrice > body.maxPrice
  ) {
    return 'Le prix minimum ne peut pas être supérieur au prix maximum'
  }
  return null
}

function mapAlert(alert: Record<string, unknown>) {
  return {
    id: alert.id,
    userId: alert.user_id,
    name: alert.name,
    searchQuery: alert.search_query,
    city: alert.city,
    propertyType: alert.property_type,
    minPrice: alert.min_price,
    maxPrice: alert.max_price,
    isActive: alert.is_active,
    lastNotifiedAt: alert.last_notified_at,
    createdAt: alert.created_at,
    updatedAt: alert.updated_at,
  }
}

// GET /api/search-alerts — List search alerts for the current tenant
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
    if (role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: alerts, error } = await supabase
      .from('search_alerts')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      data: (alerts ?? []).map(mapAlert),
    })
  } catch (error) {
    console.error('Search alerts GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/search-alerts — Create a new search alert
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
    const {
      name,
      searchQuery,
      city,
      propertyType,
      minPrice,
      maxPrice,
    } = body as {
      name?: string
      searchQuery?: string
      city?: string
      propertyType?: string
      minPrice?: number
      maxPrice?: number
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom de l\'alerte est requis' }, { status: 400 })
    }

    const validationError = validateAlertInput({ name, searchQuery, city, propertyType, minPrice, maxPrice })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const id = generateId()
    const insertData: Record<string, unknown> = {
      id,
      user_id: auth.userId,
      name: name!.trim(),
    }
    if (searchQuery) insertData.search_query = searchQuery
    if (city) insertData.city = city
    if (propertyType) insertData.property_type = propertyType
    if (minPrice !== undefined) insertData.min_price = minPrice
    if (maxPrice !== undefined) insertData.max_price = maxPrice

    const sb = supabase.from('search_alerts') as any
    const { data: alert, error } = await sb
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: mapAlert(alert) })
  } catch (error) {
    console.error('Search alerts POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/search-alerts — Update an alert (toggle active, edit params)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { searchParams } = new URL(req.url)
    const alertId = searchParams.get('id')
    if (!alertId) {
      return NextResponse.json({ error: 'ID de l\'alerte requis' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('search_alerts')
      .select('id')
      .eq('id', alertId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
    }

    const body = await req.json()

    // Validate the fields being updated
    const validationError = validateAlertInput({
      name: body.name,
      searchQuery: body.searchQuery,
      city: body.city,
      propertyType: body.propertyType,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
    })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.searchQuery !== undefined) updateData.search_query = body.searchQuery
    if (body.city !== undefined) updateData.city = body.city
    if (body.propertyType !== undefined) updateData.property_type = body.propertyType
    if (body.minPrice !== undefined) updateData.min_price = body.minPrice
    if (body.maxPrice !== undefined) updateData.max_price = body.maxPrice
    if (body.isActive !== undefined) updateData.is_active = body.isActive

    const sb2 = supabase.from('search_alerts') as any
    const { data: updated, error } = await sb2
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: mapAlert(updated) })
  } catch (error) {
    console.error('Search alerts PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/search-alerts — Delete an alert
export async function DELETE(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { searchParams } = new URL(req.url)
    const alertId = searchParams.get('id')
    if (!alertId) {
      return NextResponse.json({ error: 'ID de l\'alerte requis' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('search_alerts')
      .select('id')
      .eq('id', alertId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
    }

    const sb3 = supabase.from('search_alerts') as any
    const { error } = await sb3
      .delete()
      .eq('id', alertId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Search alerts DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
