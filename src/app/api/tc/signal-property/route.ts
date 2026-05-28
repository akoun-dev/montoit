import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

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

    const body = await req.json()
    const { propertyId, reason, description } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'La raison est requise' }, { status: 400 })
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
    }

    // Récupérer les infos du bien et du propriétaire
    const { data: property } = await ((supabase as any)
      .from('properties')
      .select('*, owner:users!owner_id(id, first_name, last_name, email, phone)')
      .eq('id', propertyId)
      .single() as any)

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (!property.owner_id) {
      return NextResponse.json({ error: 'Ce bien n\'a pas de propriétaire assigné' }, { status: 400 })
    }

    // Créer le signalement dans la table signalements
    const sGen = supabase.from('signalements') as any
    const { data: signalement, error: signalError } = await sGen
      .insert({
        id: crypto.randomUUID(),
        reason,
        description: description.trim(),
        entity_type: 'PROPERTY',
        entity_id: propertyId,
        reporter_id: userId,
        status: 'PENDING',
      })
      .select()
      .single()

    if (signalError || !signalement) {
      console.error('Erreur creation signalement:', signalError)
      return NextResponse.json({ error: 'Erreur lors de la création du signalement', detail: signalError?.message }, { status: 500 })
    }

    // Journaliser dans audit_logs
    const { error: auditError } = await (supabase.from('audit_logs') as any).insert({
      action: 'SIGNALEMENT_CREATED',
      entity: 'Property',
      entity_id: propertyId,
      details: JSON.stringify({ reason, description, reportedBy: userId }),
      user_id: userId,
    })

    if (auditError) {
      console.error('Erreur journalisation audit:', auditError)
    }

    // Notifier le propriétaire
    try {
      await notify({
        userId: property.owner_id,
        type: 'SYSTEM',
        title: 'Bien signalé — informations incorrectes',
        message: `Votre bien "${property.title}" a été signalé par le Tiers de Confiance. Raison : ${reason}. Détails : ${description}. Veuillez corriger les informations de votre annonce.`,
        actionUrl: 'my-properties',
        entityId: propertyId,
      })
    } catch (notifError) {
      console.error('Erreur notification propriétaire:', notifError)
    }

    // Notifier également les admins
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'ADMIN')
        .eq('is_active', true)

      await Promise.all((admins ?? []).map((admin: any) =>
        notify({
          userId: admin.id,
          type: 'SYSTEM',
          title: 'Nouveau signalement TC',
          message: `Le TC a signalé le bien "${property.title}" pour : ${reason}`,
          actionUrl: 'signalements',
          entityId: signalement.id,
        })
      ))
    } catch (notifError) {
      console.error('Erreur notification admins:', notifError)
    }

    const resp = NextResponse.json({
      signalement: {
        id: signalement.id,
        reason: signalement.reason,
        description: signalement.description,
        entityType: signalement.entity_type,
        entityId: signalement.entity_id,
        status: signalement.status,
        createdAt: signalement.created_at,
      },
      message: 'Bien signalé avec succès. Le propriétaire a été notifié.',
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC signal-property POST error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
