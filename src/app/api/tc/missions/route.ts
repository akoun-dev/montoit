import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'
import { sendEmail, sendSms } from '@/lib/ansut-messaging'

const MISSION_TYPE_LABELS: Record<string, string> = {
  PROPERTY_VERIFICATION: 'Vérification de propriété',
  INVENTORY_REPORT: 'État des lieux',
}

// Field agents (verification_agents) have no platform account, so they can't
// receive an in-app notify() — reach them by email/SMS instead, the same
// channel used for OTPs elsewhere in the app.
async function notifyAgentOfMission(agent: { first_name: string; email: string; phone: string | null }, missionType: string, propertyTitle: string, propertyAddress: string, scheduledAt: string) {
  const typeLabel = MISSION_TYPE_LABELS[missionType] || missionType
  const when = new Date(scheduledAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
  const text = `Mon Toit - Bonjour ${agent.first_name}, une mission de ${typeLabel} vous a été assignée pour "${propertyTitle}" (${propertyAddress}), le ${when}.`

  const tasks: Promise<unknown>[] = []
  if (agent.email) {
    tasks.push(sendEmail({
      to: agent.email,
      subject: `Mon Toit - Nouvelle mission : ${typeLabel}`,
      content: `<p>${text}</p>`,
      isHtml: true,
    }))
  }
  if (agent.phone) {
    tasks.push(sendSms({ to: agent.phone, text }))
  }
  await Promise.allSettled(tasks)
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
  const agentId = searchParams.get('agentId')
  const propertyId = searchParams.get('propertyId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const calendar = searchParams.get('calendar') === 'true'
  const priority = searchParams.get('priority')

  let query = (supabase.from('missions') as any).select('*').eq('tc_id', userId)

  if (status) query = query.eq('status', status)
  if (agentId) query = query.eq('agent_id', agentId)
  if (propertyId) query = query.eq('property_id', propertyId)
  if (priority) query = query.eq('priority', priority)
  if (dateFrom) query = query.gte('scheduled_at', new Date(dateFrom).toISOString())
  if (dateTo) query = query.lte('scheduled_at', new Date(dateTo).toISOString())

  query = query.order('scheduled_at', { ascending: false })

  const { data: missionsData } = await (query)
  const missionsRaw = (missionsData ?? []) as any[]

  const agentIds = [...new Set(missionsRaw.map((m: any) => m.agent_id).filter(Boolean))]
  const propIds = [...new Set(missionsRaw.map((m: any) => m.property_id).filter(Boolean))]
  const reportIds = [...new Set(missionsRaw.map((m: any) => m.inventory_report_id).filter(Boolean))]

  const [{ data: agentsData }, { data: propertiesData }, { data: reportsData }] = await Promise.all([
    agentIds.length > 0
      ? (supabase.from('verification_agents') as any).select('id, first_name, last_name, email, phone, is_active').in('id', agentIds) as any
      : Promise.resolve({ data: [] as any[], error: null }),
    propIds.length > 0
      ? (supabase.from('properties') as any).select('*, images:property_images(id, url, order)').in('id', propIds) as any
      : Promise.resolve({ data: [] as any[], error: null }),
    reportIds.length > 0
      ? (supabase.from('inventory_reports') as any).select('id, type, status, completed_at').in('id', reportIds) as any
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const agentMap = new Map<string, any>((agentsData ?? []).map((a: any) => [a.id, a]))
  const propMap = new Map<string, any>((propertiesData ?? []).map((p: any) => [p.id, p]))
  const reportMap = new Map<string, any>((reportsData ?? []).map((r: any) => [r.id, r]))

  const missions = missionsRaw.map((m: any) => ({
    id: m.id,
    agentId: m.agent_id,
    propertyId: m.property_id,
    tcId: m.tc_id,
    type: m.type,
    status: m.status,
    priority: m.priority,
    scheduledAt: m.scheduled_at,
    completedAt: m.completed_at,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    notes: m.notes,
    reportUrl: m.report_url,
    photoUrls: m.photo_urls,
    feedback: m.feedback,
    inventoryReportId: m.inventory_report_id,
    agent: agentMap.get(m.agent_id) ? {
      id: agentMap.get(m.agent_id).id,
      firstName: agentMap.get(m.agent_id).first_name,
      lastName: agentMap.get(m.agent_id).last_name,
      email: agentMap.get(m.agent_id).email,
      phone: agentMap.get(m.agent_id).phone,
      isActive: agentMap.get(m.agent_id).is_active,
    } : null,
    property: propMap.get(m.property_id) ? {
      id: propMap.get(m.property_id).id,
      title: propMap.get(m.property_id).title,
      address: propMap.get(m.property_id).address,
      city: propMap.get(m.property_id).city,
      commune: propMap.get(m.property_id).commune,
      type: propMap.get(m.property_id).type,
      images: (propMap.get(m.property_id).images ?? []).map((img: any) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
    } : null,
    inventoryReport: reportMap.get(m.inventory_report_id) ? {
      id: reportMap.get(m.inventory_report_id).id,
      type: reportMap.get(m.inventory_report_id).type,
      status: reportMap.get(m.inventory_report_id).status,
      completedAt: reportMap.get(m.inventory_report_id).completed_at,
    } : null,
  }))

  if (calendar) {
    const grouped: Record<string, typeof missions> = {}
    for (const mission of missions) {
      const dateKey = new Date(mission.scheduledAt).toISOString().split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(mission)
    }
    const resp = NextResponse.json({ calendar: grouped })
    return applyCookies(resp)
  }

  const resp = NextResponse.json(missions)
  return applyCookies(resp)
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { propertyId, agentId, type, scheduledAt, notes, priority } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: "L'identifiant de la propriété est requis" }, { status: 400 })
    }
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: "L'identifiant de l'agent est requis" }, { status: 400 })
    }
    if (!type || !['PROPERTY_VERIFICATION', 'INVENTORY_REPORT'].includes(type)) {
      return NextResponse.json(
        { error: 'Le type de mission doit être PROPERTY_VERIFICATION ou INVENTORY_REPORT' },
        { status: 400 }
      )
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: 'La date planifiée est requise' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Date planifiée invalide' }, { status: 400 })
    }

    const validPriority = priority && ['NORMAL', 'HIGH', 'URGENT'].includes(priority)
      ? priority : 'NORMAL'

    const { data: agent } = await ((supabase as any)
      .from('verification_agents')
      .select('*')
      .eq('id', agentId)
      .single() as any)
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }
    if (agent.tc_id !== userId) {
      return NextResponse.json({ error: 'Cet agent ne vous appartient pas' }, { status: 403 })
    }
    if (!agent.is_active) {
      return NextResponse.json({ error: 'Cet agent est inactif' }, { status: 400 })
    }

    const { data: property } = await ((supabase as any)
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single() as any)
    if (!property) {
      return NextResponse.json({ error: 'Propriété introuvable' }, { status: 404 })
    }
    if (property.status !== 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'La propriété doit être en attente de vérification pour créer une mission' },
        { status: 400 }
      )
    }

    const { data: mission } = await ((supabase as any)
      .from('missions')
      .insert({
        property_id: propertyId,
        agent_id: agentId,
        type,
        scheduled_at: scheduledDate.toISOString(),
        notes: notes?.trim() || null,
        priority: validPriority,
        tc_id: userId,
      })
      .select()
      .single() as any)

    const { data: propertyOwner } = await ((supabase as any)
      .from('properties')
      .select('owner_id, title')
      .eq('id', propertyId)
      .single() as any)
    if (propertyOwner) {
      await notify({
        userId: propertyOwner.owner_id,
        type: 'PROPERTY_VERIFICATION',
        title: 'Vérification programmée pour votre bien',
        message: `Une vérification sur place a été programmée pour votre bien "${propertyOwner.title}".`,
        actionUrl: 'my-properties',
        entityId: mission.id,
      })
    }

    const { data: missionAgent } = await ((supabase as any)
      .from('verification_agents')
      .select('id, first_name, last_name, email, phone')
      .eq('id', agentId)
      .single() as any)

    const { data: missionProperty } = await ((supabase as any)
      .from('properties')
      .select('id, title, address, city')
      .eq('id', propertyId)
      .single() as any)

    if (missionAgent) {
      await notifyAgentOfMission(missionAgent, type, missionProperty?.title || 'Bien immobilier', missionProperty?.address || '', mission.scheduled_at)
    }

    const respData = {
      ...mission,
      agentId: mission.agent_id,
      propertyId: mission.property_id,
      tcId: mission.tc_id,
      scheduledAt: mission.scheduled_at,
      completedAt: mission.completed_at,
      createdAt: mission.created_at,
      updatedAt: mission.updated_at,
      reportUrl: mission.report_url,
      photoUrls: mission.photo_urls,
      inventoryReportId: mission.inventory_report_id,
      agent: missionAgent ? {
        id: missionAgent.id,
        firstName: missionAgent.first_name,
        lastName: missionAgent.last_name,
        email: missionAgent.email,
        phone: missionAgent.phone,
      } : null,
      property: missionProperty ? {
        id: missionProperty.id,
        title: missionProperty.title,
        address: missionProperty.address,
        city: missionProperty.city,
      } : null,
    }

    const resp = NextResponse.json(respData, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Missions POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { id, status, notes, reportUrl, priority, photoUrls, feedback } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant de la mission est requis" }, { status: 400 })
    }

    const { data: mission } = await ((supabase as any)
      .from('missions')
      .select('*')
      .eq('id', id)
      .single() as any)

    if (!mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
    }
    if (mission.tc_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (status) {
      if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
      }

      const currentStatus = mission.status
      const validTransitions: Record<string, string[]> = {
        ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      }

      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `Transition de statut invalide : ${currentStatus} → ${status}` },
          { status: 400 }
        )
      }

      updateData.status = status

      if (status === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString()
      }

      if (status === 'COMPLETED' && mission.type === 'PROPERTY_VERIFICATION') {
        await (supabase as any)
          .from('properties')
          .update({
            is_verified: true,
            status: 'ACTIVE',
          })
          .eq('id', mission.property_id)
      }
    }

    if (priority !== undefined) {
      if (!['NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
        return NextResponse.json({ error: 'Priorité invalide' }, { status: 400 })
      }
      updateData.priority = priority
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null
    }

    if (reportUrl !== undefined) {
      updateData.report_url = reportUrl?.trim() || null
    }

    if (photoUrls !== undefined) {
      if (Array.isArray(photoUrls)) {
        const existingUrls: string[] = JSON.parse(mission.photo_urls || '[]')
        const newUrls = photoUrls.filter((u: string) => !existingUrls.includes(u))
        updateData.photo_urls = JSON.stringify([...existingUrls, ...newUrls])
      } else if (typeof photoUrls === 'string' && photoUrls === 'RESET') {
        updateData.photo_urls = '[]'
      }
    }

    if (feedback !== undefined) {
      updateData.feedback = feedback?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const { data: updated } = await ((supabase as any)
      .from('missions')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single() as any)

    await (supabase.from('audit_logs') as any).insert({
      user_id: userId,
      action: status ? `MISSION_${status}` : 'MISSION_UPDATED',
      entity: 'Mission',
      entity_id: id,
      details: JSON.stringify({
        status,
        priority,
        hasPhotos: !!photoUrls,
        hasFeedback: !!feedback,
      }),
    })

    const resp = NextResponse.json(updated)
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Missions PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
