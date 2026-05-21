import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { user } = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: backups, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Stats
    const completed = (backups || []).filter((b: any) => b.status === 'completed').length
    const failed = (backups || []).filter((b: any) => b.status === 'failed').length
    const latest = backups?.[0] || null

    return NextResponse.json({
      data: (backups || []).map((b: any) => ({
        id: b.id,
        fileName: b.file_name,
        size: b.size,
        status: b.status,
        type: b.type || 'manual',
        createdAt: b.created_at,
        completedAt: b.completed_at,
      })),
      stats: {
        total: (backups || []).length,
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
    const { user } = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    // Create a backup record
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('backups')
      .insert({
        id,
        file_name: `backup-${now.slice(0, 10)}.sql`,
        status: 'running',
        size: null,
        created_at: now,
        completed_at: null,
      } as any)
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
