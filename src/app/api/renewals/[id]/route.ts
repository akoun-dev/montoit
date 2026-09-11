import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'
import { generateAndUploadLeasePdf } from '@/lib/generate-and-upload-lease-pdf'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function mapLease(lease: Record<string, unknown>) {
  return {
    id: lease.id,
    status: lease.status,
    propertyId: lease.property_id,
    tenantId: lease.tenant_id,
    ownerId: lease.owner_id,
    monthlyRent: lease.monthly_rent,
    charges: lease.charges,
    deposit: lease.deposit,
    startDate: lease.start_date,
    endDate: lease.end_date,
  }
}

// PATCH /api/renewals/[id] — Accept or decline a lease renewal request (proprietaire)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', auth.userId)
      .single()

    const role = user?.active_role || user?.role
    if (role !== 'PROPRIETAIRE' && role !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body as { action?: string }

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Action invalide. Utilisez "accept" ou "decline".' }, { status: 400 })
    }

    // Fetch the lease
    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    if ((lease as any).owner_id !== auth.userId) {
      return NextResponse.json({ error: 'Vous n\'êtes pas le propriétaire de ce bail' }, { status: 403 })
    }

    if ((lease as any).renewal_status !== 'REQUESTED') {
      return NextResponse.json({ error: 'Aucune demande de renouvellement en cours pour ce bail' }, { status: 400 })
    }

    if ((lease as any).status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Seul un bail actif peut être renouvelé' }, { status: 400 })
    }

    // Fetch property info for notification
    const { data: property } = await supabase
      .from('properties')
      .select('title')
      .eq('id', (lease as any).property_id)
      .maybeSingle()

    const propertyTitle = (property as any)?.title || ''

    if (action === 'decline') {
      const { error } = await supabase
        .from('leases')
        .update({ renewal_status: 'REJECTED', updated_at: new Date().toISOString() } as any)
        .eq('id', id)
      if (error) throw error

      await notify({
        userId: (lease as any).tenant_id,
        type: 'LEASE_UPDATE',
        title: 'Demande de renouvellement refusée',
        message: `Le propriétaire a refusé votre demande de renouvellement pour "${propertyTitle}".`,
        actionUrl: 'my-leases',
        entityId: id,
      })

      return NextResponse.json({ data: { id, renewalStatus: 'REJECTED' } })
    }

    // ─── Accept: immediately create the renewed lease ───────────────────────
    // Same terms as the current lease, shifted by its own duration, reusing
    // the same (already-validated) rental file — a renewal doesn't require
    // re-running KYC/TC validation on an already-approved tenant.
    const oldLease = lease as any
    const durationMs = new Date(oldLease.end_date).getTime() - new Date(oldLease.start_date).getTime()
    const newStartDate = new Date(oldLease.end_date)
    const newEndDate = new Date(newStartDate.getTime() + durationMs)
    const newLeaseId = generateId()

    const { data: newLease, error: createError } = await (supabase as any)
      .from('leases')
      .insert({
        id: newLeaseId,
        status: 'PENDING_SIGNATURE',
        property_id: oldLease.property_id,
        tenant_id: oldLease.tenant_id,
        owner_id: oldLease.owner_id,
        rental_file_id: oldLease.rental_file_id,
        monthly_rent: oldLease.monthly_rent,
        charges: oldLease.charges,
        deposit: oldLease.deposit,
        start_date: newStartDate.toISOString(),
        end_date: newEndDate.toISOString(),
        special_conditions: oldLease.special_conditions,
      })
      .select()
      .single()

    if (createError) throw createError

    const { error: updateError } = await supabase
      .from('leases')
      .update({
        renewal_status: 'RENEWED',
        renewed_lease_id: newLeaseId,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)

    if (updateError) throw updateError

    generateAndUploadLeasePdf(newLeaseId, 'initial').then((url) => {
      if (url) {
        (supabase.from('leases').update({ contract_url: url, updated_at: new Date().toISOString() } as any).eq('id', newLeaseId) as any).then()
      }
    }).catch((err) => console.error('PDF generation failed:', err))

    await notify({
      userId: oldLease.tenant_id,
      type: 'LEASE_UPDATE',
      title: 'Demande de renouvellement acceptée',
      message: `Le propriétaire a accepté votre demande de renouvellement pour "${propertyTitle}". Un nouveau bail est prêt : veuillez le signer.`,
      actionUrl: 'my-leases',
      entityId: newLeaseId,
    })

    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: 'LEASE_RENEWED',
      entity: 'Lease',
      entity_id: newLeaseId,
      details: JSON.stringify({ previousLeaseId: id, propertyId: oldLease.property_id, tenantId: oldLease.tenant_id }),
      user_id: auth.userId,
    } as any)

    return NextResponse.json({
      data: { id, renewalStatus: 'RENEWED', renewedLeaseId: newLeaseId, newLease: mapLease(newLease) },
    })
  } catch (error) {
    console.error('Renewal PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
