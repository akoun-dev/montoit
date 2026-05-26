import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// POST /api/rental-files/[id]/action — Accept or reject a rental file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await (supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { id } = await params
    const body = await req.json()
    const { action, rejectionReason } = body as {
      action: 'accept' | 'reject'
      rejectionReason?: string
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "accept" ou "reject"' },
        { status: 400 }
      )
    }

    const rentalFileResult = await ((supabase as any)
      .from('rental_files')
      .select('*, tenant:users!rental_files_tenant_id_fkey(id, first_name, last_name), leases:leases(id, property:properties(id, owner_id, title))')
      .eq('id', id)
      .single() as Promise<{ data: any; error: any }>)

    if (rentalFileResult.error || !rentalFileResult.data) {
      return NextResponse.json(
        { error: 'Dossier locatif introuvable' },
        { status: 404 }
      )
    }

    const rFile = rentalFileResult.data as any

    // Find the owner's property — check existing leases first, then applications
    const ownerLease = (rFile.leases || []).find(
      (l: any) => l.property?.owner_id === userId
    )

    let property: { id: string; owner_id: string; title: string } | null =
      ownerLease?.property || null

    if (!property) {
      // No lease yet — check applications table for a candidature on this owner's property
      const { data: ownerProperties } = await supabase
        .from('properties')
        .select('id, title')
        .eq('owner_id', userId)

      const ownerPropIds = (ownerProperties || []).map(p => p.id)

      if (ownerPropIds.length > 0) {
        const appResult: any = await (supabase as any)
          .from('applications')
          .select('property_id')
          .eq('rental_file_id', id)
          .in('property_id', ownerPropIds)
          .maybeSingle()

        if (appResult.data) {
          const matched = (ownerProperties || []).find(p => p.id === appResult.data.property_id)
          if (matched) {
            property = { id: matched.id, owner_id: userId, title: matched.title }
          }
        }
      }
    }

    if (!property) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à traiter ce dossier' },
        { status: 403 }
      )
    }

    if (rFile.status !== 'VALIDATED' && rFile.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Ce dossier ne peut plus être traité' },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      // Create lease directly (no TC_REVIEW step)
      const leaseId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const { data: lease, error: leaseError } = await (supabase as any)
        .from('leases')
        .insert({
          id: leaseId,
          status: 'PENDING_SIGNATURE',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          monthly_rent: 0,
          charges: 0,
          deposit: 0,
          property_id: property.id,
          tenant_id: rFile.tenant_id,
          owner_id: userId,
          rental_file_id: rFile.id,
        })
        .select()
        .single()

      if (leaseError || !lease) {
        console.error('Failed to create lease on accept:', leaseError)
        return NextResponse.json({ error: 'Erreur lors de la création du bail' }, { status: 500 })
      }

      // Update rental file status
      const { error: rferr } = await supabase
        .from('rental_files' as any)
        .update({ status: 'ACCEPTED' })
        .eq('id', id)
      if (rferr) console.error('Failed to update rental_file status:', rferr)

      // Sync status to applications table
      const { error: apperr } = await supabase
        .from('applications' as any)
        .update({ status: 'ACCEPTED' })
        .eq('rental_file_id', id)
      if (apperr) console.error('Failed to sync application status:', apperr)

      await notify({
        userId: rFile.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: 'Candidature acceptée',
        message: `Votre candidature pour "${property.title}" a été acceptée. Un bail a été créé en attente de signature.`,
        actionUrl: 'lease',
        entityId: leaseId,
      })

      await (supabase as any).from('audit_logs').insert({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        action: 'ACCEPT_RENTAL_FILE',
        entity: 'RentalFile',
        entity_id: rFile.id,
        details: `Dossier accepté par le propriétaire ${userId}. Bail créé (${leaseId}).`,
        user_id: userId,
      })

      return NextResponse.json({
        data: { leaseId: lease.id },
        message: 'Candidature acceptée. Redirection vers le bail...',
      })
    }

    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Veuillez fournir une raison de refus' },
          { status: 400 }
        )
      }

      const rejectResult: any = await supabase
        .from('rental_files')
        .update({
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim(),
        } as any)
        .eq('id', id)
        .select()
        .single()

      const updatedFile = rejectResult?.data || null

      // Sync status to applications table
      await (supabase as any)
        .from('applications')
        .update({ status: 'REJECTED' })
        .eq('rental_file_id', id)

      await notify({
        userId: rFile.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: 'Dossier refusé',
        message: `Votre dossier locatif pour "${property.title}" a été refusé. Raison : ${rejectionReason.trim()}`,
        actionUrl: 'rental-file',
        entityId: rFile.id,
      })

      await supabase.from('audit_logs').insert({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        action: 'REJECT_RENTAL_FILE',
        entity: 'RentalFile',
        entity_id: rFile.id,
        details: `Dossier refusé par le propriétaire ${userId}. Raison: ${rejectionReason.trim()}`,
        user_id: userId,
      })

      const mappedFile = updatedFile ? {
        id: updatedFile.id,
        tenantId: updatedFile.tenant_id,
        status: updatedFile.status,
        rejectionReason: updatedFile.rejection_reason,
        createdAt: updatedFile.created_at,
        updatedAt: updatedFile.updated_at,
      } : null

      return NextResponse.json({
        data: { rentalFile: mappedFile },
        message: 'Dossier refusé',
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur serveur'
    console.error('Rental file action error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
