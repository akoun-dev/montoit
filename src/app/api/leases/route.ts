import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

function mapLease(lease: Record<string, unknown>) {
  return {
    id: lease.id,
    status: lease.status,
    propertyId: lease.property_id,
    tenantId: lease.tenant_id,
    ownerId: lease.owner_id,
    rentalFileId: lease.rental_file_id,
    monthlyRent: lease.monthly_rent,
    charges: lease.charges,
    deposit: lease.deposit,
    startDate: lease.start_date,
    endDate: lease.end_date,
    specialConditions: lease.special_conditions,
    ownerSignedAt: lease.owner_signed_at,
    tenantSignedAt: lease.tenant_signed_at,
    ownerSignOtp: lease.owner_sign_otp,
    tenantSignOtp: lease.tenant_sign_otp,
    ownerSignatureImage: lease.owner_signature_image,
    tenantSignatureImage: lease.tenant_signature_image,
    createdAt: lease.created_at,
    updatedAt: lease.updated_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()
    const effectiveRole = user?.active_role || user?.role

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    let query = supabase.from('leases').select('*')
    if (effectiveRole === 'LOCATAIRE') {
      query = query.eq('tenant_id', userId)
    } else if (effectiveRole === 'PROPRIETAIRE') {
      query = query.eq('owner_id', userId)
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }
    query = query.order('created_at', { ascending: false })

    const { data: leases, error } = await query
    if (error) throw error

    const leaseList = leases ?? []
    const propertyIds = [...new Set(leaseList.map((l: any) => l.property_id).filter(Boolean))]
    const userIds = [...new Set([...leaseList.map((l: any) => l.tenant_id), ...leaseList.map((l: any) => l.owner_id)].filter(Boolean))]
    const leaseIds = leaseList.map((l: any) => l.id).filter(Boolean)

    const [propRes, usersRes, payRes, imgRes] = await Promise.all([
      propertyIds.length > 0
        ? supabase.from('properties').select('id, title, address, city').in('id', propertyIds)
        : { data: [] },
      userIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', userIds)
        : { data: [] },
      leaseIds.length > 0
        ? supabase.from('payments').select('id, amount, status, due_date, lease_id').in('lease_id', leaseIds).order('due_date', { ascending: true })
        : { data: [] },
      propertyIds.length > 0
        ? supabase.from('property_images').select('*').in('property_id', propertyIds).order('order', { ascending: true })
        : { data: [] },
    ])

    const propertyMap = new Map((propRes.data ?? []).map((p: any) => [p.id, p]))
    const userMap = new Map((usersRes.data ?? []).map((u: any) => [u.id, u]))
    const firstImageMap = new Map()
    for (const img of imgRes.data ?? []) {
      if (!firstImageMap.has(img.property_id)) {
        firstImageMap.set(img.property_id, img)
      }
    }
    const paymentsByLease = new Map()
    for (const pmt of payRes.data ?? []) {
      if (!paymentsByLease.has(pmt.lease_id)) paymentsByLease.set(pmt.lease_id, [])
      paymentsByLease.get(pmt.lease_id).push(pmt)
    }

    const result = leaseList.map((lease: any) => {
      const prop = propertyMap.get(lease.property_id)
      const tenant = userMap.get(lease.tenant_id)
      const owner = userMap.get(lease.owner_id)
      const firstImage = firstImageMap.get(lease.property_id)
      const payments = paymentsByLease.get(lease.id) ?? []

      return {
        ...mapLease(lease),
        property: prop ? {
          id: prop.id,
          title: prop.title,
          address: prop.address,
          city: prop.city,
          images: firstImage ? [{ url: firstImage.url }] : [],
        } : undefined,
        tenant: tenant ? { id: tenant.id, firstName: tenant.first_name, lastName: tenant.last_name, avatarUrl: tenant.avatar_url } : undefined,
        owner: owner ? { id: owner.id, firstName: owner.first_name, lastName: owner.last_name, avatarUrl: owner.avatar_url } : undefined,
        payments: payments.map((p: any) => ({ id: p.id, amount: p.amount, status: p.status, dueDate: p.due_date })),
      }
    })

    const resp = NextResponse.json({ data: result })
    return applyCookies(resp)
  } catch (error) {
    console.error('Leases GET error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
