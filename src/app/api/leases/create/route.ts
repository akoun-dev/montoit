import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'
import { notify } from '@/lib/notify'
import { validateNonNegativeNumber } from '@/lib/validators'
import { generateAndUploadLeasePdf } from '@/lib/generate-and-upload-lease-pdf'

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
    contractUrl: lease.contract_url,
    createdAt: lease.created_at,
    updatedAt: lease.updated_at,
  }
}

export async function POST(req: NextRequest) {
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

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const {
      rentalFileId,
      propertyId,
      tenantId,
      monthlyRent,
      charges,
      deposit,
      startDate,
      endDate,
      specialConditions,
    } = body

    if (!rentalFileId || !propertyId || !tenantId || !monthlyRent || !startDate || !endDate) {
      const resp = NextResponse.json(
        { error: 'Champs requis manquants: rentalFileId, propertyId, tenantId, monthlyRent, startDate, endDate' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const { data: property } = await supabase
      .from('properties')
      .select('id, title, owner_id')
      .eq('id', propertyId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (!property) {
      const resp = NextResponse.json(
        { error: 'Vous n\'êtes pas propriétaire de ce bien ou le bien n\'existe pas' },
        { status: 403 }
      )
      return applyCookies(resp)
    }

    const { data: rentalFile } = await supabase
      .from('rental_files')
      .select('id, tenant_id, status')
      .eq('id', rentalFileId)
      .eq('status', 'VALIDATED')
      .maybeSingle()

    if (!rentalFile) {
      const resp = NextResponse.json(
        { error: 'Le dossier locatif n\'est pas validé ou n\'existe pas' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    if (rentalFile.tenant_id !== tenantId) {
      const resp = NextResponse.json(
        { error: 'Le dossier locatif ne correspond pas au locataire sélectionné' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const { data: existingLease } = await supabase
      .from('leases')
      .select('id')
      .eq('property_id', propertyId)
      .eq('tenant_id', tenantId)
      .in('status', ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE'])
      .maybeSingle()

    if (existingLease) {
      const resp = NextResponse.json(
        { error: 'Un bail actif ou en attente existe déjà pour ce locataire et ce bien' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    // OTP is now sent via CRYPTONEO email — not generated locally

    const leaseId = generateId()
    for (const [value, label] of [[monthlyRent, 'Le loyer'], [charges, 'Les charges'], [deposit, 'Le dépôt']] as const) {
      const result = validateNonNegativeNumber(value || '', label)
      if (!result.valid || (value && !Number.isFinite(Number(String(value).replace(',', '.'))))) {
        return applyCookies(NextResponse.json({ error: result.error || `${label} doit être un nombre valide.` }, { status: 400 }))
      }
    }

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert({
        id: leaseId,
        status: 'PENDING_SIGNATURE',
        property_id: propertyId,
        tenant_id: tenantId,
        owner_id: userId,
        rental_file_id: rentalFileId,
        monthly_rent: parseFloat(monthlyRent),
        charges: charges ? parseFloat(charges) : 0,
        deposit: deposit ? parseFloat(deposit) : 0,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        special_conditions: specialConditions || null,
      })
      .select()
      .single()

    if (leaseError) throw leaseError

    // ── Generate PDF + upload to Storage (async, non-bloquant) ──
    generateAndUploadLeasePdf((lease as any).id, 'initial').then((url) => {
      if (url) {
        (supabase.from('leases').update({ contract_url: url, updated_at: new Date().toISOString() } as any).eq('id', (lease as any).id) as any).then()
      }
    }).catch((err) => console.error('PDF generation failed:', err))

    await notify({
      userId: tenantId,
      type: 'LEASE_UPDATE',
      title: 'Nouveau bail en attente de signature',
      message: `Un nouveau bail pour "${property.title}" a été créé. Veuillez le consulter pour le signer.`,
      actionUrl: 'my-leases',
      entityId: lease.id,
    })

    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: 'LEASE_CREATED',
      entity: 'Lease',
      entity_id: lease.id,
      details: JSON.stringify({
        propertyId,
        tenantId,
        ownerId: userId,
        monthlyRent: parseFloat(monthlyRent),
        propertyTitle: property.title,
      }),
      user_id: userId,
    })

    // Fetch related data for response
    const { data: propData } = await supabase
      .from('properties')
      .select('id, title, address, city')
      .eq('id', propertyId)
      .single()

    let propImages: any[] = []
    if (propertyId) {
      const { data: imgs } = await supabase
        .from('property_images')
        .select('url')
        .eq('property_id', propertyId)
        .order('order', { ascending: true })
        .limit(1)
      propImages = imgs ?? []
    }

    const userIds = [tenantId, userId].filter(Boolean)
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, email')
      .in('id', userIds)
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    const result = {
      ...mapLease(lease),
      property: propData ? {
        id: propData.id,
        title: propData.title,
        address: propData.address,
        city: propData.city,
        images: propImages.map((img: any) => ({ url: img.url })),
      } : undefined,
      tenant: (() => {
        const t = userMap.get(tenantId)
        return t ? { id: t.id, firstName: t.first_name, lastName: t.last_name, avatarUrl: t.avatar_url, email: t.email } : undefined
      })(),
      owner: (() => {
        const o = userMap.get(userId)
        return o ? { id: o.id, firstName: o.first_name, lastName: o.last_name, avatarUrl: o.avatar_url } : undefined
      })(),
    }

    const resp = NextResponse.json({
      data: result,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease create error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
