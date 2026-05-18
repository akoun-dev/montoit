import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

const SETTING_KEY = 'owner_default_conditions'

interface DefaultConditions {
  depositMonths: number
  leaseDurationMonths: number
  defaultCharges: number
  smokingPolicy: 'INTERDIT' | 'AUTORISE' | 'NON_SPECIFIE'
  petPolicy: 'INTERDIT' | 'AUTORISE' | 'NON_SPECIFIE'
  minIncomeRatio: number
  minDocuments: number
  defaultSort: 'DATE' | 'REVENUE' | 'CATEGORY'
}

const DEFAULT_CONDITIONS: DefaultConditions = {
  depositMonths: 2,
  leaseDurationMonths: 12,
  defaultCharges: 0,
  smokingPolicy: 'NON_SPECIFIE',
  petPolicy: 'NON_SPECIFIE',
  minIncomeRatio: 3,
  minDocuments: 3,
  defaultSort: 'DATE',
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const userKey = `${SETTING_KEY}_${userId}`
    const { data: setting } = await ((supabase as any)
      .from('default_conditions')
      .select('*')
      .eq('key', userKey)
      .maybeSingle() as any)

    if (!setting) {
      return NextResponse.json({ conditions: DEFAULT_CONDITIONS })
    }

    const conditions: DefaultConditions = {
      ...DEFAULT_CONDITIONS,
      ...JSON.parse(setting.value),
    }

    return NextResponse.json({ conditions })
  } catch (error) {
    console.error('Default conditions GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const conditions: Partial<DefaultConditions> = {}

    if (body.depositMonths !== undefined) {
      const val = Number(body.depositMonths)
      if (isNaN(val) || val < 0 || val > 12) {
        return NextResponse.json({ error: 'Le nombre de mois de caution doit être entre 0 et 12' }, { status: 400 })
      }
      conditions.depositMonths = val
    }

    if (body.leaseDurationMonths !== undefined) {
      const val = Number(body.leaseDurationMonths)
      if (isNaN(val) || val < 1 || val > 120) {
        return NextResponse.json({ error: 'La durée du bail doit être entre 1 et 120 mois' }, { status: 400 })
      }
      conditions.leaseDurationMonths = val
    }

    if (body.defaultCharges !== undefined) {
      const val = Number(body.defaultCharges)
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ error: 'Le montant des charges doit être positif' }, { status: 400 })
      }
      conditions.defaultCharges = val
    }

    if (body.smokingPolicy !== undefined) {
      if (!['INTERDIT', 'AUTORISE', 'NON_SPECIFIE'].includes(body.smokingPolicy)) {
        return NextResponse.json({ error: 'Politique fumeur invalide' }, { status: 400 })
      }
      conditions.smokingPolicy = body.smokingPolicy
    }

    if (body.petPolicy !== undefined) {
      if (!['INTERDIT', 'AUTORISE', 'NON_SPECIFIE'].includes(body.petPolicy)) {
        return NextResponse.json({ error: 'Politique animaux invalide' }, { status: 400 })
      }
      conditions.petPolicy = body.petPolicy
    }

    if (body.minIncomeRatio !== undefined) {
      const val = Number(body.minIncomeRatio)
      if (isNaN(val) || val < 1 || val > 10) {
        return NextResponse.json({ error: 'Le ratio revenu/loyer doit être entre 1 et 10' }, { status: 400 })
      }
      conditions.minIncomeRatio = val
    }

    if (body.minDocuments !== undefined) {
      const val = Number(body.minDocuments)
      if (isNaN(val) || val < 0 || val > 20) {
        return NextResponse.json({ error: 'Le nombre de documents minimum doit être entre 0 et 20' }, { status: 400 })
      }
      conditions.minDocuments = val
    }

    if (body.defaultSort !== undefined) {
      if (!['DATE', 'REVENUE', 'CATEGORY'].includes(body.defaultSort)) {
        return NextResponse.json({ error: 'Tri par défaut invalide' }, { status: 400 })
      }
      conditions.defaultSort = body.defaultSort
    }

    if (Object.keys(conditions).length === 0) {
      return NextResponse.json({ error: 'Aucune condition à mettre à jour' }, { status: 400 })
    }

    const userKey = `${SETTING_KEY}_${userId}`
    const { data: existing } = await ((supabase as any)
      .from('default_conditions')
      .select('*')
      .eq('key', userKey)
      .maybeSingle() as any)

    const mergedConditions: DefaultConditions = {
      ...DEFAULT_CONDITIONS,
      ...(existing ? JSON.parse(existing.value) : {}),
      ...conditions,
    }

    if (existing) {
      await (supabase.from('default_conditions') as any).update({
        value: JSON.stringify(mergedConditions),
      }).eq('key', userKey)
    } else {
      await (supabase.from('default_conditions') as any).insert({
        key: userKey,
        value: JSON.stringify(mergedConditions),
        description: `Conditions locatives par défaut pour le propriétaire ${userId}`,
      })
    }

    const resp = NextResponse.json({ conditions: mergedConditions })
    return applyCookies(resp)
  } catch (error) {
    console.error('Default conditions PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
