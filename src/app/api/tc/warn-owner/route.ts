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
    const { propertyId, warningMessage, severity } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }
    if (!warningMessage || !warningMessage.trim()) {
      return NextResponse.json({ error: 'Le message d\'avertissement est requis' }, { status: 400 })
    }

    const validSeverities = ['WARNING', 'FINAL_WARNING', 'BAN']
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json({ error: 'La sévérité doit être WARNING, FINAL_WARNING ou BAN' }, { status: 400 })
    }

    const effectiveSeverity = severity || 'WARNING'

    // Récupérer les infos du bien, du propriétaire et du TC
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

    const { data: tcUser } = await ((supabase as any)
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single() as any)

    const tcName = tcUser ? `${tcUser.first_name} ${tcUser.last_name}` : 'Le Tiers de Confiance'

    // 1. Créer ou récupérer une conversation entre le TC et le propriétaire
    const { data: existingConvs } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${userId},participant2_id.eq.${property.owner_id}),and(participant1_id.eq.${property.owner_id},participant2_id.eq.${userId})`)

    let convId: string
    if (existingConvs && existingConvs.length > 0) {
      convId = existingConvs[0].id
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          id: crypto.randomUUID(),
          participant1_id: userId,
          participant2_id: property.owner_id,
          property_id: propertyId,
        })
        .select()
        .single()

      if (convError) throw convError
      convId = newConv.id
    }

    // 2. Envoyer le message d'avertissement
    const severityPrefix = effectiveSeverity === 'FINAL_WARNING'
      ? '⚠️ DERNIER AVERTISSEMENT — '
      : effectiveSeverity === 'BAN'
        ? '🚫 AVIS DE BANNISSEMENT — '
        : '⚠️ AVERTISSEMENT — '

    const messageContent = `${severityPrefix}${warningMessage.trim()}\n\n— ${tcName}, Tiers de Confiance`

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        id: crypto.randomUUID(),
        content: messageContent,
        conversation_id: convId,
        sender_id: userId,
        is_read: false,
      })
      .select()
      .single()

    if (msgError) throw msgError

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)

    // 3. Notifier le propriétaire
    const severityLabels: Record<string, string> = {
      WARNING: 'avertissement',
      FINAL_WARNING: 'dernier avertissement',
      BAN: 'avis de bannissement',
    }

    await notify({
      userId: property.owner_id,
      type: 'SYSTEM',
      title: effectiveSeverity === 'WARNING' ? '⚠️ Avertissement sur votre bien' : effectiveSeverity === 'FINAL_WARNING' ? '⚠️ Dernier avertissement — bien' : '🚫 Avis de bannissement — bien',
      message: `${tcName} vous a envoyé un ${severityLabels[effectiveSeverity]} concernant votre bien "${property.title}". Message : ${warningMessage.trim()}. Veuillez consulter votre messagerie.`,
      actionUrl: 'messages',
      entityId: convId,
    })

    // 4. Journaliser dans audit_logs
    await (supabase.from('audit_logs') as any).insert({
      action: effectiveSeverity === 'BAN' ? 'OWNER_BAN_WARNING' : effectiveSeverity === 'FINAL_WARNING' ? 'OWNER_FINAL_WARNING' : 'OWNER_WARNING',
      entity: 'Property',
      entity_id: propertyId,
      details: JSON.stringify({
        severity: effectiveSeverity,
        warningMessage,
        tcUserId: userId,
      }),
      user_id: userId,
    })

    const resp = NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.created_at,
      },
      conversationId: convId,
      info: 'Avertissement envoyé avec succès. Le propriétaire a été notifié.',
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC warn-owner POST error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
