import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'
import { generateAndUploadMandatPdf } from '@/lib/generate-and-upload-mandat-pdf'
import { notify } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function getCurrentMandatPdfInfo(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  mandatId: string,
  mandat: any
): Promise<{ buffer: Buffer; base64: string; publicUrl: string } | null> {
  let contractUrl = mandat.contract_url
  if (!contractUrl) {
    contractUrl = await generateAndUploadMandatPdf(mandatId, 'initial')
    if (!contractUrl) return null
    await supabase.from('mandats').update({ contract_url: contractUrl }).eq('id', mandatId)
  }

  let pdfUrl = contractUrl
  const pathMatch = contractUrl.match(/\/object\/public\/[^/]+\/(.+)/)
  const storagePath = pathMatch?.[1]
  if (storagePath) {
    try {
      const { data: signedData } = await supabase
        .storage
        .from('mandat-documents')
        .createSignedUrl(storagePath, 300)
      if (signedData?.signedUrl) pdfUrl = signedData.signedUrl
    } catch { }
  }

  try {
    const res = await fetch(pdfUrl)
    if (!res.ok) {
      console.error(`Failed to download mandat PDF from ${contractUrl} (status: ${res.status})`)
      return null
    }
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    return { buffer, base64, publicUrl: contractUrl }
  } catch (err) {
    console.error('Error downloading mandat PDF:', err)
    return null
  }
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

    const supabase = getSupabaseAdminClient()

    const { data: _mandat } = await (supabase as any)
      .from('mandats')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!_mandat) {
      const resp = NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    const mandat = _mandat as any

    if (mandat.owner_id !== userId && mandat.agency_id !== userId) {
      const resp = NextResponse.json({ error: 'Vous n\'êtes pas partie à ce mandat' }, { status: 403 })
      return applyCookies(resp)
    }

    if (mandat.status !== 'DRAFT' && mandat.status !== 'PENDING_SIGNATURE') {
      const resp = NextResponse.json(
        { error: 'Ce mandat ne peut plus être signé' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const isOwner = mandat.owner_id === userId
    const alreadySigned = isOwner ? !!mandat.owner_signed_at : !!mandat.agency_signed_at
    if (alreadySigned) {
      const resp = NextResponse.json({ error: 'Vous avez déjà signé ce mandat' }, { status: 400 })
      return applyCookies(resp)
    }

    const { data: property } = await (supabase as any)
      .from('properties')
      .select('id, title')
      .eq('id', mandat.property_id)
      .maybeSingle()

    let operationId: string | undefined
    let newContractUrl: string | null = null

    if (isOwner) {
      if (!otpCode) {
        const resp = NextResponse.json({ error: 'Code OTP requis' }, { status: 400 })
        return applyCookies(resp)
      }

      const pdfInfo = await getCurrentMandatPdfInfo(supabase, id, mandat)
      if (!pdfInfo) {
        const resp = NextResponse.json(
          { error: 'Impossible de générer le document à signer' },
          { status: 500 }
        )
        return applyCookies(resp)
      }

      const { data: ownerInfo } = await ((supabase as any)
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', userId)
        .single() as Promise<{ data: any; error: any }>)

      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign`
      const bearerToken = accessToken || process.env.SUPABASE_SERVICE_ROLE_KEY

      const documentHash = crypto.createHash('sha256').update(pdfInfo.buffer).digest('hex')

      const signRequest = [{
        fileName: `mandat_${id}_owner.pdf`,
        base64: pdfInfo.base64,
        urlDoc: pdfInfo.publicUrl,
        hashDoc: documentHash,
        signataireNom: ownerInfo?.last_name || '',
        signatairePrenom: ownerInfo?.first_name || '',
        signataireEmail: ownerInfo?.email || '',
        signatairePhone: ownerInfo?.phone || '',
        visibleSignature: true,
      }]

      const callBackUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-verify`

      let signRes: Response
      try {
        signRes = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            ...(accessToken ? {} : { 'x-user-id': userId }),
          },
          body: JSON.stringify({
            otp: otpCode,
            signRequest,
            callBackUrl,
          }),
        })
      } catch {
        const resp = NextResponse.json({ error: 'Impossible de contacter le service de signature' }, { status: 500 })
        return applyCookies(resp)
      }

      let signResult: any
      try {
        signResult = await signRes.json()
      } catch {
        const resp = NextResponse.json({ error: 'Réponse invalide du service de signature' }, { status: 500 })
        return applyCookies(resp)
      }

      if (!signRes.ok) {
        const errorMsg = signResult?.error || signResult?.statusMessage || 'Erreur CRYPTONEO'
        const resp = NextResponse.json({ error: errorMsg }, { status: 400 })
        return applyCookies(resp)
      }

      operationId = signResult?.operationId || signResult?.data?.operationId
      const edgeContractUrl = signResult?.contractUrl

      if (!operationId) {
        const resp = NextResponse.json({ error: 'Erreur de signature CRYPTONEO' }, { status: 500 })
        return applyCookies(resp)
      }

      newContractUrl = edgeContractUrl || await generateAndUploadMandatPdf(id, 'owner_signed')
    } else {
      newContractUrl = await generateAndUploadMandatPdf(id, 'agency_signed')
    }

    const now = new Date()
    const s = isOwner ? 'owner' : 'agency'
    const updateData: Record<string, any> = {
      [`${s}_signed_at`]: now.toISOString(),
      [`${s}_signature_image`]: signatureImage || null,
      updated_at: now.toISOString(),
    }
    if (operationId) updateData.cryptoneo_operation_id = operationId
    if (newContractUrl) updateData.contract_url = newContractUrl

    const otherSigned = isOwner ? !!mandat.agency_signed_at : !!mandat.owner_signed_at
    if (otherSigned) {
      updateData.status = 'ACTIVE'
    } else if (mandat.status === 'DRAFT') {
      updateData.status = 'PENDING_SIGNATURE'
    }

    const { data: updatedRow } = await (supabase as any)
      .from('mandats')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const updatedMandat = updatedRow as any

    const otherPartyId = isOwner ? mandat.agency_id : mandat.owner_id
    const otherPartyLabel = isOwner ? 'L\'agence' : 'Le propriétaire'

    if (otherSigned) {
      await generateAndUploadMandatPdf(id, 'final').then((url) => {
        if (url) {
          supabase.from('mandats').update({ contract_url: url, updated_at: new Date().toISOString() }).eq('id', id).then()
        }
      })
    }

    await notify({
      userId: otherPartyId,
      type: 'LEASE_UPDATE',
      title: otherSigned ? 'Mandat activé' : `Mandat signé par ${isOwner ? 'le propriétaire' : 'l\'agence'}`,
      message: otherSigned
        ? `Le mandat pour "${property?.title || ''}" est maintenant actif. Les deux parties ont signé.`
        : `${otherPartyLabel} a signé le mandat pour "${property?.title || ''}". En attente de votre signature.`,
      actionUrl: 'mandats',
      entityId: id,
    })

    // Si les deux parties ont signé, activer le bien s'il n'est pas déjà actif
    if (otherSigned) {
      const { data: propertyWithStatus } = await (supabase as any)
        .from('properties')
        .select('status')
        .eq('id', mandat.property_id)
        .maybeSingle()

      // Activer le bien s'il est en PENDING_VERIFICATION ou DRAFT
      const shouldActivate = propertyWithStatus?.status === 'PENDING_VERIFICATION' || propertyWithStatus?.status === 'DRAFT'
      if (shouldActivate) {
        const { error: updateErr } = await supabase
          .from('properties')
          .update({ status: 'ACTIVE', is_verified: true })
          .eq('id', mandat.property_id)
        if (!updateErr) {
          console.log('[sign/route] Activated property after mandat signed:', mandat.property_id)
        } else {
          console.error('[sign/route] Failed to activate property:', updateErr)
        }
      }
    }

    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: isOwner ? 'MANDAT_OWNER_SIGNED' : 'MANDAT_AGENCY_SIGNED',
      entity: 'Mandat',
      entity_id: id,
      details: JSON.stringify({
        signedBy: userId,
        role: isOwner ? 'OWNER' : 'AGENCY',
        cryptoneoOperationId: operationId,
        propertyTitle: property?.title || '',
        bothSigned: otherSigned,
        newStatus: updatedMandat?.status,
      }),
      user_id: userId,
    })

    const userIds = [mandat.owner_id, mandat.agency_id].filter(Boolean)
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, avatar_url')
      .in('id', userIds)
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))
    const owner = userMap.get(mandat.owner_id)
    const agency = userMap.get(mandat.agency_id)

    const result = {
      id: updatedMandat.id,
      propertyId: updatedMandat.property_id,
      ownerId: updatedMandat.owner_id,
      agencyId: updatedMandat.agency_id,
      type: updatedMandat.type,
      status: updatedMandat.status,
      commissionRate: updatedMandat.commission_rate,
      commissionType: updatedMandat.commission_type,
      fixedCommission: updatedMandat.fixed_commission,
      startDate: updatedMandat.start_date,
      endDate: updatedMandat.end_date,
      conditions: updatedMandat.conditions,
      ownerSignedAt: updatedMandat.owner_signed_at,
      agencySignedAt: updatedMandat.agency_signed_at,
      ownerSignatureImage: updatedMandat.owner_signature_image,
      agencySignatureImage: updatedMandat.agency_signature_image,
      contractUrl: updatedMandat.contract_url,
      cryptoneoOperationId: updatedMandat.cryptoneo_operation_id,
      terminatedAt: updatedMandat.terminated_at,
      terminationReason: updatedMandat.termination_reason,
      createdAt: updatedMandat.created_at,
      updatedAt: updatedMandat.updated_at,
      property: property ? { id: property.id, title: property.title } : undefined,
      owner: owner ? { id: owner.id, firstName: owner.first_name, lastName: owner.last_name, avatarUrl: owner.avatar_url } : undefined,
      agency: agency ? { id: agency.id, firstName: agency.first_name, lastName: agency.last_name, avatarUrl: agency.avatar_url } : undefined,
    }

    const resp = NextResponse.json({ data: result })
    return applyCookies(resp)
  } catch (error) {
    console.error('Sign mandat error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
