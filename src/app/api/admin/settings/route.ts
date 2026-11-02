import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const SETTING_KEYS = {
  SECURITY: 'admin_security',
  NOTIFICATIONS: 'admin_notifications',
  SLA: 'admin_sla',
  IP_RULES: 'admin_ip_rules',
  PLATFORM: 'admin_platform',
  FEATURES: 'admin_features',
  RGPD: 'admin_rgpd',
  ALERT_TYPES: 'admin_alert_types',
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

interface AdminPlatformSettings {
  name: string
  url: string
  currency: string
  timezone: string
}

interface AdminFeatureFlags {
  virtualTours: boolean
  kycVerification: boolean
  autoValidation: boolean
  maintenanceRequests: boolean
  fraudDetection: boolean
  messaging: boolean
}

interface AdminRgpdSettings {
  cookieConsent: boolean
  rightToErasure: boolean
  dataExport: boolean
  autoRetention: boolean
  accessLog: boolean
  privacyUrl: string
  termsUrl: string
}

interface AdminAlertTypes {
  newUsers: boolean
  criticalSignalements: boolean
  overduePayments: boolean
  systemErrors: boolean
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

const DEFAULT_PLATFORM: AdminPlatformSettings = {
  name: 'Mon Toit',
  url: 'https://montoit.ci',
  currency: 'FCFA',
  timezone: 'Africa/Abidjan',
}

const DEFAULT_FEATURES: AdminFeatureFlags = {
  virtualTours: true,
  kycVerification: true,
  autoValidation: false,
  maintenanceRequests: true,
  fraudDetection: true,
  messaging: true,
}

const DEFAULT_RGPD: AdminRgpdSettings = {
  cookieConsent: true,
  rightToErasure: true,
  dataExport: true,
  autoRetention: true,
  accessLog: true,
  privacyUrl: 'https://montoit.ci/privacy',
  termsUrl: 'https://montoit.ci/terms',
}

const DEFAULT_ALERT_TYPES: AdminAlertTypes = {
  newUsers: true,
  criticalSignalements: true,
  overduePayments: true,
  systemErrors: true,
}

function getDefaults(key: string) {
  switch (key) {
    case SETTING_KEYS.SECURITY: return DEFAULT_SECURITY
    case SETTING_KEYS.NOTIFICATIONS: return DEFAULT_NOTIFICATIONS
    case SETTING_KEYS.SLA: return DEFAULT_SLA
    case SETTING_KEYS.IP_RULES: return DEFAULT_IP_RULES
    case SETTING_KEYS.PLATFORM: return DEFAULT_PLATFORM
    case SETTING_KEYS.FEATURES: return DEFAULT_FEATURES
    case SETTING_KEYS.RGPD: return DEFAULT_RGPD
    case SETTING_KEYS.ALERT_TYPES: return DEFAULT_ALERT_TYPES
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

    const [
      securitySetting,
      notificationSetting,
      slaSetting,
      ipRulesSetting,
      platformSetting,
      featuresSetting,
      rgpdSetting,
      alertTypesSetting,
    ] = await Promise.all([
      getSetting(admin, SETTING_KEYS.SECURITY),
      getSetting(admin, SETTING_KEYS.NOTIFICATIONS),
      getSetting(admin, SETTING_KEYS.SLA),
      getSetting(admin, SETTING_KEYS.IP_RULES),
      getSetting(admin, SETTING_KEYS.PLATFORM),
      getSetting(admin, SETTING_KEYS.FEATURES),
      getSetting(admin, SETTING_KEYS.RGPD),
      getSetting(admin, SETTING_KEYS.ALERT_TYPES),
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
    const platform: AdminPlatformSettings = {
      ...DEFAULT_PLATFORM,
      ...(platformSetting ? JSON.parse(platformSetting.value) : {}),
    }
    const features: AdminFeatureFlags = {
      ...DEFAULT_FEATURES,
      ...(featuresSetting ? JSON.parse(featuresSetting.value) : {}),
    }
    const rgpd: AdminRgpdSettings = {
      ...DEFAULT_RGPD,
      ...(rgpdSetting ? JSON.parse(rgpdSetting.value) : {}),
    }
    const alertTypes: AdminAlertTypes = {
      ...DEFAULT_ALERT_TYPES,
      ...(alertTypesSetting ? JSON.parse(alertTypesSetting.value) : {}),
    }

    const resp = NextResponse.json({ security, notifications, sla, ipRules, platform, features, rgpd, alertTypes })
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
      case 'platform': key = SETTING_KEYS.PLATFORM; break
      case 'features': key = SETTING_KEYS.FEATURES; break
      case 'rgpd': key = SETTING_KEYS.RGPD; break
      case 'alertTypes': key = SETTING_KEYS.ALERT_TYPES; break
      default:
        return NextResponse.json({ error: 'Section invalide' }, { status: 400 })
    }

    const existing = await getSetting(admin, key)
    const current = existing ? JSON.parse(existing.value) : {}
    const merged = { ...getDefaults(key), ...current, ...values }

    await upsertSetting(admin, key, merged)

    await admin.from('audit_logs').insert({
      id: crypto.randomUUID(),
      action: 'ADMIN_SETTINGS_UPDATED',
      entity: 'PlatformSettings',
      entity_id: section,
      details: JSON.stringify({ section, values }),
      user_id: userId,
    } as any)

    const resp = NextResponse.json({ success: true, [section]: merged })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin settings PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
