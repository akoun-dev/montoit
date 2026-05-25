import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: _backups, error }: { data: any[]; error: any } = await (supabase as any)
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const backupList: any[] = (_backups ?? []) as any[]

    // Stats
    const completed = backupList.filter((b: any) => b.status === 'completed').length
    const failed = backupList.filter((b: any) => b.status === 'failed').length
    const latest = backupList[0] || null

    return NextResponse.json({
      data: backupList.map((b: any) => ({
        id: b.id,
        fileName: b.file_name,
        size: b.size,
        status: b.status,
        type: b.type || 'manual',
        createdAt: b.created_at,
        completedAt: b.completed_at,
      })),
      stats: {
        total: (_backups ?? []).length,
        completed,
        failed,
        latestSize: latest?.size || '—',
        latestDate: latest?.created_at || null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Create a backup record
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const now = new Date().toISOString()

    const { data, error }: { data: any; error: any } = await (supabase as any)
      .from('backups')
      .insert({
        id,
        file_name: `backup-${now.slice(0, 10)}.sql`,
        status: 'running',
        size: null,
        created_at: now,
        completed_at: null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Simulate backup completion (in real scenario, this would be async)
    setTimeout(async () => {
      await supabase
        .from('backups')
        .update({
          status: 'completed',
          size: `${(Math.random() * 100 + 10).toFixed(1)} MB`,
          completed_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
    }, 2000)

    return NextResponse.json({
      data: {
        id: data.id,
        fileName: data.file_name,
        status: 'running',
        createdAt: data.created_at,
      },
      message: 'Sauvegarde démarrée',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
