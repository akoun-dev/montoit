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

    const { data: profile } = await supabase
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

    const { data: rentalFile, error: rentalError } = await supabase
      .from('rental_files')
      .select('*, tenant:users!rental_files_tenant_id_fkey(id, first_name, last_name), leases:leases(id, property:properties(id, owner_id, title))')
      .eq('id', id)
      .single()

    if (rentalError || !rentalFile) {
      return NextResponse.json(
        { error: 'Dossier locatif introuvable' },
        { status: 404 }
      )
    }

    const rFile = rentalFile as any

    const ownerLease = (rFile.leases || []).find(
      (l: any) => l.property?.owner_id === userId
    )
    if (!ownerLease) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à traiter ce dossier' },
        { status: 403 }
      )
    }

    if (rFile.status !== 'VALIDATED' && rFile.status !== 'SUBMITTED' && rFile.status !== 'TC_REVIEW') {
      return NextResponse.json(
        { error: 'Ce dossier ne peut plus être traité' },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      const { data: updatedFile } = await supabase
        .from('rental_files')
        .update({ status: 'VALIDATED' })
        .eq('id', id)
        .select()
        .single()

      const property = ownerLease.property

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .insert({
          status: 'DRAFT',
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
        throw leaseError || new Error('Failed to create lease')
      }

      await notify({
        userId: rFile.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: 'Dossier accepté',
        message: `Votre dossier locatif pour "${property.title}" a été accepté par le propriétaire.`,
        actionUrl: 'rental-file',
        entityId: rFile.id,
      })

      await supabase.from('audit_logs').insert({
        action: 'ACCEPT_RENTAL_FILE',
        entity: 'RentalFile',
        entity_id: rFile.id,
        details: `Dossier accepté par le propriétaire ${userId}. Bail brouillon créé: ${lease.id}`,
        user_id: userId,
      })

      const mappedFile = updatedFile ? {
        id: updatedFile.id,
        tenantId: updatedFile.tenant_id,
        status: updatedFile.status,
        createdAt: updatedFile.created_at,
        updatedAt: updatedFile.updated_at,
      } : null

      const mappedLease = {
        id: lease.id,
        status: lease.status,
        startDate: lease.start_date,
        endDate: lease.end_date,
        monthlyRent: lease.monthly_rent,
        charges: lease.charges,
        deposit: lease.deposit,
        propertyId: lease.property_id,
        tenantId: lease.tenant_id,
        ownerId: lease.owner_id,
        rentalFileId: lease.rental_file_id,
        createdAt: lease.created_at,
        updatedAt: lease.updated_at,
      }

      return NextResponse.json({
        data: { rentalFile: mappedFile, lease: mappedLease },
        message: 'Dossier accepté et brouillon de bail créé',
      })
    }

    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Veuillez fournir une raison de refus' },
          { status: 400 }
        )
      }

      const { data: updatedFile } = await supabase
        .from('rental_files')
        .update({
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', id)
        .select()
        .single()

      const property = ownerLease.property

      await notify({
        userId: rFile.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: 'Dossier refusé',
        message: `Votre dossier locatif pour "${property.title}" a été refusé. Raison : ${rejectionReason.trim()}`,
        actionUrl: 'rental-file',
        entityId: rFile.id,
      })

      await supabase.from('audit_logs').insert({
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
    console.error('Rental file action error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
