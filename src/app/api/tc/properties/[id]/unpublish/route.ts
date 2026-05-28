import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

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

    const supabase = getSupabaseAdminClient()
    const { id: propertyId } = await params

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      const resp = NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
      return applyCookies(resp)
    }
    if (!propertyId) {
      return NextResponse.json({ error: 'ID du bien requis' }, { status: 400 })
    }

    // Lire le body optionnel (commentaire)
    const body = await req.json().catch(() => ({})) as { reason?: string }

    const { data: property } = await ((supabase as any)
      .from('properties')
      .select('*, owner:users!owner_id(id, first_name, last_name, email, phone)')
      .eq('id', propertyId)
      .single() as any)

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Retirer le bien en le remettant en brouillon
    const { data: updated } = await ((supabase as any)
      .from('properties')
      .update({
        status: 'DRAFT',
        is_verified: false,
      })
      .eq('id', propertyId)
      .select()
      .single() as any)

    if (!updated) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    // Journaliser dans audit_logs
    await (supabase.from('audit_logs') as any).insert({
      action: 'PROPERTY_UNPUBLISHED',
      entity: 'Property',
      entity_id: propertyId,
      details: JSON.stringify({ reason: body?.reason || null, tcUserId: userId }),
      user_id: userId,
    })

    // Notifier le propriétaire
    const reasonText = body?.reason
      ? ` Raison : ${body.reason}`
      : ''

    await notify({
      userId: property.owner_id,
      type: 'DOSSIER_UPDATE',
      title: 'Annonce retirée',
      message: `Votre annonce "${property.title}" a été retirée de la plateforme par le Tiers de Confiance.${reasonText} Veuillez vérifier les informations et soumettre à nouveau si nécessaire.`,
      actionUrl: 'my-properties',
      entityId: propertyId,
    })

    // Notifier également les agences si le bien est géré via un mandat actif
    const { data: activeMandats } = await (supabase
      .from('mandats') as any)
      .select('agency_id')
      .eq('property_id', propertyId)
      .eq('status', 'ACTIVE')

    if (activeMandats && (activeMandats as any[]).length > 0) {
      const agencyIds: string[] = [...new Set((activeMandats as any[]).map((m: any) => m.agency_id))]
      await Promise.all(agencyIds.map((agencyId) =>
        notify({
          userId: agencyId,
          type: 'DOSSIER_UPDATE',
          title: 'Bien sous gestion retiré',
          message: `Le bien "${property.title}" que vous gérez a été retiré de la plateforme par le Tiers de Confiance.${reasonText}`,
          actionUrl: 'my-properties',
          entityId: propertyId,
        })
      ))
    }

    const resp = NextResponse.json({
      property: {
        id: updated.id,
        status: updated.status,
        isVerified: updated.is_verified,
      },
      message: 'Bien retiré avec succès. Le propriétaire a été notifié.',
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC unpublish PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
