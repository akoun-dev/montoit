import { NextRequest, NextResponse } from 'next/server'
import { getUserIdAndRole } from '@/lib/session'
import { getCryptoneoToken, CRYPTONEO_API_URL } from '@/lib/cryptoneo'

/**
 * GET /api/signature/signed-file?fileName=xxx
 * Downloads a signed file from CRYPTONEO /sign/getSignedFile.
 * Proxies the file data back to the client.
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const session = await getUserIdAndRole(req)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Get fileName from query params
    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get('fileName')

    if (!fileName) {
      return NextResponse.json({ error: 'fileName requis' }, { status: 400 })
    }

    // Get token and call CRYPTONEO API
    const token = await getCryptoneoToken()

    const apiUrl = `${CRYPTONEO_API_URL}/sign/getSignedFile?fileName=${encodeURIComponent(fileName)}`

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `CRYPTONEO téléchargement échoué (${res.status}): ${text}` },
        { status: 502 },
      )
    }

    // Determine content type
    const contentType = res.headers.get('content-type') || 'application/pdf'

    // Stream the file data back
    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
