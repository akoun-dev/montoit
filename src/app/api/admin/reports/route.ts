import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

type Period = 'week' | 'month' | 'quarter' | 'year'

function startOfPeriod(period: Period, now: Date): Date {
  switch (period) {
    case 'week': {
      const d = new Date(now)
      const day = d.getDay() // 0 = Sunday
      const diffToMonday = (day + 6) % 7
      d.setDate(d.getDate() - diffToMonday)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      return new Date(now.getFullYear(), quarterStartMonth, 1)
    }
    case 'year':
      return new Date(now.getFullYear(), 0, 1)
  }
}

// Equal-duration current vs. previous window, so the % change is a fair
// comparison regardless of how far into the period "now" falls.
function getRanges(period: Period, now: Date) {
  const start = startOfPeriod(period, now)
  const end = now
  const lengthMs = end.getTime() - start.getTime()
  const prevEnd = start
  const prevStart = new Date(start.getTime() - lengthMs)
  return { start, end, prevStart, prevEnd }
}

function computeChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

async function countInRange(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  table: string,
  dateColumn: string,
  start: Date,
  end: Date,
  extra?: (q: any) => any,
): Promise<number> {
  let q = (admin as any)
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte(dateColumn, start.toISOString())
    .lt(dateColumn, end.toISOString())
  if (extra) q = extra(q)
  const { count } = await q
  return count || 0
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', userId).single()
    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const period = (['week', 'month', 'quarter', 'year'].includes(searchParams.get('period') || '')
      ? searchParams.get('period')
      : 'month') as Period

    const now = new Date()
    const { start, end, prevStart, prevEnd } = getRanges(period, now)

    const [
      newUsersCurrent, newUsersPrevious,
      newPropertiesCurrent, newPropertiesPrevious,
      validatedFilesCurrent, validatedFilesPrevious,
    ] = await Promise.all([
      countInRange(admin, 'users', 'created_at', start, end),
      countInRange(admin, 'users', 'created_at', prevStart, prevEnd),
      countInRange(admin, 'properties', 'created_at', start, end),
      countInRange(admin, 'properties', 'created_at', prevStart, prevEnd),
      countInRange(admin, 'rental_files', 'reviewed_at', start, end, (q: any) => q.eq('status', 'VALIDATED')),
      countInRange(admin, 'rental_files', 'reviewed_at', prevStart, prevEnd, (q: any) => q.eq('status', 'VALIDATED')),
    ])

    // Leases fully signed: bucket by the later of the two signature timestamps.
    const { data: signedLeasesData } = await (admin as any)
      .from('leases')
      .select('owner_signed_at, tenant_signed_at')
      .not('owner_signed_at', 'is', null)
      .not('tenant_signed_at', 'is', null)
    const signedAtOf = (l: any) => {
      const o = l.owner_signed_at ? new Date(l.owner_signed_at).getTime() : 0
      const t = l.tenant_signed_at ? new Date(l.tenant_signed_at).getTime() : 0
      return Math.max(o, t)
    }
    const signedLeasesCurrent = (signedLeasesData ?? []).filter((l: any) => {
      const ts = signedAtOf(l)
      return ts >= start.getTime() && ts < end.getTime()
    }).length
    const signedLeasesPrevious = (signedLeasesData ?? []).filter((l: any) => {
      const ts = signedAtOf(l)
      return ts >= prevStart.getTime() && ts < prevEnd.getTime()
    }).length

    // Disputes resolved: no dedicated resolved_at column, updated_at is the
    // best available signal for when a dispute last changed status.
    const resolvedDisputesCurrent = await countInRange(admin, 'disputes', 'updated_at', start, end, (q: any) => q.eq('status', 'RESOLVED'))
    const resolvedDisputesPrevious = await countInRange(admin, 'disputes', 'updated_at', prevStart, prevEnd, (q: any) => q.eq('status', 'RESOLVED'))

    const [{ data: paymentsCurrent }, { data: paymentsPrevious }] = await Promise.all([
      (admin as any).from('payments').select('amount').eq('status', 'PAID').gte('paid_at', start.toISOString()).lt('paid_at', end.toISOString()),
      (admin as any).from('payments').select('amount').eq('status', 'PAID').gte('paid_at', prevStart.toISOString()).lt('paid_at', prevEnd.toISOString()),
    ])
    const revenueCurrent = (paymentsCurrent ?? []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    const revenuePrevious = (paymentsPrevious ?? []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    const periodLabels: Record<Period, string> = {
      week: 'cette semaine',
      month: 'ce mois',
      quarter: 'ce trimestre',
      year: 'cette année',
    }

    const metrics = [
      { key: 'newUsers', title: 'Nouveaux utilisateurs', value: newUsersCurrent, change: computeChange(newUsersCurrent, newUsersPrevious) },
      { key: 'newProperties', title: 'Nouveaux biens publiés', value: newPropertiesCurrent, change: computeChange(newPropertiesCurrent, newPropertiesPrevious) },
      { key: 'signedLeases', title: 'Baux signés', value: signedLeasesCurrent, change: computeChange(signedLeasesCurrent, signedLeasesPrevious) },
      { key: 'validatedFiles', title: 'Dossiers validés (TC)', value: validatedFilesCurrent, change: computeChange(validatedFilesCurrent, validatedFilesPrevious) },
      { key: 'resolvedDisputes', title: 'Litiges résolus', value: resolvedDisputesCurrent, change: computeChange(resolvedDisputesCurrent, resolvedDisputesPrevious) },
      { key: 'revenue', title: 'Revenus totaux', value: `${revenueCurrent.toLocaleString('fr-FR')} FCFA`, change: computeChange(revenueCurrent, revenuePrevious) },
    ].map((m) => ({ ...m, period: periodLabels[period] }))

    const resp = NextResponse.json({ period, metrics, generatedAt: now.toISOString() })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin reports error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
