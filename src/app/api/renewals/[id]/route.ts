import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

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

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED'

    // Update the lease
    const { error } = await supabase
      .from('leases')
      .update({
        renewal_status: newStatus,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)

    if (error) throw error

    // Fetch property info for notification
    const { data: property } = await supabase
      .from('properties')
      .select('title')
      .eq('id', (lease as any).property_id)
      .maybeSingle()

    const propertyTitle = (property as any)?.title || ''

    // Notify the tenant
    await notify({
      userId: (lease as any).tenant_id,
      type: 'LEASE_UPDATE',
      title: action === 'accept' ? 'Demande de renouvellement acceptée' : 'Demande de renouvellement refusée',
      message: action === 'accept'
        ? `Le propriétaire a accepté votre demande de renouvellement pour "${propertyTitle}". Un nouveau bail sera bientôt créé.`
        : `Le propriétaire a refusé votre demande de renouvellement pour "${propertyTitle}".`,
      actionUrl: 'my-leases',
      entityId: id,
    })

    return NextResponse.json({
      data: {
        id,
        renewalStatus: newStatus,
      },
    })
  } catch (error) {
    console.error('Renewal PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
