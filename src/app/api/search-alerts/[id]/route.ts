import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, applyCookies } = await resolveRequestUser(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof body.isActive === 'boolean') update.is_active = body.isActive
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim().slice(0, 100)
  if (body.city !== undefined) update.city = typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null
  if (body.searchQuery !== undefined) update.search_query = typeof body.searchQuery === 'string' && body.searchQuery.trim() ? body.searchQuery.trim() : null
  if (body.propertyType !== undefined) update.property_type = body.propertyType === 'ALL' || body.propertyType == null ? null : body.propertyType
  for (const [key, target] of [['minPrice', 'min_price'], ['maxPrice', 'max_price']] as const) {
    if (body[key] !== undefined) {
      const value = body[key] === '' || body[key] == null ? null : Number(String(body[key]).replace(',', '.'))
      if (value != null && (!Number.isFinite(value) || value < 0)) return NextResponse.json({ error: 'Les budgets doivent être positifs ou nuls' }, { status: 400 })
      update[target] = value
    }
  }
  if (update.min_price != null && update.max_price != null && Number(update.min_price) > Number(update.max_price)) return NextResponse.json({ error: 'Le budget minimum ne peut pas dépasser le maximum' }, { status: 400 })
  const { data, error } = await (getSupabaseAdminClient().from('search_alerts') as any).update(update).eq('id', id).eq('user_id', userId).select().maybeSingle()
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Recherche introuvable' }, { status: 404 })
  return applyCookies(NextResponse.json({ data }))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, applyCookies } = await resolveRequestUser(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const { error } = await getSupabaseAdminClient().from('search_alerts').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return applyCookies(NextResponse.json({ success: true }))
}
