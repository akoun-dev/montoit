import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * KYC Face Recognition API using NeoFace v2
 *
 * Two modes:
 * 1. POST { mode: "upload", docFile: "<base64>" }
 *    → Uploads ID card photo to NeoFace document_capture
 *    → Returns { documentId, selfieUrl }
 *
 * 2. POST { mode: "verify", documentId: "doc-xxx" }
 *    → Polls NeoFace match_verify for the result
 *    → Returns { status, verified, matchingScore }
 *
 * Flow:
 * 1. User uploads photo of their ID card (front side with face photo)
 * 2. Backend calls NeoFace /api/v2/document_capture → gets document_id + selfie URL
 * 3. Frontend opens selfie URL in new tab/iframe → user takes selfie with liveness detection
 * 4. Frontend polls backend with document_id → backend calls NeoFace /api/v2/match_verify
 * 5. When verified → update user.neofaceVerified = true
 */

const NEOFACE_API_BASE = () => process.env.NEOFACE_API_BASE || 'https://neoface.aineo.ai'
const NEOFACE_TOKEN = () => process.env.NEOFACE_BEARER_TOKEN

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Get user from DB
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        neofaceVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (user.neofaceVerified) {
      return NextResponse.json({ error: 'Vous êtes déjà vérifié KYC.' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const mode = body.mode as string | undefined

    if (!mode || (mode !== 'upload' && mode !== 'verify')) {
      return NextResponse.json(
        { error: 'Mode requis : "upload" ou "verify"' },
        { status: 400 }
      )
    }

    const token = NEOFACE_TOKEN()
    if (!token) {
      console.error('NEOFACE_BEARER_TOKEN not configured')
      return NextResponse.json(
        { error: 'Service KYC non configuré. Veuillez contacter l\'administrateur.' },
        { status: 503 }
      )
    }

    // ─── MODE: Upload ID card document ─────────────────────────────────────
    if (mode === 'upload') {
      const docFileBase64 = body.docFile as string | undefined
      if (!docFileBase64) {
        return NextResponse.json(
          { error: 'L\'image du document (recto) est requise.' },
          { status: 400 }
        )
      }

      // Convert base64 to Blob for multipart/form-data
      const buffer = Buffer.from(docFileBase64, 'base64')
      const blob = new Blob([buffer], { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('doc_file', blob, 'document.jpg')

      try {
        const uploadResponse = await fetch(`${NEOFACE_API_BASE()}/api/v2/document_capture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('NeoFace document_capture error:', uploadResponse.status, errorText.substring(0, 500))
          return NextResponse.json(
            { error: 'Erreur lors de l\'envoi du document. Veuillez réessayer.' },
            { status: 502 }
          )
        }

        const uploadData = await uploadResponse.json()

        if (!uploadData.success || !uploadData.document_id) {
          console.error('NeoFace document_capture: unexpected response', uploadData)
          return NextResponse.json(
            { error: 'Réponse inattendue du service KYC. Veuillez réessayer.' },
            { status: 502 }
          )
        }

        // Store document_id in user record for later verification
        await db.user.update({
          where: { id: userId },
          data: { kycDocumentId: uploadData.document_id },
        })

        return NextResponse.json({
          documentId: uploadData.document_id,
          selfieUrl: uploadData.url,
        })

      } catch (err) {
        console.error('NeoFace document_capture network error:', err)
        return NextResponse.json(
          { error: 'Impossible de joindre le service KYC. Veuillez réessayer.' },
          { status: 503 }
        )
      }
    }

    // ─── MODE: Verify / Poll for status ─────────────────────────────────────
    if (mode === 'verify') {
      const documentId = body.documentId as string | undefined
      if (!documentId) {
        return NextResponse.json(
          { error: 'document_id requis pour la vérification.' },
          { status: 400 }
        )
      }

      try {
        const verifyResponse = await fetch(`${NEOFACE_API_BASE()}/api/v2/match_verify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ document_id: documentId }),
        })

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text()
          console.error('NeoFace match_verify error:', verifyResponse.status, errorText.substring(0, 500))
          return NextResponse.json(
            { error: 'Erreur lors de la vérification. Veuillez réessayer.' },
            { status: 502 }
          )
        }

        const verifyData = await verifyResponse.json()
        const status = verifyData.status as string

        // If verified → update user
        if (status === 'verified') {
          await db.user.update({
            where: { id: userId },
            data: {
              neofaceVerified: true,
              neofaceVerifiedAt: new Date(),
              kycDocumentId: null, // Clean up
            },
          })

          return NextResponse.json({
            status: 'verified',
            verified: true,
            matchingScore: verifyData.matching_score ?? null,
            message: verifyData.message || 'Vérification KYC réussie ! Votre visage a été authentifié avec succès.',
          })
        }

        if (status === 'failed') {
          // Clean up document_id
          await db.user.update({
            where: { id: userId },
            data: { kycDocumentId: null },
          }).catch(() => {})

          return NextResponse.json({
            status: 'failed',
            verified: false,
            message: verifyData.message || 'La vérification a échoué. Le selfie ne correspond pas à la photo du document.',
          })
        }

        // Still waiting
        return NextResponse.json({
          status: 'waiting',
          verified: false,
          message: 'En attente du selfie...',
        })

      } catch (err) {
        console.error('NeoFace match_verify network error:', err)
        return NextResponse.json(
          { error: 'Impossible de joindre le service KYC. Veuillez réessayer.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })
  } catch (error) {
    console.error('KYC face-auth error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
