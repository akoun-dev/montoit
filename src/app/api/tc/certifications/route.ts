import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify, notifyCertificationGranted } from '@/lib/notify'

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
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('certifications')
    .select('*')
    .eq('granted_by_id', userId)

  if (status && status !== 'ALL') query = query.eq('status', status)
  if (type && type !== 'ALL') query = query.eq('type', type)

  if (search) {
    const { data: matchingUsers } = await ((supabase as any)
      .from('users')
      .select('id')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`))
    const userIds = (matchingUsers ?? []).map((u: any) => u.id)
    if (userIds.length > 0) {
      query = query.or(`notes.ilike.%${search}%,user_id.in.(${userIds.join(',')})`)
    } else {
      query = query.ilike('notes', `%${search}%`)
    }
  }

  query = query.order('created_at', { ascending: false })

  const { data: certificationsData } = await (query)
  const certs = (certificationsData ?? []) as any[]

  const userIds = [...new Set([...certs.map((c: any) => c.user_id), ...certs.map((c: any) => c.granted_by_id)].filter(Boolean))]
  const propIds = [...new Set(certs.map((c: any) => c.property_id).filter(Boolean))]

  const { data: usersData } = userIds.length > 0
    ? await ((supabase.from('users') as any).select('id, first_name, last_name, email').in('id', userIds) as any)
    : { data: [] as any[] }

  const { data: propertiesData } = propIds.length > 0
    ? await ((supabase.from('properties') as any).select('id, title').in('id', propIds) as any)
    : { data: [] as any[] }

  const userMap = new Map<string, any>((usersData ?? []).map((u: any) => [u.id, u]))
  const propMap = new Map<string, any>((propertiesData ?? []).map((p: any) => [p.id, p]))

  const certifications = certs.map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    grantedById: c.granted_by_id,
    type: c.type,
    status: c.status,
    notes: c.notes,
    expiresAt: c.expires_at,
    propertyId: c.property_id,
    revokedAt: c.revoked_at,
    revocationReason: c.revocation_reason,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    user: userMap.get(c.user_id) ? {
      id: userMap.get(c.user_id).id,
      firstName: userMap.get(c.user_id).first_name,
      lastName: userMap.get(c.user_id).last_name,
      email: userMap.get(c.user_id).email,
    } : null,
    grantedBy: userMap.get(c.granted_by_id) ? {
      id: userMap.get(c.granted_by_id).id,
      firstName: userMap.get(c.granted_by_id).first_name,
      lastName: userMap.get(c.granted_by_id).last_name,
    } : null,
    property: propMap.get(c.property_id) ? {
      id: propMap.get(c.property_id).id,
      title: propMap.get(c.property_id).title,
    } : null,
  }))

  const { data: allStatuses } = await ((supabase as any)
    .from('certifications')
    .select('status')
    .eq('granted_by_id', userId))

  const statsMap: Record<string, number> = { PENDING: 0, GRANTED: 0, REVOKED: 0, EXPIRED: 0 }
  for (const c of (allStatuses ?? []) as any[]) {
    if (statsMap[c.status] !== undefined) statsMap[c.status]++
  }
  statsMap.TOTAL = Object.values(statsMap).reduce((a, b) => a + b, 0)

  const resp = NextResponse.json({ certifications, stats: statsMap })
  return applyCookies(resp)
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { userId: targetUserId, type, notes, expiresAt, propertyId } = body

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: "L'utilisateur est requis" }, { status: 400 })
    }
    if (!type || !['USER_IDENTITY', 'PROPERTY', 'AGENCY'].includes(type)) {
      return NextResponse.json({ error: 'Le type de certification est invalide' }, { status: 400 })
    }

    const { data: user } = await ((supabase as any)
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .single() as any)
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Une certification AGENCY identifie sa cible via user_id (les agences
    // sont de simples `users` avec role='AGENCE', il n'existe pas de table
    // agences dédiée) : elle ne peut donc être délivrée qu'à un tel compte.
    if (type === 'AGENCY' && user.role !== 'AGENCE') {
      return NextResponse.json({ error: 'La certification agence ne peut être délivrée qu\'à un compte agence' }, { status: 400 })
    }

    if (type === 'PROPERTY' && propertyId) {
      const { data: property } = await ((supabase as any)
        .from('properties')
        .select('id, owner_id')
        .eq('id', propertyId)
        .single() as any)
      if (!property) {
        return NextResponse.json({ error: 'Bien immobilier introuvable' }, { status: 404 })
      }
      if (property.owner_id !== targetUserId) {
        return NextResponse.json({ error: 'Ce bien n\'appartient pas à l\'utilisateur certifié' }, { status: 400 })
      }
    }

    const { data: certification } = await ((supabase as any)
      .from('certifications')
      .insert({
        user_id: targetUserId,
        granted_by_id: userId,
        type,
        notes: notes?.trim() || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        property_id: type === 'PROPERTY' ? propertyId || null : null,
        status: 'PENDING',
      })
      .select()
      .single() as any)

    await (supabase.from('audit_logs') as any).insert({
      user_id: userId,
      action: 'CERTIFICATION_CREATED',
      entity: 'Certification',
      entity_id: certification.id,
      details: JSON.stringify({ type, targetUserId }),
    })

    const { data: certUser } = await ((supabase as any)
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', targetUserId)
      .single() as any)

    const { data: certGrantedBy } = await ((supabase as any)
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single() as any)

    let certProperty: any = null
    if (certification.property_id) {
      const { data: cp } = await ((supabase as any)
        .from('properties')
        .select('id, title')
        .eq('id', certification.property_id)
        .single() as any)
      certProperty = cp
    }

    const respData = {
      ...certification,
      userId: certification.user_id,
      grantedById: certification.granted_by_id,
      propertyId: certification.property_id,
      expiresAt: certification.expires_at,
      createdAt: certification.created_at,
      updatedAt: certification.updated_at,
      user: certUser ? { id: certUser.id, firstName: certUser.first_name, lastName: certUser.last_name, email: certUser.email } : null,
      grantedBy: certGrantedBy ? { id: certGrantedBy.id, firstName: certGrantedBy.first_name, lastName: certGrantedBy.last_name } : null,
      property: certProperty ? { id: certProperty.id, title: certProperty.title } : null,
    }

    const resp = NextResponse.json(respData, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Certifications POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { id, action, revocationReason } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant est requis" }, { status: 400 })
    }
    if (!action || !['GRANT', 'REVOKE'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide (GRANT ou REVOKE)' }, { status: 400 })
    }

    const { data: cert } = await ((supabase as any)
      .from('certifications')
      .select('*')
      .eq('id', id)
      .single() as any)
    if (!cert) {
      return NextResponse.json({ error: 'Certification introuvable' }, { status: 404 })
    }
    if (cert.granted_by_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (action === 'GRANT') {
      if (cert.status !== 'PENDING') {
        return NextResponse.json({ error: 'Seules les certifications en attente peuvent être accordées' }, { status: 400 })
      }

      const { data: updated } = await ((supabase as any)
        .from('certifications')
        .update({ status: 'GRANTED' })
        .eq('id', id)
        .select()
        .single() as any)

      await (supabase.from('audit_logs') as any).insert({
        user_id: userId,
        action: 'CERTIFICATION_GRANTED',
        entity: 'Certification',
        entity_id: id,
        details: JSON.stringify({ type: cert.type, targetUserId: cert.user_id }),
      })

      const certTypeLabel = cert.type === 'USER_IDENTITY' ? "d'identité" : cert.type === 'PROPERTY' ? 'de bien immobilier' : "d'agence"
      await notifyCertificationGranted(cert.user_id, certTypeLabel, id)

      const { data: certUser } = await ((supabase as any)
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', cert.user_id)
        .single() as any)

      const { data: certGrantedBy } = await ((supabase as any)
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .single() as any)

      const respData = {
        ...updated,
        userId: updated.user_id,
        grantedById: updated.granted_by_id,
        propertyId: updated.property_id,
        expiresAt: updated.expires_at,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        user: certUser ? { id: certUser.id, firstName: certUser.first_name, lastName: certUser.last_name, email: certUser.email } : null,
        grantedBy: certGrantedBy ? { id: certGrantedBy.id, firstName: certGrantedBy.first_name, lastName: certGrantedBy.last_name } : null,
      }

      const resp = NextResponse.json(respData)
      return applyCookies(resp)
    }

    if (action === 'REVOKE') {
      if (cert.status !== 'GRANTED') {
        return NextResponse.json({ error: 'Seules les certifications accordées peuvent être révoquées' }, { status: 400 })
      }

      const { data: updated } = await ((supabase as any)
        .from('certifications')
        .update({
          status: 'REVOKED',
          revoked_at: new Date().toISOString(),
          revocation_reason: revocationReason?.trim() || null,
        })
        .eq('id', id)
        .select()
        .single() as any)

      await (supabase.from('audit_logs') as any).insert({
        user_id: userId,
        action: 'CERTIFICATION_REVOKED',
        entity: 'Certification',
        entity_id: id,
        details: JSON.stringify({ type: cert.type, targetUserId: cert.user_id, revocationReason }),
      })

      await notify({
        userId: cert.user_id,
        type: 'DOSSIER_UPDATE',
        title: 'Certification révoquée',
        message: `Votre certification ${cert.type === 'USER_IDENTITY' ? "d'identité" : cert.type === 'PROPERTY' ? 'de bien immobilier' : "d'agence"} a été révoquée.${revocationReason ? ` Raison : ${revocationReason}` : ''}`,
        actionUrl: 'certifications',
        entityId: id,
      })

      const { data: certUser } = await ((supabase as any)
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', cert.user_id)
        .single() as any)

      const { data: certGrantedBy } = await ((supabase as any)
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .single() as any)

      const respData = {
        ...updated,
        userId: updated.user_id,
        grantedById: updated.granted_by_id,
        propertyId: updated.property_id,
        expiresAt: updated.expires_at,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        revokedAt: updated.revoked_at,
        revocationReason: updated.revocation_reason,
        user: certUser ? { id: certUser.id, firstName: certUser.first_name, lastName: certUser.last_name, email: certUser.email } : null,
        grantedBy: certGrantedBy ? { id: certGrantedBy.id, firstName: certGrantedBy.first_name, lastName: certGrantedBy.last_name } : null,
      }

      const resp = NextResponse.json(respData)
      return applyCookies(resp)
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
  } catch (error) {
    console.error('[TC Certifications PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
