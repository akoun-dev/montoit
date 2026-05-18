import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyFraudAlert } from '@/lib/notify'

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
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('fraud_alerts')
    .select('*')
    .eq('reporter_id', userId)

  if (status && status !== 'ALL') query = query.eq('status', status)

  if (search) {
    const { data: matchingUsers } = await ((supabase as any)
      .from('users')
      .select('id')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`))
    const userIds = (matchingUsers ?? []).map((u: any) => u.id)
    if (userIds.length > 0) {
      query = query.or(`description.ilike.%${search}%,suspect_id.in.(${userIds.join(',')})`)
    } else {
      query = query.ilike('description', `%${search}%`)
    }
  }

  query = query.order('created_at', { ascending: false })

  const { data: alertsData } = await (query)
  const alertsRaw = (alertsData ?? []) as any[]

  const allUserIds = [...new Set([
    ...alertsRaw.map((a: any) => a.suspect_id),
    ...alertsRaw.map((a: any) => a.reporter_id),
  ].filter(Boolean))]

  const { data: usersData } = allUserIds.length > 0
    ? await ((supabase.from('users') as any).select('id, first_name, last_name, email, phone').in('id', allUserIds) as any)
    : { data: [] as any[] }

  const userMap = new Map<string, any>((usersData ?? []).map((u: any) => [u.id, u]))

  const alerts = alertsRaw.map((a: any) => ({
    id: a.id,
    suspectId: a.suspect_id,
    reporterId: a.reporter_id,
    description: a.description,
    autoDetected: a.auto_detected,
    status: a.status,
    resolution: a.resolution,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    suspect: userMap.get(a.suspect_id) ? {
      id: userMap.get(a.suspect_id).id,
      firstName: userMap.get(a.suspect_id).first_name,
      lastName: userMap.get(a.suspect_id).last_name,
      email: userMap.get(a.suspect_id).email,
      phone: userMap.get(a.suspect_id).phone,
    } : null,
    reporter: userMap.get(a.reporter_id) ? {
      id: userMap.get(a.reporter_id).id,
      firstName: userMap.get(a.reporter_id).first_name,
      lastName: userMap.get(a.reporter_id).last_name,
    } : null,
  }))

  const { data: allStatuses } = await ((supabase as any)
    .from('fraud_alerts')
    .select('status')
    .eq('reporter_id', userId))

  const statsMap: Record<string, number> = { OPEN: 0, INVESTIGATING: 0, CONFIRMED: 0, DISMISSED: 0 }
  for (const a of (allStatuses ?? []) as any[]) {
    if (statsMap[a.status] !== undefined) statsMap[a.status]++
  }

  const resp = NextResponse.json({ alerts, stats: statsMap })
  return applyCookies(resp)
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { suspectId, description, autoDetected } = body

    if (!suspectId || typeof suspectId !== 'string') {
      return NextResponse.json({ error: "Le suspect est requis" }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
    }

    const { data: suspect } = await ((supabase as any)
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', suspectId)
      .single() as any)
    if (!suspect) {
      return NextResponse.json({ error: 'Suspect introuvable' }, { status: 404 })
    }

    const { data: alert } = await ((supabase as any)
      .from('fraud_alerts')
      .insert({
        suspect_id: suspectId,
        reporter_id: userId,
        description: description.trim(),
        auto_detected: autoDetected === true,
        status: 'OPEN',
      })
      .select()
      .single() as any)

    await (supabase.from('audit_logs') as any).insert({
      user_id: userId,
      action: 'FRAUD_ALERT_CREATED',
      entity: 'FraudAlert',
      entity_id: alert.id,
      details: JSON.stringify({ suspectId, description: description.trim() }),
    })

    const { data: tcUsers } = await ((supabase as any)
      .from('users')
      .select('id')
      .eq('role', 'TIERS_CONFIANCE')
      .eq('is_active', true)
      .neq('id', userId))

    const suspectName = `${suspect.first_name} ${suspect.last_name}`
    await Promise.all(
      (tcUsers ?? []).map((tc: any) =>
        notifyFraudAlert(tc.id, suspectName, alert.id)
      )
    )

    const { data: suspectDetail } = await ((supabase as any)
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .eq('id', suspectId)
      .single() as any)

    const respData = {
      ...alert,
      suspectId: alert.suspect_id,
      reporterId: alert.reporter_id,
      autoDetected: alert.auto_detected,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at,
      suspect: suspectDetail ? {
        id: suspectDetail.id,
        firstName: suspectDetail.first_name,
        lastName: suspectDetail.last_name,
        email: suspectDetail.email,
        phone: suspectDetail.phone,
      } : null,
    }

    const resp = NextResponse.json(respData, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Fraud Alerts POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { id, action, resolution } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 })
    }
    if (!action || !['INVESTIGATE', 'CONFIRM', 'DISMISS'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const { data: alert } = await ((supabase as any)
      .from('fraud_alerts')
      .select('*')
      .eq('id', id)
      .single() as any)
    if (!alert) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
    }
    if (alert.reporter_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let newStatus: string
    let auditAction: string

    switch (action) {
      case 'INVESTIGATE':
        if (alert.status !== 'OPEN') {
          return NextResponse.json({ error: 'Seules les alertes ouvertes peuvent être investiguées' }, { status: 400 })
        }
        newStatus = 'INVESTIGATING'
        auditAction = 'FRAUD_ALERT_INVESTIGATING'
        break
      case 'CONFIRM':
        if (alert.status !== 'INVESTIGATING') {
          return NextResponse.json({ error: 'Seules les alertes en investigation peuvent être confirmées' }, { status: 400 })
        }
        newStatus = 'CONFIRMED'
        auditAction = 'FRAUD_ALERT_CONFIRMED'
        break
      case 'DISMISS':
        if (alert.status !== 'INVESTIGATING') {
          return NextResponse.json({ error: 'Seules les alertes en investigation peuvent être écartées' }, { status: 400 })
        }
        newStatus = 'DISMISSED'
        auditAction = 'FRAUD_ALERT_DISMISSED'
        break
      default:
        return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (resolution) {
      updateData.resolution = resolution.trim()
    }

    const { data: updated } = await ((supabase as any)
      .from('fraud_alerts')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single() as any)

    await (supabase.from('audit_logs') as any).insert({
      user_id: userId,
      action: auditAction,
      entity: 'FraudAlert',
      entity_id: id,
      details: JSON.stringify({ suspectId: alert.suspect_id, newStatus, resolution }),
    })

    const resp = NextResponse.json(updated)
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Fraud Alerts PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
