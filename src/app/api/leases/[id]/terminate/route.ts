import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (leaseError) throw leaseError
    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (lease.tenant_id !== userId && lease.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.status !== 'ACTIVE') {
      const resp = NextResponse.json(
        { error: 'Seul un bail actif peut être résilié' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const { data: updatedLease, error: updateError } = await supabase
      .from('leases')
      .update({
        status: 'TERMINATED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const { data: property } = await supabase
      .from('properties')
      .select('id, title, address, city')
      .eq('id', lease.property_id)
      .maybeSingle()

    let propertyImages: any[] = []
    if (lease.property_id) {
      const { data: imgs } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', lease.property_id)
        .order('order', { ascending: true })
        .limit(1)
      propertyImages = imgs ?? []
    }

    const ownerIds = [lease.tenant_id, lease.owner_id].filter(Boolean)
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', ownerIds)
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: 'LEASE_TERMINATED',
      entity: 'Lease',
      entity_id: id,
      details: JSON.stringify({
        terminatedBy: userId,
        role: lease.tenant_id === userId ? 'TENANT' : 'OWNER',
        propertyTitle: property?.title || '',
      }),
      user_id: userId,
    })

    const terminatedBy = lease.tenant_id === userId ? 'le locataire' : 'le propriétaire'
    await Promise.all([
      notify({
        userId: lease.tenant_id,
        type: 'LEASE_UPDATE',
        title: 'Bail résilié',
        message: `Le bail pour "${property?.title || ''}" a été résilié par ${terminatedBy}.`,
        actionUrl: 'my-leases',
        entityId: id,
      }),
      notify({
        userId: lease.owner_id,
        type: 'LEASE_UPDATE',
        title: 'Bail résilié',
        message: `Le bail pour "${property?.title || ''}" a été résilié par ${terminatedBy}.`,
        actionUrl: 'my-leases',
        entityId: id,
      }),
    ])

    const tenant = userMap.get(lease.tenant_id)
    const owner = userMap.get(lease.owner_id)

    const result = {
      ...mapLease(updatedLease),
      property: property ? {
        id: property.id,
        title: property.title,
        address: property.address,
        city: property.city,
        images: propertyImages.map((img: any) => ({ url: img.url })),
      } : undefined,
      owner: owner ? { id: owner.id, firstName: owner.first_name, lastName: owner.last_name, avatarUrl: owner.avatar_url } : undefined,
      tenant: tenant ? { id: tenant.id, firstName: tenant.first_name, lastName: tenant.last_name, avatarUrl: tenant.avatar_url } : undefined,
    }

    const resp = NextResponse.json({ data: result, terminatedAt: new Date().toISOString() })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease terminate error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
