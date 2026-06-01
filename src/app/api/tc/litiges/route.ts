import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify, notifyDisputeUpdate, notifyDisputeEscalated } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function authorizeTC(request: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(request)
  if (!userId) return { error: applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 })) }

  const supabase = getSupabaseAdminClient()
  const { data: profile } = await ((supabase as any)
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single() as any)

  const effectiveRole = profile?.active_role || profile?.role
  if (effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }

  return { userId, applyCookies, supabase }
}

export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const mine = searchParams.get('mine') === 'true'
  const priority = searchParams.get('priority')
  const isEscalated = searchParams.get('isEscalated')
  const resolved = searchParams.get('resolved') === 'true'

  let query = (supabase.from('disputes') as any).select('*')

  if (resolved) {
    query = query.in('status', ['RESOLVED', 'CLOSED'])
  } else if (mine) {
    query = query.eq('handled_by_id', userId)
  } else {
    query = query.or(`handled_by_id.eq.${userId},and(status.eq.OPEN,handled_by_id.is.null)`)
  }

  if (status && !resolved) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (priority) query = query.eq('priority', priority)
  if (isEscalated !== null && isEscalated !== undefined && isEscalated !== '') {
    query = query.eq('is_escalated', isEscalated === 'true')
  }

  query = query.order('created_at', { ascending: false })

  const { data: disputesData } = await (query)
  const disputesRaw = (disputesData ?? []) as any[]

  const leaseIds = [...new Set(disputesRaw.map((d: any) => d.lease_id).filter(Boolean))]

  const { data: leasesData } = leaseIds.length > 0
    ? await ((supabase as any)
        .from('leases')
        .select('*, property:properties(id, title, address, city, commune), tenant:users!tenant_id(id, first_name, last_name, email), owner:users!owner_id(id, first_name, last_name, email)')
        .in('id', leaseIds) as any)
    : { data: [] as any[] }

  const leaseMap = new Map<string, any>((leasesData ?? []).map((l: any) => [l.id, l]))

  const userIds = [...new Set([
    ...disputesRaw.map((d: any) => d.reported_by_id),
    ...disputesRaw.map((d: any) => d.handled_by_id),
  ].filter(Boolean))]

  const { data: usersData } = userIds.length > 0
    ? await ((supabase.from('users') as any).select('id, first_name, last_name, email, role').in('id', userIds) as any)
    : { data: [] as any[] }

  const userMap = new Map<string, any>((usersData ?? []).map((u: any) => [u.id, u]))

  const disputes = disputesRaw.map((d: any) => {
    const lease = leaseMap.get(d.lease_id)
    return {
      id: d.id,
      leaseId: d.lease_id,
      type: d.type,
      status: d.status,
      priority: d.priority,
      description: d.description,
      resolution: d.resolution,
      tcComment: d.tc_comment,
      isEscalated: d.is_escalated,
      escalatedAt: d.escalated_at,
      escalationReason: d.escalation_reason,
      investigationNotes: d.investigation_notes,
      evidenceUrls: d.evidence_urls,
      reportedById: d.reported_by_id,
      handledById: d.handled_by_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      lease: lease ? {
        id: lease.id,
        startDate: lease.start_date,
        endDate: lease.end_date,
        monthlyRent: lease.monthly_rent,
        status: lease.status,
        property: lease.property ? {
          id: lease.property.id,
          title: lease.property.title,
          address: lease.property.address,
          city: lease.property.city,
          commune: lease.property.commune,
        } : null,
        tenant: lease.tenant ? {
          id: lease.tenant.id,
          firstName: lease.tenant.first_name,
          lastName: lease.tenant.last_name,
          email: lease.tenant.email,
        } : null,
        owner: lease.owner ? {
          id: lease.owner.id,
          firstName: lease.owner.first_name,
          lastName: lease.owner.last_name,
          email: lease.owner.email,
        } : null,
      } : null,
      reportedBy: userMap.get(d.reported_by_id) ? {
        id: userMap.get(d.reported_by_id).id,
        firstName: userMap.get(d.reported_by_id).first_name,
        lastName: userMap.get(d.reported_by_id).last_name,
        email: userMap.get(d.reported_by_id).email,
        role: userMap.get(d.reported_by_id).role,
      } : null,
      handledBy: userMap.get(d.handled_by_id) ? {
        id: userMap.get(d.handled_by_id).id,
        firstName: userMap.get(d.handled_by_id).first_name,
        lastName: userMap.get(d.handled_by_id).last_name,
        email: userMap.get(d.handled_by_id).email,
        role: userMap.get(d.handled_by_id).role,
      } : null,
    }
  })

  const resp = NextResponse.json(disputes)
  return applyCookies(resp)
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const {
      id, status, resolution, tcComment,
      priority, escalationReason,
      investigationNotes, evidenceUrls,
      action,
    } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant du litige est requis" }, { status: 400 })
    }

    const { data: dispute } = await ((supabase as any)
      .from('disputes')
      .select('*')
      .eq('id', id)
      .single() as any)

    if (!dispute) {
      return NextResponse.json({ error: 'Litige introuvable' }, { status: 404 })
    }

    if (
      dispute.handled_by_id &&
      dispute.handled_by_id !== userId &&
      dispute.status !== 'OPEN'
    ) {
      return NextResponse.json(
        { error: 'Ce litige est déjà pris en charge par un autre TC' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (action === 'ESCALATE') {
      if (dispute.status !== 'IN_REVIEW') {
        return NextResponse.json(
          { error: 'Seuls les litiges en cours de traitement peuvent être escaladés' },
          { status: 400 }
        )
      }
      updateData.is_escalated = true
      updateData.escalated_at = new Date().toISOString()
      updateData.escalation_reason = escalationReason?.trim() || null
    }

    if (status) {
      if (!['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
      }

      const currentStatus = dispute.status
      const validTransitions: Record<string, string[]> = {
        OPEN: ['IN_REVIEW'],
        IN_REVIEW: ['RESOLVED', 'OPEN'],
        RESOLVED: ['CLOSED', 'OPEN'],
        CLOSED: ['OPEN'],
      }

      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `Transition de statut invalide : ${currentStatus} → ${status}` },
          { status: 400 }
        )
      }

      if (status === 'RESOLVED' && currentStatus === 'IN_REVIEW') {
        if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
          return NextResponse.json(
            { error: 'Le texte de résolution est requis pour résoudre un litige' },
            { status: 400 }
          )
        }
      }

      updateData.status = status

      if (status === 'IN_REVIEW' && currentStatus === 'OPEN') {
        updateData.handled_by_id = userId
      }

      if (status === 'OPEN' && currentStatus !== 'OPEN') {
        updateData.handled_by_id = null
      }

      if (resolution !== undefined) updateData.resolution = resolution.trim()
      if (tcComment !== undefined) updateData.tc_comment = tcComment?.trim() || null
    }

    if (priority !== undefined) {
      if (!['NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
        return NextResponse.json({ error: 'Priorité invalide (NORMAL, HIGH, URGENT)' }, { status: 400 })
      }
      updateData.priority = priority
    }

    if (investigationNotes !== undefined) {
      updateData.investigation_notes = investigationNotes?.trim() || null
    }

    if (evidenceUrls !== undefined) {
      if (Array.isArray(evidenceUrls)) {
        const existingUrls: string[] = JSON.parse(dispute.evidence_urls || '[]')
        const newUrls = evidenceUrls.filter((u: string) => !existingUrls.includes(u))
        updateData.evidence_urls = JSON.stringify([...existingUrls, ...newUrls])
      } else if (typeof evidenceUrls === 'string' && evidenceUrls === 'RESET') {
        updateData.evidence_urls = '[]'
      }
    }

    if (tcComment !== undefined && !status) {
      updateData.tc_comment = tcComment?.trim() || null
    }

    if (resolution !== undefined && !status) {
      updateData.resolution = resolution?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    let auditAction = 'DISPUTE_UPDATED'
    if (action === 'ESCALATE') auditAction = 'DISPUTE_ESCALATED'
    else if (status) auditAction = `DISPUTE_${status}`

    const { data: updated } = await ((supabase as any)
      .from('disputes')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single() as any)

    await (supabase.from('audit_logs') as any).insert({
      user_id: userId,
      action: auditAction,
      entity: 'Dispute',
      entity_id: id,
      details: JSON.stringify({
        fromStatus: dispute.status,
        toStatus: status || dispute.status,
        priority,
        escalated: action === 'ESCALATE',
        escalationReason: action === 'ESCALATE' ? escalationReason : undefined,
        hasInvestigationNotes: !!investigationNotes,
        hasEvidence: !!evidenceUrls,
        tcComment: tcComment?.trim() || null,
        hasResolution: !!resolution,
      }),
    })

    const shouldNotify = !!(status || action === 'ESCALATE')
    if (shouldNotify) {
      try {
        if (action === 'ESCALATE') {
          await notifyDisputeEscalated(dispute.reported_by_id, id, escalationReason?.trim())

          // ── Créer un signalement admin automatique pour l'escalade ──
          const signalementDescription = `Litige escaladé par le TC.\n\nType de litige: ${dispute.type}\nDescription: ${dispute.description}\nMotif d'escalade: ${escalationReason?.trim() || 'Non spécifié'}`

          const { data: signalement } = await ((supabase as any)
            .from('signalements')
            .insert({
              id: generateId(),
              reason: 'OTHER',
              description: signalementDescription,
              entity_type: 'Dispute',
              entity_id: id,
              reporter_id: userId,
            })
            .select()
            .single() as any)

          if (signalement) {
            // Notifier tous les admins actifs
            const { data: admins } = await (supabase
              .from('users')
              .select('id')
              .eq('role', 'ADMIN')
              .eq('is_active', true) as any)

            await Promise.all((admins ?? []).map((admin: any) =>
              notify({
                userId: admin.id,
                type: 'SYSTEM',
                title: 'Litige escaladé 🚨',
                message: `Un litige a été escaladé par le TC et nécessite votre attention. Raison : ${escalationReason?.trim() || 'Non spécifiée'}`,
                actionUrl: 'signalements',
                entityId: signalement.id,
              })
            ))
          }
        } else if (status) {
          await notifyDisputeUpdate(dispute.reported_by_id, id, status, tcComment?.trim())
        }
      } catch {
        // Notification is best-effort
      }
    }

    const resp = NextResponse.json(updated)
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Litiges PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
