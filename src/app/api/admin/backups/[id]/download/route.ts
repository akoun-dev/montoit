import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

async function requireAdmin(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  if (!auth.userId) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  const supabase = getSupabaseAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .single()
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 }) }
  }
  return { userId: auth.userId }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error
    const { id } = await params

    const supabase = getSupabaseAdminClient()
    const { data: backup } = await (supabase as any).from('backups').select('*').eq('id', id).single()
    if (!backup || !backup.storage_path) {
      return NextResponse.json({ error: 'Sauvegarde introuvable ou indisponible' }, { status: 404 })
    }

    const { data, error } = await supabase.storage
      .from('backups')
      // SEC-006 : le bucket `backups` est privé dès sa création (migration
      // 20260910000000, `public = false`) — lecture uniquement via URL signée.
      // Expiration volontairement plus courte que le standard 1 h
      // (SIGNED_URL_EXPIRES_IN_SECONDS) : l'URL est renvoyée au client admin.
      .createSignedUrl(backup.storage_path, 60, { download: backup.file_name })

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Échec de génération du lien' }, { status: 500 })
    }

    return NextResponse.json(
      { url: data.signedUrl },
      // L'URL signée ne doit jamais être mise en cache (intermédiaires/navigateur)
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
