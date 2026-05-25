import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { cryptoneoFetch, isCryptoneoSuccess } from '@/lib/cryptoneo'

interface CryptoneoUser {
  alias?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  state?: string
}

interface LocalUser { id: string; email: string | null; phone: string | null }

interface SignatureAlias {
  id: string
  alias_certificat: string
  user_id: string
  is_active: boolean
  email?: string | null
  phone?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: caller } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single() as unknown as { data: { role: string } | null }

    if (caller?.role !== 'admin') {
      const resp = NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
      return applyCookies(resp)
    }

    // Récupérer tous les alias depuis CRYPTONEO
    const res = await cryptoneoFetch('/generateCert/users', { method: 'GET' })

    const responseText = await res.text()
    let result: any
    try { result = JSON.parse(responseText) } catch { result = {} }

    if (!res.ok || !isCryptoneoSuccess(result)) {
      const resp = NextResponse.json({ error: `CRYPTONEO error (${res.status}): ${result?.statusMessage || result?.message || responseText}` }, { status: 502 })
      return applyCookies(resp)
    }

    const cryptoneoUsers: CryptoneoUser[] = result?.data || []

    if (cryptoneoUsers.length === 0) {
      const resp = NextResponse.json({ message: 'Aucun alias trouvé chez CRYPTONEO', synced: 0 })
      return applyCookies(resp)
    }

    // Récupérer tous les emails des utilisateurs locaux
    const { data: localUsers } = await supabase
      .from('users')
      .select('id, email, phone') as unknown as { data: LocalUser[] | null }

    const emailToUser = new Map((localUsers || []).map((u: LocalUser) => [u.email?.toLowerCase(), u]))

    const sa = supabase.from('signature_aliases') as any
    let synced = 0
    let skipped = 0

    for (const cu of cryptoneoUsers) {
      const emailKey = cu.email?.toLowerCase()
      if (!emailKey) { skipped++; continue }

      const localUser = emailToUser.get(emailKey) as LocalUser | undefined
      if (!localUser) { skipped++; continue }

      // Vérifier si un alias existe déjà pour cet utilisateur
      const { data: existing } = await sa
        .select('id, alias_certificat, is_active')
        .eq('user_id', localUser.id)
        .eq('alias_certificat', cu.alias)
        .maybeSingle()

      if (existing) {
        if (!existing.is_active) {
          await sa.update({ is_active: true }).eq('id', existing.id)
          synced++
        }
        continue
      }

      // Désactiver les anciens alias pour cet utilisateur
      await sa
        .update({ is_active: false })
        .eq('user_id', localUser.id)
        .eq('is_active', true)

      // Insérer le nouvel alias
      await sa.insert({
        user_id: localUser.id,
        alias_certificat: cu.alias,
        email: cu.email,
        phone: cu.phone || localUser.phone || '',
        is_active: true,
      })

      synced++
    }

    // Nettoyer les faux alias locaux (local_cert_*)
    const { data: fakeAliases } = await sa
      .select('id, alias_certificat, user_id')
      .like('alias_certificat', 'local_cert_%')

    let deleted = 0
    if (fakeAliases) {
      for (const fa of fakeAliases) {
        const { data: realAlias } = await sa
          .select('id')
          .eq('user_id', fa.user_id)
          .eq('is_active', true)
          .neq('alias_certificat', fa.alias_certificat)
          .maybeSingle()

        if (realAlias) {
          await sa.delete().eq('id', fa.id)
          deleted++
        }
      }
    }

    const resp = NextResponse.json({
      message: 'Synchronisation terminée',
      cryptoneoUsers: cryptoneoUsers.length,
      synced,
      skipped,
      fakeAliasesDeleted: deleted,
    })
    return applyCookies(resp)
  } catch (error: any) {
    console.error('Sync aliases error:', error)

    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Un alias de signature existe déjà pour cet utilisateur.' },
        { status: 409 }
      )
    }

    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
