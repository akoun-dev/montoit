import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    acc[camelKey] = snakeToCamel(obj[key])
    return acc
  }, {} as Record<string, any>)
}

function computeNextDueDate(startDate: string): string {
  const now = new Date()
  const start = new Date(startDate)
  const dueDay = start.getUTCDate()
  const due = new Date(Date.UTC(now.getFullYear(), now.getMonth(), dueDay))
  if (due <= now) {
    due.setUTCMonth(due.getUTCMonth() + 1)
  }
  return due.toISOString()
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('active_role')
      .eq('id', userId)
      .single()

    if (user?.active_role !== 'LOCATAIRE') {
      return applyCookies(NextResponse.json({ error: 'Seuls les locataires peuvent effectuer un paiement en avance' }, { status: 403 }))
    }

    const { data: activeLeases } = await (supabase
      .from('leases')
      .select('id, monthly_rent, start_date, property_id, owner_id, property:property_id(price)')
      .eq('tenant_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1) as any)

    const activeLease = activeLeases?.[0] as any
    if (!activeLease) {
      return applyCookies(NextResponse.json({ error: 'Aucun bail actif trouvé' }, { status: 400 }))
    }

    const nextDue = computeNextDueDate(activeLease.start_date)

    const { data: existing } = await (supabase
      .from('payments')
      .select('*, lease:lease_id(id, start_date, end_date, monthly_rent, property:property_id(id, title, address, city, images:property_images(url, "order")), owner:owner_id(id, first_name, last_name))')
      .eq('lease_id', activeLease.id)
      .eq('due_date', nextDue)
      .eq('status', 'PENDING')
      .maybeSingle() as any)

    if (existing) {
      const mapped = snakeToCamel(existing)
      if (mapped.lease?.property?.images) {
        const sorted = [...mapped.lease.property.images].sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0)
        )
        mapped.lease.property.images = sorted.length > 0 ? [sorted[0]] : []
      }
      return applyCookies(NextResponse.json({
        data: mapped,
        message: 'Un paiement existe déjà pour cette échéance',
      }))
    }

    const propertyPrice = (activeLease.property as any)?.price || 0
    const monthlyRent = activeLease.monthly_rent || propertyPrice
    if (monthlyRent <= 0) {
      return applyCookies(NextResponse.json({ error: 'Le loyer mensuel n\'est pas défini' }, { status: 400 }))
    }

    const { data: newPayment, error: insertError } = await (supabase
      .from('payments')
      .insert({
        id: generateId(),
        lease_id: activeLease.id,
        tenant_id: userId,
        amount: monthlyRent,
        status: 'PENDING',
        due_date: nextDue,
      })
      .select('*, lease:lease_id(id, start_date, end_date, monthly_rent, property:property_id(id, title, address, city, images:property_images(url, "order")), owner:owner_id(id, first_name, last_name))')
      .single() as any)

    if (insertError || !newPayment) {
      console.error('Advance payment insert error:', insertError)
      return applyCookies(NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 }))
    }

    const mapped = snakeToCamel(newPayment)
    if (mapped.lease?.property?.images) {
      const sorted = [...mapped.lease.property.images].sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0)
      )
      mapped.lease.property.images = sorted.length > 0 ? [sorted[0]] : []
    }

    return applyCookies(NextResponse.json({ data: mapped }))
  } catch (error) {
    console.error('Payment advance error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
