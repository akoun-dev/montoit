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
    const body = await req.json()
    const { propertyId, reason, description } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'Identifiant du bien requis' }, { status: 400 })
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'La raison est requise' }, { status: 400 })
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
    }

    // Vérifier que le bien existe et est visible
    const { data: property } = await supabase
      .from('properties')
      .select('id, title, owner_id')
      .eq('id', propertyId)
      .neq('status', 'DRAFT')
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Créer le signalement
    const { data: signalement } = await (supabase.from('signalements') as any)
      .insert({
        reason,
        description: description.trim(),
        entity_type: 'PROPERTY',
        entity_id: propertyId,
        reporter_id: userId,
        status: 'PENDING',
      })
      .select()
      .single()

    if (!signalement) {
      return NextResponse.json({ error: 'Erreur lors de la création du signalement' }, { status: 500 })
    }

    // Journaliser dans audit_logs
    await (supabase.from('audit_logs') as any).insert({
      action: 'SIGNALEMENT_CREATED',
      entity: 'Property',
      entity_id: propertyId,
      details: JSON.stringify({ reason, description, reportedBy: userId, source: 'PUBLIC' }),
      user_id: userId,
    })

    // Notifier les admins
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'ADMIN')
      .eq('is_active', true)

    await Promise.all((admins ?? []).map((admin: any) =>
      notify({
        userId: admin.id,
        type: 'SYSTEM',
        title: 'Nouveau signalement utilisateur',
        message: `Un utilisateur a signalé le bien "${property.title}" pour : ${reason}`,
        actionUrl: 'signalements',
        entityId: signalement.id,
      })
    ))

    const resp = NextResponse.json({
      message: 'Votre signalement a été envoyé. Notre équipe va l\'examiner dans les plus brefs délais.',
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Properties signal POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
