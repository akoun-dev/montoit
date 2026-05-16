import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * KYC Face Recognition API using NeoFace v2
 * NOTE: This is a SEPARATE API from ONECI. NeoFace handles biometric face verification,
 * while ONECI handles national ID card authentication.
 *
 * Two modes:
 * 1. POST { mode: "upload", docFile: "<base64>" }
 *    → Uploads ID card photo to NeoFace document_capture
 *    → Returns { documentId, selfieUrl }
 *
 * 2. POST { mode: "verify", documentId: "doc-xxx" }
 *    → Polls NeoFace match_verify for the result
 *    → Returns { status, verified, matchingScore }
 */

const NEOFACE_API_BASE = () => process.env.NEOFACE_API_BASE || 'https://neoface.aineo.ai'
const NEOFACE_TOKEN = () => process.env.NEOFACE_BEARER_TOKEN

// Timeout for NeoFace API calls (15s)
const NEOFACE_TIMEOUT = 15_000

async function fetchWithTimeout(url: string, options: RequestInit, timeout = NEOFACE_TIMEOUT) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, neofaceVerified: true },
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
      console.error('[KYC] NEOFACE_BEARER_TOKEN not configured')
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

      const buffer = Buffer.from(docFileBase64, 'base64')
      const blob = new Blob([buffer], { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('doc_file', blob, 'document.jpg')

      try {
        console.log('[KYC] Calling document_capture on', NEOFACE_API_BASE())
        const uploadResponse = await fetchWithTimeout(
          `${NEOFACE_API_BASE()}/api/v2/document_capture`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
          NEOFACE_TIMEOUT
        )

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => '')
          console.error('[KYC] document_capture error:', uploadResponse.status, errorText.substring(0, 500))

          if (uploadResponse.status === 502 || uploadResponse.status === 503 || uploadResponse.status === 504) {
            return NextResponse.json(
              { error: 'Le service KYC est temporairement indisponible. Veuillez réessayer dans quelques instants.' },
              { status: 503 }
            )
          }

          return NextResponse.json(
            { error: 'Erreur lors de l\'envoi du document. Veuillez réessayer.' },
            { status: 502 }
          )
        }

        const uploadData = await uploadResponse.json()

        if (!uploadData.success || !uploadData.document_id) {
          console.error('[KYC] document_capture: unexpected response', JSON.stringify(uploadData).substring(0, 500))
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

        console.log('[KYC] document_capture success, document_id:', uploadData.document_id)

        return NextResponse.json({
          documentId: uploadData.document_id,
          selfieUrl: uploadData.url,
        })

      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.error('[KYC] document_capture timed out after', NEOFACE_TIMEOUT, 'ms')
          return NextResponse.json(
            { error: 'Le service KYC met trop de temps à répondre. Veuillez réessayer.' },
            { status: 504 }
          )
        }
        console.error('[KYC] document_capture network error:', err)
        return NextResponse.json(
          { error: 'Impossible de joindre le service KYC. Vérifiez votre connexion et réessayez.' },
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
        const verifyResponse = await fetchWithTimeout(
          `${NEOFACE_API_BASE()}/api/v2/match_verify`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ document_id: documentId }),
          },
          NEOFACE_TIMEOUT
        )

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text().catch(() => '')
          console.error('[KYC] match_verify error:', verifyResponse.status, errorText.substring(0, 500))

          if (verifyResponse.status === 502 || verifyResponse.status === 503 || verifyResponse.status === 504) {
            return NextResponse.json(
              { error: 'Le service KYC est temporairement indisponible. Veuillez réessayer.' },
              { status: 503 }
            )
          }

          return NextResponse.json(
            { error: 'Erreur lors de la vérification. Veuillez réessayer.' },
            { status: 502 }
          )
        }

        const verifyData = await verifyResponse.json()
        const status = verifyData.status as string

        if (status === 'verified') {
          await db.user.update({
            where: { id: userId },
            data: {
              neofaceVerified: true,
              neofaceVerifiedAt: new Date(),
              kycDocumentId: null,
            },
          })

          console.log('[KYC] Verification successful for user:', userId)

          return NextResponse.json({
            status: 'verified',
            verified: true,
            matchingScore: verifyData.matching_score ?? null,
            message: verifyData.message || 'Vérification KYC réussie ! Votre visage a été authentifié avec succès.',
          })
        }

        if (status === 'failed') {
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
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.error('[KYC] match_verify timed out after', NEOFACE_TIMEOUT, 'ms')
          return NextResponse.json(
            { error: 'Le service KYC met trop de temps à répondre. Veuillez réessayer.' },
            { status: 504 }
          )
        }
        console.error('[KYC] match_verify network error:', err)
        return NextResponse.json(
          { error: 'Impossible de joindre le service KYC. Vérifiez votre connexion et réessayez.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })
  } catch (error) {
    console.error('[KYC] face-auth error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
