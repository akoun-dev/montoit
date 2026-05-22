import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    acc[camelKey] = snakeToCamel(obj[key])
    return acc
  }, {} as Record<string, any>)
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = user?.active_role

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const statusParam = searchParams.get('status') || undefined
    const leaseIdParam = searchParams.get('leaseId') || undefined
    const methodParam = searchParams.get('method') || undefined

    let leaseIds: string[] | null = null

    if (effectiveRole === 'PROPRIETAIRE') {
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .eq('owner_id', userId)
      leaseIds = (leases || []).map((l: any) => l.id)
    } else if (effectiveRole === 'AGENCE') {
      const { data: mandats } = await supabase
        .from('mandats')
        .select('property_id')
        .eq('agency_id', userId)
        .eq('status', 'ACTIVE')
      const propertyIds = (mandats || []).map((m: any) => m.property_id)
      if (propertyIds.length > 0) {
        const { data: leases } = await supabase
          .from('leases')
          .select('id')
          .in('property_id', propertyIds)
        leaseIds = (leases || []).map((l: any) => l.id)
      } else {
        leaseIds = []
      }
    }

    if (effectiveRole !== 'LOCATAIRE' && leaseIds !== null && leaseIds.length === 0) {
      return applyCookies(NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        stats: {
          totalPaid: 0,
          latePaymentsCount: 0,
          nextPaymentDue: null,
          totalPayments: 0,
          paidCount: 0,
          pendingCount: 0,
          processingCount: 0,
          methodDistribution: {},
        },
      }))
    }

    let dataQuery = supabase.from('payments').select(`
      *,
      lease:lease_id(
        id,
        start_date,
        end_date,
        monthly_rent,
        property:property_id(
          id,
          title,
          address,
          city,
          images:property_images(url, "order")
        ),
        owner:owner_id(
          id,
          first_name,
          last_name
        )
      )
    `)

    if (effectiveRole === 'LOCATAIRE') {
      dataQuery = dataQuery.eq('tenant_id', userId)
    } else if (leaseIds !== null) {
      dataQuery = dataQuery.in('lease_id', leaseIds)
    }

    if (statusParam) dataQuery = dataQuery.eq('status', statusParam)
    if (leaseIdParam) dataQuery = dataQuery.eq('lease_id', leaseIdParam)
    if (methodParam) dataQuery = dataQuery.eq('method', methodParam)

    let countQuery = supabase.from('payments').select('*', { count: 'exact', head: true })
    if (effectiveRole === 'LOCATAIRE') {
      countQuery = countQuery.eq('tenant_id', userId)
    } else if (leaseIds !== null && leaseIds.length > 0) {
      countQuery = countQuery.in('lease_id', leaseIds)
    }
    if (statusParam) countQuery = countQuery.eq('status', statusParam)
    if (leaseIdParam) countQuery = countQuery.eq('lease_id', leaseIdParam)
    if (methodParam) countQuery = countQuery.eq('method', methodParam)

    const { count: total } = await countQuery

    const { data: paymentsData } = await dataQuery
      .order('due_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    let statsQuery = supabase
      .from('payments')
      .select('amount, status, due_date, paid_at, method')

    if (effectiveRole === 'LOCATAIRE') {
      statsQuery = statsQuery.eq('tenant_id', userId)
    } else if (leaseIds !== null && leaseIds.length > 0) {
      statsQuery = statsQuery.in('lease_id', leaseIds)
    }

    const { data: allPayments } = await statsQuery

    const payments = (paymentsData || []).map((p: any) => {
      const mapped = snakeToCamel(p)
      if (mapped.lease?.property?.images) {
        const sorted = [...mapped.lease.property.images].sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0)
        )
        mapped.lease.property.images = sorted.length > 0 ? [sorted[0]] : []
      }
      return mapped
    })

    const allPaymentsCamel = (allPayments || []).map(snakeToCamel)

    const totalPaid = allPaymentsCamel
      .filter((p: any) => p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + p.amount, 0)

    const latePaymentsCount = allPaymentsCamel.filter((p: any) => p.status === 'LATE').length

    const pendingPayments = allPaymentsCamel
      .filter((p: any) => p.status === 'PENDING')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    const nextPaymentDue = pendingPayments.length > 0
      ? { amount: pendingPayments[0].amount, dueDate: pendingPayments[0].dueDate }
      : null

    const methodDistribution: Record<string, number> = {}
    allPaymentsCamel
      .filter((p: any) => p.method)
      .forEach((p: any) => {
        const m = p.method as string
        methodDistribution[m] = (methodDistribution[m] || 0) + 1
      })

    let activeLease: { id: string; monthlyRent: number; property: { title: string }; owner: { firstName: string; lastName: string } } | null = null
    if (effectiveRole === 'LOCATAIRE') {
      const { data: leases } = await supabase
        .from('leases')
        .select('id, monthly_rent, property:property_id(title, price), owner:owner_id(first_name, last_name)')
        .eq('tenant_id', userId)
        .eq('status', 'ACTIVE')
        .limit(1)
      const lease = (leases as any[])?.[0]
      if (lease) {
        activeLease = {
          id: lease.id,
          monthlyRent: lease.monthly_rent || (lease.property as any)?.price || 0,
          property: { title: (lease.property as any)?.title || '' },
          owner: { firstName: (lease.owner as any)?.first_name || '', lastName: (lease.owner as any)?.last_name || '' },
        }
      }
    }

    return applyCookies(NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
      stats: {
        totalPaid,
        latePaymentsCount,
        nextPaymentDue,
        totalPayments: allPaymentsCamel.length,
        paidCount: allPaymentsCamel.filter((p: any) => p.status === 'PAID').length,
        pendingCount: allPaymentsCamel.filter((p: any) => p.status === 'PENDING').length,
        processingCount: allPaymentsCamel.filter((p: any) => p.status === 'PROCESSING').length,
        methodDistribution,
      },
      activeLease,
    }))
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
