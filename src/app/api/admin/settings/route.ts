import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const SETTING_KEYS = {
  SECURITY: 'admin_security',
  NOTIFICATIONS: 'admin_notifications',
  SLA: 'admin_sla',
  IP_RULES: 'admin_ip_rules',
} as const

interface AdminSecuritySettings {
  otpRequired: boolean
  otpExpiryMinutes: number
  sessionPersistent: boolean
  sessionDurationDays: number
  maxLoginAttempts: number
}

interface AdminNotificationSettings {
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
}

interface AdminSlaSettings {
  tcValidationHours: number
  ownerResponseHours: number
  signalementHours: number
  autoValidationEnabled: boolean
  autoValidationThreshold: number
}

interface AdminIpRules {
  whitelist: string[]
  blacklist: string[]
}

const DEFAULT_SECURITY: AdminSecuritySettings = {
  otpRequired: true,
  otpExpiryMinutes: 5,
  sessionPersistent: true,
  sessionDurationDays: 30,
  maxLoginAttempts: 5,
}

const DEFAULT_NOTIFICATIONS: AdminNotificationSettings = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
}

const DEFAULT_SLA: AdminSlaSettings = {
  tcValidationHours: 48,
  ownerResponseHours: 24,
  signalementHours: 72,
  autoValidationEnabled: true,
  autoValidationThreshold: 70,
}

const DEFAULT_IP_RULES: AdminIpRules = {
  whitelist: [],
  blacklist: [],
}

function getDefaults(key: string) {
  switch (key) {
    case SETTING_KEYS.SECURITY: return DEFAULT_SECURITY
    case SETTING_KEYS.NOTIFICATIONS: return DEFAULT_NOTIFICATIONS
    case SETTING_KEYS.SLA: return DEFAULT_SLA
    case SETTING_KEYS.IP_RULES: return DEFAULT_IP_RULES
    default: return {}
  }
}

async function getSetting(admin: any, key: string) {
  const { data } = await (admin as any)
    .from('platform_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle()
  return data
}

async function upsertSetting(admin: any, key: string, value: any) {
  const existing = await getSetting(admin, key)
  if (existing) {
    await (admin as any)
      .from('platform_settings')
      .update({ value: JSON.stringify(value) })
      .eq('key', key)
  } else {
    await (admin as any)
      .from('platform_settings')
      .insert({ key, value: JSON.stringify(value), description: `Admin settings: ${key}` })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const [securitySetting, notificationSetting, slaSetting, ipRulesSetting] = await Promise.all([
      getSetting(admin, SETTING_KEYS.SECURITY),
      getSetting(admin, SETTING_KEYS.NOTIFICATIONS),
      getSetting(admin, SETTING_KEYS.SLA),
      getSetting(admin, SETTING_KEYS.IP_RULES),
    ])

    const security: AdminSecuritySettings = {
      ...DEFAULT_SECURITY,
      ...(securitySetting ? JSON.parse(securitySetting.value) : {}),
    }
    const notifications: AdminNotificationSettings = {
      ...DEFAULT_NOTIFICATIONS,
      ...(notificationSetting ? JSON.parse(notificationSetting.value) : {}),
    }
    const sla: AdminSlaSettings = {
      ...DEFAULT_SLA,
      ...(slaSetting ? JSON.parse(slaSetting.value) : {}),
    }
    const ipRules: AdminIpRules = {
      ...DEFAULT_IP_RULES,
      ...(ipRulesSetting ? JSON.parse(ipRulesSetting.value) : {}),
    }

    const resp = NextResponse.json({ security, notifications, sla, ipRules })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin settings GET error:', error)
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
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { section, values } = body as { section: string; values: any }

    let key: string
    switch (section) {
      case 'security': key = SETTING_KEYS.SECURITY; break
      case 'notifications': key = SETTING_KEYS.NOTIFICATIONS; break
      case 'sla': key = SETTING_KEYS.SLA; break
      case 'ipRules': key = SETTING_KEYS.IP_RULES; break
      default:
        return NextResponse.json({ error: 'Section invalide' }, { status: 400 })
    }

    const existing = await getSetting(admin, key)
    const current = existing ? JSON.parse(existing.value) : {}
    const merged = { ...getDefaults(key), ...current, ...values }

    await upsertSetting(admin, key, merged)

    const resp = NextResponse.json({ success: true, [section]: merged })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin settings PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
