import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'
import { BUCKETS, uploadFromBase64 } from '@/lib/supabase/storage'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function mapRefund(r: any) {
  return {
    id: r.id,
    leaseId: r.lease_id,
    depositAmount: r.deposit_amount,
    refundAmount: r.refund_amount,
    deductions: r.deductions,
    deductionReason: r.deduction_reason,
    justificationUrl: r.justification_url,
    status: r.status,
    decidedById: r.decided_by_id,
    decidedAt: r.decided_at,
    paidAt: r.paid_at,
    createdAt: r.created_at,
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease } = await supabase.from('leases').select('id, tenant_id, owner_id').eq('id', id).maybeSingle()
    if (!lease || (lease.tenant_id !== userId && lease.owner_id !== userId)) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    const { data: refund } = await (supabase as any)
      .from('deposit_refunds')
      .select('*')
      .eq('lease_id', id)
      .maybeSingle()

    const resp = NextResponse.json({ data: refund ? mapRefund(refund) : null })
    return applyCookies(resp)
  } catch (error) {
    console.error('Deposit refund GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease } = await (supabase as any).from('leases').select('id, tenant_id, owner_id, property:property_id(title)').eq('id', id).maybeSingle()
    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }
    if (lease.owner_id !== userId) {
      return NextResponse.json({ error: 'Seul le propriétaire peut décider de la restitution' }, { status: 403 })
    }

    const { data: refund } = await (supabase as any).from('deposit_refunds').select('*').eq('lease_id', id).maybeSingle()
    if (!refund) {
      return NextResponse.json({ error: 'Aucune restitution de caution en attente pour ce bail' }, { status: 404 })
    }

    const body = await req.json()
    const { action } = body as { action: 'decide' | 'mark-paid' }

    if (action === 'decide') {
      if (refund.status !== 'PENDING') {
        return NextResponse.json({ error: 'Cette restitution a déjà été décidée' }, { status: 400 })
      }
      const { deductions, deductionReason, justificationContent, justificationFileName } = body as {
        deductions?: number
        deductionReason?: string
        justificationContent?: string
        justificationFileName?: string
      }
      const deductionAmount = Math.max(0, Number(deductions) || 0)
      if (deductionAmount > refund.deposit_amount) {
        return NextResponse.json({ error: 'Le montant retenu ne peut pas dépasser le montant de la caution' }, { status: 400 })
      }
      if (deductionAmount > 0 && !deductionReason?.trim()) {
        return NextResponse.json({ error: 'Un motif est requis pour toute retenue' }, { status: 400 })
      }

      let justificationUrl: string | undefined
      if (justificationContent && justificationFileName) {
        const ext = justificationFileName.includes('.') ? justificationFileName.slice(justificationFileName.lastIndexOf('.') + 1) : 'pdf'
        justificationUrl = await uploadFromBase64(BUCKETS.LEASE_DOCUMENTS, justificationContent, `${id}/caution-justificatif-${Date.now()}.${ext}`)
      }

      const refundAmount = Math.round((refund.deposit_amount - deductionAmount) * 100) / 100

      const { data: updated } = await (supabase as any)
        .from('deposit_refunds')
        .update({
          deductions: deductionAmount,
          deduction_reason: deductionAmount > 0 ? deductionReason?.trim() : null,
          justification_url: justificationUrl ?? refund.justification_url,
          refund_amount: refundAmount,
          status: 'DECIDED',
          decided_by_id: userId,
          decided_at: new Date().toISOString(),
        })
        .eq('id', refund.id)
        .select()
        .single()

      await notify({
        userId: lease.tenant_id,
        type: 'LEASE_UPDATE',
        title: 'Décision de restitution de caution',
        message: deductionAmount > 0
          ? `Le propriétaire restituera ${refundAmount.toLocaleString('fr-FR')} FCFA sur votre caution de "${(lease.property as any)?.title || ''}" (retenue de ${deductionAmount.toLocaleString('fr-FR')} FCFA : ${deductionReason}).`
          : `Le propriétaire restituera l'intégralité de votre caution (${refundAmount.toLocaleString('fr-FR')} FCFA) pour "${(lease.property as any)?.title || ''}".`,
        actionUrl: 'my-leases',
        entityId: id,
      })

      await supabase.from('audit_logs').insert({
        id: generateId(),
        action: 'DEPOSIT_REFUND_DECIDED',
        entity: 'DepositRefund',
        entity_id: refund.id,
        details: JSON.stringify({ deductionAmount, deductionReason, refundAmount }),
        user_id: userId,
      })

      const resp = NextResponse.json({ data: mapRefund(updated) })
      return applyCookies(resp)
    }

    if (action === 'mark-paid') {
      if (refund.status !== 'DECIDED') {
        return NextResponse.json({ error: 'La restitution doit être décidée avant d\'être marquée comme payée' }, { status: 400 })
      }

      const { data: updated } = await (supabase as any)
        .from('deposit_refunds')
        .update({ status: 'PAID', paid_at: new Date().toISOString() })
        .eq('id', refund.id)
        .select()
        .single()

      await notify({
        userId: lease.tenant_id,
        type: 'PAYMENT_ALERT',
        title: 'Caution restituée',
        message: `Le propriétaire a confirmé le versement de ${refund.refund_amount?.toLocaleString('fr-FR')} FCFA au titre de la restitution de votre caution pour "${(lease.property as any)?.title || ''}".`,
        actionUrl: 'my-leases',
        entityId: id,
      })

      await supabase.from('audit_logs').insert({
        id: generateId(),
        action: 'DEPOSIT_REFUND_PAID',
        entity: 'DepositRefund',
        entity_id: refund.id,
        details: JSON.stringify({ refundAmount: refund.refund_amount }),
        user_id: userId,
      })

      const resp = NextResponse.json({ data: mapRefund(updated) })
      return applyCookies(resp)
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('Deposit refund PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
