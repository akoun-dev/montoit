import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const VALID_KEYS = ['messages', 'dossierUpdates', 'visitReminders', 'paymentAlerts', 'promotions'] as const

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!prefs) {
      const { data: created, error } = await admin
        .from('notification_preferences')
        .insert({ id: crypto.randomUUID(), user_id: userId })
        .select()
        .single()

      if (error) throw error

      const response = NextResponse.json({ preferences: mapPrefs(created) })
      return applyCookies(response)
    }

    const response = NextResponse.json({ preferences: mapPrefs(prefs) })
    return applyCookies(response)
  } catch (error) {
    console.error('Notification preferences GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const updateData: Record<string, boolean> = {}

    for (const key of VALID_KEYS) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'boolean') {
          const resp = NextResponse.json({ error: `La valeur de ${key} doit être un booléen` }, { status: 400 })
          return applyCookies(resp)
        }
        updateData[key] = body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      const resp = NextResponse.json({ error: 'Aucune préférence à mettre à jour' }, { status: 400 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()
    const supabaseData: Record<string, boolean | string> = {}
    for (const [key, val] of Object.entries(updateData)) {
      supabaseData[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = val
    }

    const { data: prefs, error } = await admin
      .from('notification_preferences')
      .upsert({ user_id: userId, ...supabaseData })
      .select()
      .single()

    if (error) throw error

    const response = NextResponse.json({ preferences: mapPrefs(prefs) })
    return applyCookies(response)
  } catch (error) {
    console.error('Notification preferences PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function mapPrefs(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    messages: row.messages,
    dossierUpdates: row.dossier_updates,
    visitReminders: row.visit_reminders,
    paymentAlerts: row.payment_alerts,
    promotions: row.promotions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
