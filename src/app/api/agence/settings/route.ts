import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

function getSettingKey(userId: string) {
  return `agency_settings_${userId}`
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const key = getSettingKey(userId)

    const { data } = await (admin as any)
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    const settings = data ? JSON.parse(data.value) : {
      commissionRate: '8.5',
      commissionType: 'PERCENTAGE',
    }

    const resp = NextResponse.json({ settings })
    return applyCookies(resp)
  } catch (error) {
    console.error('Agence settings GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const body = await req.json()
    const { commissionRate, commissionType } = body as {
      commissionRate?: string
      commissionType?: string
    }

    const key = getSettingKey(userId)

    // Upsert: check if exists first
    const { data: existing } = await (admin as any)
      .from('platform_settings')
      .select('key')
      .eq('key', key)
      .maybeSingle()

    const value = JSON.stringify({
      commissionRate: commissionRate || '8.5',
      commissionType: commissionType || 'PERCENTAGE',
    })

    if (existing) {
      await (admin as any)
        .from('platform_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
    } else {
      await (admin as any)
        .from('platform_settings')
        .insert({ key, value, description: `Agence settings for user ${userId}` })
    }

    const resp = NextResponse.json({ success: true })
    return applyCookies(resp)
  } catch (error) {
    console.error('Agence settings PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
