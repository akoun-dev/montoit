import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

const PROPERTY_TYPES = new Set(['APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA', 'CHAMBRE', 'CONCESSION', 'IMMEUBLE'])

function parseCriteria(body: Record<string, unknown>) {
  const minPrice = body.minPrice === '' || body.minPrice == null ? null : Number(body.minPrice)
  const maxPrice = body.maxPrice === '' || body.maxPrice == null ? null : Number(body.maxPrice)
  if (minPrice != null && (!Number.isFinite(minPrice) || minPrice < 0)) throw new Error('Le budget minimum doit être positif ou nul')
  if (maxPrice != null && (!Number.isFinite(maxPrice) || maxPrice < 0)) throw new Error('Le budget maximum doit être positif ou nul')
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) throw new Error('Le budget minimum ne peut pas dépasser le budget maximum')
  const propertyType = typeof body.propertyType === 'string' && body.propertyType !== 'ALL' ? body.propertyType : null
  if (propertyType && !PROPERTY_TYPES.has(propertyType)) throw new Error('Type de bien invalide')
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) throw new Error('Le nom de la recherche est requis (100 caractères maximum)')
  return {
    name,
    city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null,
    property_type: propertyType,
    min_price: minPrice,
    max_price: maxPrice,
    search_query: typeof body.searchQuery === 'string' && body.searchQuery.trim() ? body.searchQuery.trim() : null,
    is_active: body.isActive !== false,
  }
}

export async function GET(req: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data, error } = await (getSupabaseAdminClient().from('search_alerts') as any).select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return applyCookies(NextResponse.json({ data: data ?? [] }))
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const criteria = parseCriteria(await req.json())
    const { data, error } = await (getSupabaseAdminClient().from('search_alerts') as any).insert({ id: crypto.randomUUID(), user_id: userId, ...criteria }).select().single()
    if (error) throw error
    return applyCookies(NextResponse.json({ data }, { status: 201 }))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 400 })
  }
}
