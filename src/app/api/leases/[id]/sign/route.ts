import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'
import { notify, notifyLeaseActivated } from '@/lib/notify'

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

export async function POST(
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
    const body = await req.json()
    const { otpCode, signatureImage } = body

    if (!otpCode) {
      const resp = NextResponse.json({ error: 'Code OTP requis' }, { status: 400 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (lease.tenant_id !== userId && lease.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.status !== 'PENDING_SIGNATURE') {
      const resp = NextResponse.json(
        { error: 'Ce bail ne peut pas être signé (statut: ' + lease.status + ')' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const { data: otpRecord } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'BAIL_SIGNATURE')
      .eq('code', otpCode)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otpRecord) {
      const resp = NextResponse.json(
        { error: 'Code OTP invalide ou expiré' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id)

    const now = new Date()
    const signOtp = crypto.randomBytes(16).toString('hex')

    let updatedLease: any
    const isOwner = lease.owner_id === userId

    const { data: property } = await supabase
      .from('properties')
      .select('id, title, address, city')
      .eq('id', lease.property_id)
      .maybeSingle()

    const userIds = [lease.owner_id, lease.tenant_id].filter(Boolean)
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, avatar_url')
      .in('id', userIds)
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))
    const owner = userMap.get(lease.owner_id)
    const tenant = userMap.get(lease.tenant_id)

    if (isOwner) {
      if (lease.owner_signed_at) {
        const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
        return applyCookies(resp)
      }

      const updateData: Record<string, unknown> = {
        owner_signed_at: now.toISOString(),
        owner_sign_otp: signOtp,
        owner_signature_image: signatureImage || null,
        updated_at: now.toISOString(),
      }
      if (lease.tenant_signed_at) {
        updateData.status = 'ACTIVE'
      }

      const { data: updated } = await supabase
          .from('leases')
          .update(updateData as any)
          .eq('id', id)
          .select()
          .single()
        updatedLease = updated

        await notify({
          userId: lease.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: lease.tenant_signed_at ? 'Bail signé et activé' : 'Le propriétaire a signé le bail',
        message: lease.tenant_signed_at
          ? `Le bail pour "${property?.title || ''}" est maintenant actif. Les deux parties ont signé.`
          : `${owner?.first_name || ''} ${owner?.last_name || ''} a signé le bail pour "${property?.title || ''}". Votre signature est attendue.`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })

      if (lease.tenant_signed_at) {
        await notifyLeaseActivated(lease.tenant_id, lease.owner_id, property?.title || '', lease.id)
      }
    } else {
      if (lease.tenant_signed_at) {
        const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
        return applyCookies(resp)
      }

      const updateData: Record<string, unknown> = {
        tenant_signed_at: now.toISOString(),
        tenant_sign_otp: signOtp,
        tenant_signature_image: signatureImage || null,
        updated_at: now.toISOString(),
      }
      if (lease.owner_signed_at) {
        updateData.status = 'ACTIVE'
      }

      const { data: updated } = await supabase
          .from('leases')
          .update(updateData as any)
          .eq('id', id)
          .select()
          .single()
        updatedLease = updated

        await notify({
          userId: lease.owner_id,
        type: 'DOSSIER_UPDATE',
        title: lease.owner_signed_at ? 'Bail signé et activé' : 'Le locataire a signé le bail',
        message: lease.owner_signed_at
          ? `Le bail pour "${property?.title || ''}" est maintenant actif. Les deux parties ont signé.`
          : `${tenant?.first_name || ''} ${tenant?.last_name || ''} a signé le bail pour "${property?.title || ''}".`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })

      if (lease.owner_signed_at) {
        await notifyLeaseActivated(lease.tenant_id, lease.owner_id, property?.title || '', lease.id)
      }
    }

    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: isOwner ? 'LEASE_OWNER_SIGNED' : 'LEASE_TENANT_SIGNED',
      entity: 'Lease',
      entity_id: id,
      details: JSON.stringify({
        signedBy: userId,
        role: isOwner ? 'OWNER' : 'TENANT',
        propertyTitle: property?.title || '',
        bothSigned: !!(updatedLease?.tenant_signed_at && updatedLease?.owner_signed_at),
        newStatus: updatedLease?.status,
      }),
      user_id: userId,
    })

    let propImages: any[] = []
    if (lease.property_id) {
      const { data: imgs } = await supabase
        .from('property_images')
        .select('url')
        .eq('property_id', lease.property_id)
        .order('order', { ascending: true })
        .limit(1)
      propImages = imgs ?? []
    }

    const result = {
      ...mapLease(updatedLease),
      property: property ? {
        id: property.id,
        title: property.title,
        address: property.address,
        city: property.city,
        images: propImages.map((img: any) => ({ url: img.url })),
      } : undefined,
      owner: owner ? {
        id: owner.id,
        firstName: owner.first_name,
        lastName: owner.last_name,
        avatarUrl: owner.avatar_url,
      } : undefined,
      tenant: tenant ? {
        id: tenant.id,
        firstName: tenant.first_name,
        lastName: tenant.last_name,
        avatarUrl: tenant.avatar_url,
      } : undefined,
    }

    const resp = NextResponse.json({ data: result })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease sign error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
