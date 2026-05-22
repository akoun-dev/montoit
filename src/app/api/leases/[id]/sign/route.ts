import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'
import { notify, notifyLeaseActivated } from '@/lib/notify'
import { generateAndUploadLeasePdf } from '@/lib/generate-and-upload-lease-pdf'
import { uploadFromBase64, BUCKETS, getPublicUrl } from '@/lib/supabase/storage'


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
    cryptoneoOperationId: lease.cryptoneo_operation_id,
    createdAt: lease.created_at,
    updatedAt: lease.updated_at,
  }
}

/**
 * Download the current lease PDF from Storage and convert to base64.
 * Returns { buffer, base64, publicUrl } or null if no contract exists.
 */
async function getCurrentPdfInfo(supabase: ReturnType<typeof getSupabaseAdminClient>, leaseId: string, lease: any): Promise<{ buffer: Buffer; base64: string; publicUrl: string } | null> {
  // If no contract_url, generate the initial PDF
  let contractUrl = lease.contract_url
  if (!contractUrl) {
    contractUrl = await generateAndUploadLeasePdf(leaseId, 'initial')
    if (!contractUrl) return null
    // Update contract_url in lease
    await supabase.from('leases').update({ contract_url: contractUrl, updated_at: new Date().toISOString() } as any).eq('id', leaseId)
  }

  // Try signed URL first (private bucket), fallback to public URL
  let pdfUrl = contractUrl
  const pathMatch = contractUrl.match(/\/object\/public\/[^/]+\/(.+)/)
  const storagePath = pathMatch?.[1]
  if (storagePath) {
    try {
      const { data: signedData } = await supabase
        .storage
        .from('lease-documents')
        .createSignedUrl(storagePath, 300)
      if (signedData?.signedUrl) pdfUrl = signedData.signedUrl
    } catch { /* fallback to public URL */ }
  }

  try {
    const res = await fetch(pdfUrl)
    if (!res.ok) {
      console.error(`Failed to download PDF from ${contractUrl} (status: ${res.status})`)
      return null
    }
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    return { buffer, base64, publicUrl: contractUrl }
  } catch (err) {
    console.error('Error downloading PDF:', err)
    return null
  }
}

/**
 * Upload a buffer as a signed PDF to Storage and return the public URL.
 */
async function uploadSignedPdf(buffer: Buffer, leaseId: string, version: string): Promise<string> {
  const base64Data = `data:application/pdf;base64,${buffer.toString('base64')}`
  const storagePath = `${leaseId}/bail_${version}.pdf`
  return uploadFromBase64(BUCKETS.LEASE_DOCUMENTS, base64Data, storagePath)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const body = await req.json()
    const { otpCode, signatureImage } = body

    console.log('[sign/route] Step 1: starting sign process', { leaseId: id, userId })

    const supabase = getSupabaseAdminClient()

    console.log('[sign/route] Step 2: fetching lease', { id })
    const { data: _lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!_lease) {
      console.error('[sign/route] Lease not found', { id })
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    const lease = _lease as any
    console.log('[sign/route] Step 3: lease found', { status: lease.status, ownerId: lease.owner_id, tenantId: lease.tenant_id })

    if (lease.tenant_id !== userId && lease.owner_id !== userId) {
      console.error('[sign/route] Access denied', { userId, ownerId: lease.owner_id, tenantId: lease.tenant_id })
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.status !== 'PENDING_SIGNATURE') {
      console.error('[sign/route] Wrong status', { status: lease.status })
      const resp = NextResponse.json(
        { error: 'Ce bail ne peut pas être signé (statut: ' + lease.status + ')' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const isOwner = lease.owner_id === userId
    const alreadySigned = isOwner ? !!lease.owner_signed_at : !!lease.tenant_signed_at
    if (alreadySigned) {
      console.error('[sign/route] Already signed', { isOwner, ownerSignedAt: lease.owner_signed_at, tenantSignedAt: lease.tenant_signed_at })
      const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
      return applyCookies(resp)
    }
    console.log('[sign/route] Step 4: user authorized', { isOwner })

    // Seul le propriétaire valide via CRYPTONEO
    let operationId: string | undefined
    let newContractUrl: string | null = null

    const { data: property } = await supabase
      .from('properties')
      .select('id, title, address, city')
      .eq('id', lease.property_id)
      .maybeSingle()

    if (isOwner) {
      console.log('[sign/route] Step 5: owner signing', { hasOtp: !!otpCode, hasSignature: !!signatureImage })
      if (!otpCode) {
        const resp = NextResponse.json({ error: 'Code OTP requis' }, { status: 400 })
        return applyCookies(resp)
      }

      // ── Obtenir le PDF à signer ──
      console.log('[sign/route] Step 6: generating PDF')
      const pdfInfo = await getCurrentPdfInfo(supabase, id, lease)
      console.log('[sign/route] Step 7: PDF result', { hasPdfInfo: !!pdfInfo, publicUrl: pdfInfo?.publicUrl?.substring(0, 80) })
      if (!pdfInfo) {
        console.error('[sign/route] PDF generation failed')
        const resp = NextResponse.json(
          { error: 'Impossible de générer le document à signer. Veuillez réessayer.' },
          { status: 500 }
        )
        return applyCookies(resp)
      }

      // ── Récupérer les infos du signataire (propriétaire) ──
      console.log('[sign/route] Step 8: fetching owner info')
      const { data: ownerInfo } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', userId)
        .single()
      console.log('[sign/route] Step 9: owner info', { hasOwnerInfo: !!ownerInfo, email: ownerInfo?.email })

      // ── Appeler CRYPTONEO signFileBatch via la Edge Function ──
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign`
      const bearerToken = accessToken || process.env.SUPABASE_SERVICE_ROLE_KEY

      // CRYPTONEO a besoin d'une URL HTTP publique accessible depuis ses serveurs.
      // En développement local, il faut exposer Supabase via un tunnel (ngrok).
      // Voir Postman : https://ric-ci.ci/signatureelectronique/fichier_pdf_vingt_mega.pdf
      console.log('[sign/route] PDF info:', {
        publicUrl: pdfInfo.publicUrl?.substring(0, 80) + '...',
        base64Len: pdfInfo.base64.length,
      })

      const signRequest = [{
        fileName: `bail_${id}_owner.pdf`,
        base64: pdfInfo.base64,
        urlDoc: pdfInfo.publicUrl,
        signataireNom: ownerInfo?.last_name || '',
        signatairePrenom: ownerInfo?.first_name || '',
        signataireEmail: ownerInfo?.email || '',
        signatairePhone: ownerInfo?.phone || '',
        visibleSignature: true,
      }]

      // URL de callback pour que CRYPTONEO notifie après la signature
      const callBackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-verify`

      const signPayload = {
        otp: otpCode,
        signRequest,
        callBackUrl,
      }
      console.log('[sign/route] Calling Edge Function sign with payload:', {
        hasOtp: !!otpCode,
        signRequestCount: signRequest.length,
        callBackUrl,
      })

      console.log('[sign/route] Step 10: edge function URL resolution', {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        functionUrl,
        callBackUrl,
        hasBearerToken: !!bearerToken,
      })
      let signRes: Response
      try {
        signRes = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            ...(accessToken ? {} : { 'x-user-id': userId }),
          },
          body: JSON.stringify(signPayload),
        })
        console.log('[sign/route] Step 11: edge function responded', { status: signRes.status })
      } catch (fetchErr) {
        console.error('[sign/route] Edge function fetch failed:', fetchErr)
        const resp = NextResponse.json({ error: 'Impossible de contacter le service de signature CRYPTONEO' }, { status: 500 })
        return applyCookies(resp)
      }

      let signResult: any
      try {
        signResult = await signRes.json()
      } catch (jsonErr) {
        console.error('[sign/route] Edge function response not JSON:', jsonErr, { text: await signRes.text().catch(() => '') })
        const resp = NextResponse.json({ error: 'Réponse invalide du service de signature' }, { status: 500 })
        return applyCookies(resp)
      }

      console.log('[sign/route] Edge Function sign response full:', JSON.stringify(signResult).substring(0, 2000))
      console.log('[sign/route] Edge Function sign parsed:', {
        ok: signRes.ok,
        status: signRes.status,
        operationId: signResult?.operationId || signResult?.data?.operationId,
        error: signResult?.error,
        statusMessage: signResult?.statusMessage,
        cryptoneoStatusCode: signResult?.cryptoneoRaw?.statusCode,
        cryptoneoStatusMessage: signResult?.cryptoneoRaw?.statusMessage,
      })

      if (!signRes.ok) {
        const errorMsg = signResult?.error || signResult?.statusMessage || 'Erreur CRYPTONEO lors de la signature'
        console.error('[sign/route] Sign failed:', errorMsg)
        const resp = NextResponse.json({ error: errorMsg }, { status: 400 })
        return applyCookies(resp)
      }

      operationId = signResult?.operationId || signResult?.data?.operationId
      const signedFileName = signResult?.signedFileName || signResult?.data?.signedFileName

      if (!operationId) {
        const resp = NextResponse.json({ error: 'CRYPTONEO n\'a pas retourné d\'operationId' }, { status: 500 })
        return applyCookies(resp)
      }

      // ── Récupérer le PDF signé depuis CRYPTONEO ──
      let signedPdfBuffer: Buffer | null = null
      if (signedFileName) {
        try {
          const signedFileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/signed-file/${encodeURIComponent(signedFileName)}`
          const fileRes = await fetch(signedFileUrl, {
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              ...(accessToken ? {} : { 'x-user-id': userId }),
            },
          })

          if (fileRes.ok) {
            const arrayBuffer = await fileRes.arrayBuffer()
            signedPdfBuffer = Buffer.from(arrayBuffer)
          }
        } catch (err) {
          console.warn('Could not retrieve signed PDF from CRYPTONEO:', err)
        }
      }

      // ── Uploader le PDF signé dans Storage ──
      if (signedPdfBuffer) {
        newContractUrl = await uploadSignedPdf(signedPdfBuffer, id, 'owner_signed_cryptoneo')
      } else {
        newContractUrl = await generateAndUploadLeasePdf(id, 'owner_signed')
      }
    } else {
      // Locataire : signature simple sans CRYPTONEO
      newContractUrl = await generateAndUploadLeasePdf(id, 'tenant_signed')
    }

    // ── Mettre à jour le bail ──
    const now = new Date()
    const signOtp = crypto.randomBytes(16).toString('hex')

    let updatedLease: any

    if (isOwner) {
      const updateData: Record<string, unknown> = {
        owner_signed_at: now.toISOString(),
        owner_sign_otp: signOtp,
        owner_signature_image: signatureImage || null,
        cryptoneo_operation_id: operationId,
        updated_at: now.toISOString(),
      }
      if (newContractUrl) updateData.contract_url = newContractUrl
      if (lease.tenant_signed_at) {
        updateData.status = 'ACTIVE'
      }

      const { data: updated } = await supabase
        .from('leases')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single()
      updatedLease = updated as any

      // Si les deux ont signé, générer la version finale
      if (lease.tenant_signed_at) {
        generateAndUploadLeasePdf(id, 'final').then((url) => {
          if (url) {
            (supabase.from('leases').update({ contract_url: url, updated_at: new Date().toISOString() } as any).eq('id', id) as any).then()
          }
        }).catch((err) => console.error('Final PDF generation failed:', err))
      }

      // Notifier le locataire
      await notify({
        userId: lease.tenant_id,
        type: 'DOSSIER_UPDATE',
        title: lease.tenant_signed_at ? 'Bail signé et activé' : 'Le propriétaire a signé le bail',
        message: lease.tenant_signed_at
          ? `Le bail pour "${property?.title || ''}" est maintenant actif. Les deux parties ont signé via CRYPTONEO.`
          : `${/* owner name */ ''} a signé le bail pour "${property?.title || ''}" via CRYPTONEO. Votre signature est attendue.`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })

      if (lease.tenant_signed_at) {
        await notifyLeaseActivated(lease.tenant_id, lease.owner_id, property?.title || '', lease.id)
      }
    } else {
      const updateData: Record<string, unknown> = {
        tenant_signed_at: now.toISOString(),
        tenant_sign_otp: signOtp,
        tenant_signature_image: signatureImage || null,
        updated_at: now.toISOString(),
      }
      if (operationId) updateData.cryptoneo_operation_id = operationId
      if (newContractUrl) updateData.contract_url = newContractUrl
      if (lease.owner_signed_at) {
        updateData.status = 'ACTIVE'
      }

      const { data: updated } = await supabase
        .from('leases')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single()
      updatedLease = updated as any

      // Si les deux ont signé, générer la version finale
      if (lease.owner_signed_at) {
        generateAndUploadLeasePdf(id, 'final').then((url) => {
          if (url) {
            (supabase.from('leases').update({ contract_url: url, updated_at: new Date().toISOString() } as any).eq('id', id) as any).then()
          }
        }).catch((err) => console.error('Final PDF generation failed:', err))
      }

      // Notifier le propriétaire
      await notify({
        userId: lease.owner_id,
        type: 'DOSSIER_UPDATE',
        title: lease.owner_signed_at ? 'Bail signé et activé' : 'Le locataire a signé le bail',
        message: lease.owner_signed_at
          ? `Le bail pour "${property?.title || ''}" est maintenant actif. Les deux parties ont signé via CRYPTONEO.`
          : `Le locataire a signé le bail pour "${property?.title || ''}".`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })

      if (lease.owner_signed_at) {
        await notifyLeaseActivated(lease.tenant_id, lease.owner_id, property?.title || '', lease.id)
      }
    }

    // ── Audit log ──
    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: isOwner ? 'LEASE_OWNER_SIGNED' : 'LEASE_TENANT_SIGNED',
      entity: 'Lease',
      entity_id: id,
      details: JSON.stringify({
        signedBy: userId,
        role: isOwner ? 'OWNER' : 'TENANT',
        cryptoneoOperationId: operationId,
        propertyTitle: property?.title || '',
        bothSigned: !!(updatedLease?.tenant_signed_at && updatedLease?.owner_signed_at),
        newStatus: updatedLease?.status,
      }),
      user_id: userId,
    })

    // ── Build response ──
    const userIds = [lease.owner_id, lease.tenant_id].filter(Boolean)
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, avatar_url')
      .in('id', userIds)
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))
    const owner = userMap.get(lease.owner_id)
    const tenant = userMap.get(lease.tenant_id)

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
    const errMsg = error instanceof Error ? error.message : 'Erreur serveur'
    const errStack = error instanceof Error ? error.stack?.split('\n').slice(0, 4).join('\n') : ''
    console.error('[sign/route] UNCAUGHT ERROR:', errMsg, errStack)
    console.error('[sign/route] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    const resp = NextResponse.json({ error: errMsg }, { status: 500 })
    return resp
  }
}
