import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { signStorageUrl } from '@/lib/supabase/storage'

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

    const { data: mandat } = await (admin as any)
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

    // SEC-006 : le bucket mandat-documents est privé (migration
    // 20261027000001) — le contract_url canonique est converti en URL signée
    // (1 h) via le helper centralisé ; les URLs externes (CRYPTONEO) passent
    // telles quelles.
    const pathMatch = mandat.contract_url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)/)
    const storagePath = pathMatch?.[1]

    if (!storagePath) {
      return applyCookies(
        NextResponse.json({ error: 'Format de document invalide' }, { status: 400 })
      )
    }

    let pdfUrl = mandat.contract_url
    try {
      const signedUrl = await signStorageUrl(mandat.contract_url)
      if (signedUrl) pdfUrl = signedUrl
    } catch (err) {
      console.error('Error creating signed URL:', err)
    }

    // Try to fetch and return the PDF
    try {
      const res = await fetch(pdfUrl)
      if (!res.ok) {
        // Pas d'URL dans le log : une URL signée embarque un token d'accès.
        console.error(`Failed to download mandat PDF (mandat ${id}, status: ${res.status})`)
        return applyCookies(
          NextResponse.json({ error: 'Impossible de télécharger le document' }, { status: 500 })
        )
      }

      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Determine content type (depuis l'URL canonique, pas l'URL signée)
      const contentType = mandat.contract_url.includes('.pdf') ? 'application/pdf' : 'text/html'
      const extension = mandat.contract_url.includes('.pdf') ? 'pdf' : 'html'

      return applyCookies(
        new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="mandat_${id.slice(0, 8)}.${extension}"`,
            'Content-Length': buffer.length.toString(),
            // SEC-006 : document sensible — aucune mise en cache intermédiaire
            'Cache-Control': 'no-store',
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