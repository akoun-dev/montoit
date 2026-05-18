import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    acc[camelKey] = snakeToCamel(obj[key])
    return acc
  }, {} as Record<string, any>)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const effectiveRole = user?.active_role

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    const { id } = await params

    let leaseIds: string[] | null = null

    if (effectiveRole === 'PROPRIETAIRE') {
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .eq('owner_id', userId)
      leaseIds = (leases || []).map((l: any) => l.id)
    } else if (effectiveRole === 'AGENCE') {
      const { data: mandats } = await supabase
        .from('mandats')
        .select('property_id')
        .eq('agency_id', userId)
        .eq('status', 'ACTIVE')
      const propertyIds = (mandats || []).map((m: any) => m.property_id)
      if (propertyIds.length === 0) {
        return applyCookies(NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 }))
      }
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .in('property_id', propertyIds)
      leaseIds = (leases || []).map((l: any) => l.id)
      if (leaseIds.length === 0) {
        return applyCookies(NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 }))
      }
    }

    let query = supabase.from('payments').select(`
      *,
      lease:lease_id(
        id,
        start_date,
        end_date,
        monthly_rent,
        charges,
        deposit,
        special_conditions,
        owner_signed_at,
        tenant_signed_at,
        status,
        property:property_id(
          id,
          title,
          address,
          city,
          images:property_images(url, "order")
        ),
        owner:owner_id(
          id,
          first_name,
          last_name,
          phone
        )
      )
    `).eq('id', id)

    if (effectiveRole === 'LOCATAIRE') {
      query = query.eq('tenant_id', userId)
    } else if (leaseIds !== null) {
      query = query.in('lease_id', leaseIds)
    }

    const { data: payment } = await (query.maybeSingle() as any)

    if (!payment) {
      return applyCookies(NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 }))
    }

    const mapped = snakeToCamel(payment)
    if (mapped.lease?.property?.images) {
      const sorted = [...mapped.lease.property.images].sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0)
      )
      mapped.lease.property.images = sorted.length > 0 ? [sorted[0]] : []
    }

    return applyCookies(NextResponse.json({ data: mapped }))
  } catch (error) {
    console.error('Payment detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const effectiveRole = user?.active_role

    if (effectiveRole !== 'PROPRIETAIRE') {
      return applyCookies(NextResponse.json(
        { error: 'Seuls les propriétaires peuvent confirmer la réception d\'un paiement' },
        { status: 403 }
      ))
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action } = body as { action?: string }

    const { data: leases } = await supabase
      .from('leases')
      .select('id')
      .eq('owner_id', userId)
    const ownedLeaseIds = (leases || []).map((l: any) => l.id)

    if (ownedLeaseIds.length === 0) {
      return applyCookies(NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 }))
    }

    const { data: payment } = await (supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .in('lease_id', ownedLeaseIds)
      .maybeSingle() as any)

    if (!payment) {
      return applyCookies(NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 }))
    }

    if (action === 'confirm_receipt') {
      if (payment.status !== 'PAID' && payment.status !== 'PROCESSING') {
        return applyCookies(NextResponse.json(
          { error: `Impossible de confirmer un paiement avec le statut: ${payment.status}` },
          { status: 400 }
        ))
      }

      const currentOperatorData = payment.payment_operator_data || {}
      const updatedOperatorData = {
        ...(typeof currentOperatorData === 'object' ? currentOperatorData : {}),
        ownerConfirmedAt: new Date().toISOString(),
        ownerConfirmedBy: userId,
      }

      const { data: updatedPayment } = await supabase
        .from('payments')
        .update({ payment_operator_data: updatedOperatorData })
        .eq('id', id)
        .select()
        .single()

      await notify({
        userId: payment.tenant_id,
        type: 'PAYMENT_ALERT',
        title: 'Paiement confirmé par le propriétaire ✅',
        message: `Le propriétaire a confirmé la réception de votre paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA.`,
        actionUrl: 'payments',
        entityId: id,
      })

      return applyCookies(NextResponse.json({
        data: updatedPayment ? snakeToCamel(updatedPayment) : null,
        message: 'Réception du paiement confirmée',
      }))
    }

    return applyCookies(NextResponse.json(
      { error: 'Action non reconnue. Actions disponibles: confirm_receipt' },
      { status: 400 }
    ))
  } catch (error) {
    console.error('Payment PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
