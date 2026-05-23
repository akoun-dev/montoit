import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const { id } = await params
    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = user?.active_role || user?.role

    const { data: mandat } = await admin
      .from('mandats')
      .select('id, contract_url, owner_id, agency_id')
      .eq('id', id)
      .single()

    if (!mandat) {
      return applyCookies(NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 }))
    }

    if (mandat.owner_id !== userId && mandat.agency_id !== userId && effectiveRole !== 'ADMIN') {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    if (!mandat.contract_url) {
      return applyCookies(
        NextResponse.json(
          { error: 'Aucun document de mandat disponible pour ce mandat' },
          { status: 404 }
        )
      )
    }

    // Get signed URL for the file
    const pathMatch = mandat.contract_url.match(/\/object\/public\/[^/]+\/(.+)/)
    const storagePath = pathMatch?.[1]

    if (!storagePath) {
      return applyCookies(
        NextResponse.json({ error: 'Format de document invalide' }, { status: 400 })
      )
    }

    let pdfUrl = mandat.contract_url
    try {
      const { data: signedData } = await admin
        .storage
        .from('mandat-documents')
        .createSignedUrl(storagePath, 300)
      if (signedData?.signedUrl) pdfUrl = signedData.signedUrl
    } catch (err) {
      console.error('Error creating signed URL:', err)
    }

    // Try to fetch and return the PDF
    try {
      const res = await fetch(pdfUrl)
      if (!res.ok) {
        console.error(`Failed to download mandat PDF from ${pdfUrl} (status: ${res.status})`)
        return applyCookies(
          NextResponse.json({ error: 'Impossible de télécharger le document' }, { status: 500 })
        )
      }

      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Determine content type
      const contentType = pdfUrl.includes('.pdf') ? 'application/pdf' : 'text/html'
      const extension = pdfUrl.includes('.pdf') ? 'pdf' : 'html'

      return applyCookies(
        new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="mandat_${id.slice(0, 8)}.${extension}"`,
            'Content-Length': buffer.length.toString(),
          },
        })
      )
    } catch (err) {
      console.error('Error downloading mandat PDF:', err)
      return applyCookies(
        NextResponse.json({ error: 'Erreur lors du téléchargement du document' }, { status: 500 })
      )
    }
  } catch (error) {
    console.error('Get mandat PDF error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}