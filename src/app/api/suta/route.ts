import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { checkRateLimit } from '@/lib/rate-limiter'
import { checkLiteRTHealth, callLiteRT } from '@/lib/litert-server'

const SUTA_SYSTEM_PROMPT = `Tu es SUTA, l'assistant IA de la plateforme Mon Toit (ANSUT), la plateforme de location immobilière en Côte d'Ivoire. Tu es chaleureux, professionnel et toujours prêt à aider.

Tu réponds aux questions concernant les fonctionnalités de la plateforme Mon Toit pour les 4 rôles principaux :

**LOCATAIRE (Locataire) :**
- Recherche de biens immobiliers (appartements, maisons, studios, duplex, villas)
- Candidatures et dossiers de location (documents requis : pièce d'identité, justificatif de revenus, garant)
- Visites de biens (demande, confirmation, annulation)
- Baux et contrats de location (signature électronique, conditions)
- Paiement des loyers (historique, reçus, rappels)
- Demandes de maintenance et réparations
- Favoris et liste de souhaits
- Avis et évaluations des propriétés
- Score de confiance et profil vérifié
- Messagerie avec les propriétaires
- Historique des transactions

**PROPRIÉTAIRE (Propriétaire) :**
- Publication et gestion d'annonces immobilières
- Vérification des biens par le Tiers de Confiance
- Gestion des candidatures et sélection des locataires
- Création et gestion des baux (conditions personnalisables)
- Suivi des paiements et finances (revenus, impayés)
- Gestion de la maintenance des propriétés
- Documents immobiliers (titres de propriété, plans, etc.)
- Mandats de gestion
- Avis reçus des locataires
- Statistiques et analytics (taux d'occupation, revenus)
- Gestion des visites
- Messagerie avec les locataires et agents

**AGENCE (Agence Immobilière) :**
- Gestion de portefeuille de biens
- Publication d'annonces pour plusieurs propriétés
- Gestion des visites planifiées
- Suivi des dossiers de location
- Tableau de bord avec statistiques
- Communication avec locataires et propriétaires
- Gestion des mandats
- Rapports financiers

**TIERS DE CONFIANCE (Vérificateur) :**
- Vérification d'identité des utilisateurs
- Validation des dossiers de location
- Gestion des missions de vérification
- Certification des utilisateurs et des biens
- Gestion des litiges entre locataires et propriétaires
- Gestion des agents de terrain
- Rapports et statistiques de vérification
- Communication avec les parties prenantes
- Surveillance des SLA (délais de traitement)
- Alertes de fraude
- États des lieux (entrée et sortie)
- Validation des documents de propriété

**Informations générales sur Mon Toit :**
- Mon Toit est une plateforme ANSUT (Agence Nationale de l'Urbanisme et du Territoire) en Côte d'Ivoire
- Couvre les communes d'Abidjan : Cocody, Plateau, Yopougon, Marcory, Treichville, Abobo, etc.
- Types de biens : Studio, Appartement, Maison, Duplex, Villa, Penthouse, Chambre
- Processus : Inscription → Vérification → Recherche/Publication → Candidature → Bail → Paiement
- Paiements sécurisés via la plateforme
- Système de messagerie intégré
- Notifications en temps réel

Règles importantes :
- Réponds TOUJOURS en français
- Sois concis mais complet
- Si la question ne concerne pas Mon Toit, redirige poliment vers les fonctionnalités de la plateforme
- Utilise le tutoiement (tu/toi) pour être plus proche de l'utilisateur
- N'invente jamais de fonctionnalités qui n'existent pas sur la plateforme
- Si tu ne connais pas la réponse exacte, oriente l'utilisateur vers le support ou la section appropriée de la plateforme`

// ── Azure OpenAI client ──────────────────────────────────────────────────────

async function callAzureOpenAI(messages: Array<{ role: string; content: string }>) {
  const endpoint = process.env.VITE_AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.VITE_AZURE_OPENAI_API_KEY
  const deployment = process.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME
  const apiVersion = process.env.VITE_AZURE_OPENAI_API_VERSION || '2024-10-21'

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI non configuré')
  }

  const url = `${endpoint.replace(/\/+$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Azure OpenAI Error]', response.status, errorText)
    if (response.status === 403) {
      throw new Error('Azure OpenAI est inaccessible (pare-feu réseau). Utilisez le serveur LiteRT en local.')
    }
    throw new Error(`Azure OpenAI a répondu avec le statut ${response.status}`)
  }

  return response.json()
}

// ── In-memory conversation store ────────────────────────────────────────────

const conversations = new Map<string, Array<{ role: 'assistant' | 'user'; content: string }>>()
const MAX_CONVERSATION_AGE = 30 * 60 * 1000
const conversationTimestamps = new Map<string, number>()

setInterval(() => {
  const now = Date.now()
  for (const [sessionId, timestamp] of conversationTimestamps) {
    if (now - timestamp > MAX_CONVERSATION_AGE) {
      conversations.delete(sessionId)
      conversationTimestamps.delete(sessionId)
    }
  }
}, 30 * 60 * 1000)

const MAX_MESSAGES = 20

// ── Routes ──────────────────────────────────────────────────────────────────

export async function GET() {
  const litert = await checkLiteRTHealth()

  return NextResponse.json({
    available: true,
    inference: litert
      ? { mode: 'litert', model: litert.model, backend: litert.backend }
      : { mode: 'cloud', provider: 'Azure OpenAI' },
    model: {
      local: process.env.LITERT_MODEL || 'suta-gemma3',
      cloud: {
        provider: 'Azure OpenAI',
        configured: !!(
          process.env.VITE_AZURE_OPENAI_ENDPOINT &&
          process.env.VITE_AZURE_OPENAI_API_KEY &&
          process.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME
        ),
      },
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req).catch(() => null)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = auth?.userId ? `${auth.userId}:${ip}` : `anon:${ip}`
    const { allowed } = checkRateLimit('suta', rateLimitKey, { maxRequests: 20, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer dans une minute.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { message, sessionId } = body
    const url = new URL(req.url)
    const streamMode = url.searchParams.get('stream') === 'true'

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID requis' }, { status: 400 })
    }

    let history = conversations.get(sessionId) || []
    conversationTimestamps.set(sessionId, Date.now())
    history.push({ role: 'user', content: message })

    if (history.length > MAX_MESSAGES) {
      history = history.slice(-MAX_MESSAGES)
    }

    const fullMessages = [
      { role: 'system', content: SUTA_SYSTEM_PROMPT },
      ...history,
    ] as Array<{ role: string; content: string }>

    if (streamMode) {
      return handleStreaming(req, fullMessages, history, sessionId)
    }

    return handleNonStreaming(fullMessages, history, sessionId)
  } catch (error) {
    console.error('[SUTA API Error]', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur. Veuillez réessayer.' },
      { status: 500 },
    )
  }
}

async function handleNonStreaming(
  fullMessages: Array<{ role: string; content: string }>,
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
  sessionId: string,
) {
  const litert = await checkLiteRTHealth()

  if (litert?.available) {
    try {
      const response = await callLiteRT(fullMessages)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || `LiteRT server error: ${response.status}`)
      }

      const aiResponse = data.choices?.[0]?.message?.content || ''

      history.push({ role: 'assistant', content: aiResponse })
      conversations.set(sessionId, history)

      return NextResponse.json({
        success: true,
        response: aiResponse,
        mode: 'litert',
      })
    } catch (err) {
      console.warn('[LiteRT] Fallback to Azure OpenAI:', err)
    }
  }

  const completion = await callAzureOpenAI(fullMessages)
  const aiResponse = completion.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.'

  history.push({ role: 'assistant', content: aiResponse })
  conversations.set(sessionId, history)

  return NextResponse.json({
    success: true,
    response: aiResponse,
    mode: 'cloud',
  })
}

async function handleStreaming(
  req: NextRequest,
  fullMessages: Array<{ role: string; content: string }>,
  history: Array<{ role: 'assistant' | 'user'; content: string }>,
  sessionId: string,
) {
  const litert = await checkLiteRTHealth()

  if (!litert?.available) {
    const completion = await callAzureOpenAI(fullMessages)
    const aiResponse = completion.choices?.[0]?.message?.content || ''
    history.push({ role: 'assistant', content: aiResponse })
    conversations.set(sessionId, history)
    return NextResponse.json({
      success: true,
      response: aiResponse,
      mode: 'cloud',
    })
  }

  const litertResponse = await callLiteRT(fullMessages, { stream: true })

  if (!litertResponse.ok) {
    const errorText = await litertResponse.text()
    console.warn('[LiteRT] Stream error, falling back:', errorText)
    const completion = await callAzureOpenAI(fullMessages)
    const aiResponse = completion.choices?.[0]?.message?.content || ''
    history.push({ role: 'assistant', content: aiResponse })
    conversations.set(sessionId, history)
    return NextResponse.json({
      success: true,
      response: aiResponse,
      mode: 'cloud',
    })
  }

  const encoder = new TextEncoder()
  const reader = litertResponse.body!.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: {"mode":"litert"}\n\n`))

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          controller.enqueue(encoder.encode(text))

          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              fullResponse += parsed.choices?.[0]?.delta?.content || ''
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        console.error('[LiteRT] Stream error:', err)
      } finally {
        controller.close()

        history.push({ role: 'assistant', content: fullResponse })
        conversations.set(sessionId, history)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    if (sessionId) {
      conversations.delete(sessionId)
      conversationTimestamps.delete(sessionId)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SUTA DELETE Error]', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
