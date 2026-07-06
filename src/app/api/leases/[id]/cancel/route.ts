import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// PATCH /api/leases/[id]/cancel — Cancel a lease pending signature (either party)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*, property:properties!leases_property_id_fkey(id, title, owner_id), rental_file:rental_files!leases_rental_file_id_fkey(id, tenant_id)')
      .eq('id', id)
      .maybeSingle()

    if (leaseError) throw leaseError
    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (lease.tenant_id !== userId && lease.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.status !== 'PENDING_SIGNATURE') {
      const resp = NextResponse.json(
        { error: 'Seul un bail en attente de signature peut être annulé' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    // Update lease status to CANCELLED
    const { error: updateError } = await supabase
      .from('leases')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) throw updateError

    // Release the property back to disponible
    await supabase
      .from('properties')
      .update({ rental_status: 'disponible', updated_at: new Date().toISOString() })
      .eq('id', lease.property_id)

    // Re-open the rental file to VALIDATED
    if (lease.rental_file_id) {
      await supabase
        .from('rental_files')
        .update({ status: 'VALIDATED', updated_at: new Date().toISOString() })
        .eq('id', lease.rental_file_id)
    }

    const cancelledBy = lease.tenant_id === userId ? 'Le locataire' : 'Le propriétaire'
    const otherPartyId = lease.tenant_id === userId ? lease.owner_id : lease.tenant_id

    await notify({
      userId: otherPartyId,
      type: 'LEASE_UPDATE',
      title: 'Bail annulé',
      message: `${cancelledBy} a annulé le bail pour "${lease.property?.title || ''}" avant signature.`,
      actionUrl: 'my-leases',
      entityId: id,
    })

    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      action: 'LEASE_CANCELLED',
      entity: 'Lease',
      entity_id: id,
      details: JSON.stringify({
        cancelledBy: userId,
        role: lease.tenant_id === userId ? 'TENANT' : 'OWNER',
        propertyTitle: lease.property?.title || '',
        rentalFileId: lease.rental_file_id,
      }),
      user_id: userId,
    })

    const resp = NextResponse.json({
      data: { leaseId: id, status: 'CANCELLED' },
      message: 'Bail annulé. Le bien est de nouveau disponible.',
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease cancel error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
