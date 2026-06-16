import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { checkTransactionStatus } from '@/lib/intouch'
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

const SUCCESS_STATUSES = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'COMPLETE', 'PAID', 'SUCCESS_PAYMENT', '0']
const FAILURE_STATUSES = ['FAILED', 'FAILURE', 'REJECTED', 'CANCELLED', 'EXPIRED', 'ERROR', '-1', '-2']

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

async function syncProcessingPaymentWithIntouch(supabase: ReturnType<typeof getSupabaseAdminClient>, payment: any) {
  if (payment?.status !== 'PROCESSING' || !payment?.operator_transaction_id) {
    return payment
  }

  try {
    const statusResult = await checkTransactionStatus(payment.operator_transaction_id)
    if (!statusResult.success || !statusResult.data) {
      return payment
    }

    const statusPayload = asRecord(statusResult.data)
    const normalizedStatus = String(statusPayload.status || '').toUpperCase()
    const normalizedErrorCode = String(statusPayload.error_code || '').toUpperCase()

    const isSuccess =
      SUCCESS_STATUSES.includes(normalizedStatus) ||
      SUCCESS_STATUSES.includes(normalizedErrorCode)

    const isFailure =
      FAILURE_STATUSES.includes(normalizedStatus) ||
      FAILURE_STATUSES.includes(normalizedErrorCode) ||
      (!!statusPayload.error_message && !isSuccess)

    if (!isSuccess && !isFailure) {
      return payment
    }

    const currentOperatorData = asRecord(payment.payment_operator_data)
    const mergedOperatorData = {
      ...currentOperatorData,
      lastStatusCheckAt: new Date().toISOString(),
      lastStatusCheckResult: statusPayload,
    }

    if (isSuccess) {
      const updatedFields = {
        status: 'PAID',
        paid_at: payment.paid_at || new Date().toISOString(),
        reference: String(
          statusPayload.transactionId ||
          statusPayload.id ||
          payment.reference ||
          payment.operator_transaction_id ||
          ''
        ),
        payment_operator_data: mergedOperatorData,
      }

      await supabase
        .from('payments')
        .update(updatedFields)
        .eq('id', payment.id)

      return {
        ...payment,
        ...updatedFields,
      }
    }

    const updatedFields = {
      status: 'PENDING',
      method: null,
      operator_transaction_id: null,
      operator_phone_number: null,
      payment_operator_data: mergedOperatorData,
    }

    await supabase
      .from('payments')
      .update(updatedFields)
      .eq('id', payment.id)

    return {
      ...payment,
      ...updatedFields,
    }
  } catch (error) {
    console.error('Payment Intouch status sync error:', error)
    return payment
  }
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

    const syncedPayment = await syncProcessingPaymentWithIntouch(supabase, payment)
    const mapped = snakeToCamel(syncedPayment)
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

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action } = body as { action?: string }

    // ── Find payment: owner looks by owned leases, tenant looks by own id ──
    let payment: any = null

    if (effectiveRole === 'PROPRIETAIRE') {
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .eq('owner_id', userId)
      const ownedLeaseIds = (leases || []).map((l: any) => l.id)

      if (ownedLeaseIds.length > 0) {
        const { data } = await (supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .in('lease_id', ownedLeaseIds)
          .maybeSingle() as any)
        payment = data
      }
    } else if (effectiveRole === 'LOCATAIRE') {
      const { data } = await (supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', userId)
        .maybeSingle() as any)
      payment = data
    }

    if (!payment) {
      return applyCookies(NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 }))
    }

    if (action === 'confirm_receipt') {
      if (effectiveRole !== 'PROPRIETAIRE') {
        return applyCookies(NextResponse.json(
          { error: 'Seuls les propriétaires peuvent confirmer la réception d\'un paiement' },
          { status: 403 }
        ))
      }

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

    if (action === 'cancel') {
      if (effectiveRole !== 'LOCATAIRE') {
        return applyCookies(NextResponse.json(
          { error: 'Seuls les locataires peuvent annuler un paiement' },
          { status: 403 }
        ))
      }

      if (payment.status !== 'PROCESSING') {
        return applyCookies(NextResponse.json(
          { error: `Seuls les paiements en cours (PROCESSING) peuvent être annulés. Statut actuel: ${payment.status}` },
          { status: 400 }
        ))
      }

      const { data: updatedPayment } = await supabase
        .from('payments')
        .update({
          status: 'PENDING',
          method: null,
          operator_transaction_id: null,
        })
        .eq('id', id)
        .select()
        .single()

      await notify({
        userId: userId,
        type: 'PAYMENT_ALERT',
        title: 'Paiement annulé',
        message: `Votre paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA a été annulé.`,
        actionUrl: 'payments',
        entityId: id,
      })

      return applyCookies(NextResponse.json({
        data: updatedPayment ? snakeToCamel(updatedPayment) : null,
        message: 'Paiement annulé avec succès',
      }))
    }

    return applyCookies(NextResponse.json(
      { error: 'Action non reconnue. Actions disponibles: confirm_receipt, cancel' },
      { status: 400 }
    ))
  } catch (error) {
    console.error('Payment PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
