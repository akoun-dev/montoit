import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

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
  const filter = searchParams.get('filter') || 'ALL'
  const search = searchParams.get('search')?.trim()

  let query = supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, nni, oneci_verified, oneci_verified_at, neoface_verified, neoface_verified_at, role')
    .order('created_at', { ascending: false })
    .limit(100)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  switch (filter) {
    case 'ONECI_VERIFIED':
      query = query.eq('oneci_verified', true)
      break
    case 'ONECI_PENDING':
      query = query.eq('oneci_verified', false)
      break
    case 'NEOFACE_VERIFIED':
      query = query.eq('neoface_verified', true)
      break
    case 'NEOFACE_PENDING':
      query = query.eq('neoface_verified', false)
      break
  }

  const { data: usersData } = await (query)

  const users = (usersData ?? []).map((u: any) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone: u.phone,
    nni: u.nni,
    oneciVerified: u.oneci_verified,
    oneciVerifiedAt: u.oneci_verified_at,
    neofaceVerified: u.neoface_verified,
    neofaceVerifiedAt: u.neoface_verified_at,
    role: u.role,
  }))

  const { count: totalUsers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })

  const { count: oneciVerifiedCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('oneci_verified', true)

  const { count: neofaceVerifiedCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('neoface_verified', true)

  const oneciPendingCount = (totalUsers ?? 0) - (oneciVerifiedCount ?? 0)
  const neofacePendingCount = (totalUsers ?? 0) - (neofaceVerifiedCount ?? 0)

  const resp = NextResponse.json({
    users,
    stats: {
      totalUsers: totalUsers ?? 0,
      oneciVerified: oneciVerifiedCount ?? 0,
      neofaceVerified: neofaceVerifiedCount ?? 0,
      oneciPending: Math.max(0, oneciPendingCount),
      neofacePending: Math.max(0, neofacePendingCount),
    },
  })
  return applyCookies(resp)
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId: tcUserId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { userId, action, comment } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: "L'identifiant utilisateur est requis" }, { status: 400 })
    }
    if (!action || !['VERIFY_ONECI', 'REJECT_ONECI', 'VERIFY_NEOFACE', 'REJECT_NEOFACE'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const { data: user } = await ((supabase as any)
      .from('users')
      .select('*')
      .eq('id', userId)
      .single() as any)
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    switch (action) {
      case 'VERIFY_ONECI':
        updateData.oneci_verified = true
        updateData.oneci_verified_at = new Date().toISOString()
        break
      case 'REJECT_ONECI':
        updateData.oneci_verified = false
        updateData.oneci_verified_at = null
        break
      case 'VERIFY_NEOFACE':
        updateData.neoface_verified = true
        updateData.neoface_verified_at = new Date().toISOString()
        break
      case 'REJECT_NEOFACE':
        updateData.neoface_verified = false
        updateData.neoface_verified_at = null
        break
    }

    const { data: updated } = await ((supabase as any)
      .from('users')
      .update(updateData as any)
      .eq('id', userId)
      .select('id, first_name, last_name, email, phone, nni, oneci_verified, oneci_verified_at, neoface_verified, neoface_verified_at, role')
      .single() as any)

    const actionLabel = action.startsWith('VERIFY') ? 'vérifiée' : 'rejetée'
    const typeLabel = action.includes('ONECI') ? 'ONECI' : 'NeoFace'

    await (supabase.from('audit_logs') as any).insert({
      user_id: tcUserId,
      action: `ONECI_${action}`,
      entity: 'User',
      entity_id: userId,
      details: JSON.stringify({ action, comment, type: typeLabel }),
    })

    const isVerified = action.startsWith('VERIFY')
    await notify({
      userId,
      type: 'DOSSIER_UPDATE',
      title: `Vérification ${typeLabel} ${isVerified ? 'confirmée' : 'rejetée'}`,
      message: isVerified
        ? `Votre vérification ${typeLabel} a été ${actionLabel}.`
        : `Votre vérification ${typeLabel} a été rejetée.${comment ? ` Commentaire : ${comment}` : ''}`,
      actionUrl: 'trust-score',
      entityId: userId,
    })

    const respData = {
      id: updated.id,
      firstName: updated.first_name,
      lastName: updated.last_name,
      email: updated.email,
      phone: updated.phone,
      nni: updated.nni,
      oneciVerified: updated.oneci_verified,
      oneciVerifiedAt: updated.oneci_verified_at,
      neofaceVerified: updated.neoface_verified,
      neofaceVerifiedAt: updated.neoface_verified_at,
      role: updated.role,
    }

    const resp = NextResponse.json(respData)
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC ONECI PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
