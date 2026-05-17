import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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
- Rapports et statististiques de vérification
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
- Ne invente jamais de fonctionnalités qui n'existent pas sur la plateforme
- Si tu ne connais pas la réponse exacte, oriente l'utilisateur vers le support ou la section appropriée de la plateforme`

// Keep a single ZAI instance per cold start
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

// In-memory conversation store (per session)
const conversations = new Map<string, Array<{ role: 'assistant' | 'user'; content: string }>>()

// Cleanup old conversations every 30 minutes
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, sessionId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID requis' }, { status: 400 })
    }

    // Get or create conversation history
    let history = conversations.get(sessionId) || []
    conversationTimestamps.set(sessionId, Date.now())

    // Add user message
    history.push({ role: 'user', content: message })

    // Trim if too long (keep system prompt space)
    if (history.length > MAX_MESSAGES) {
      history = history.slice(-MAX_MESSAGES)
    }

    const zai = await getZAI()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SUTA_SYSTEM_PROMPT },
        ...history,
      ],
      thinking: { type: 'disabled' },
    })

    const aiResponse = completion.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse. Veuillez réessayer.'

    // Add AI response to history
    history.push({ role: 'assistant', content: aiResponse })
    conversations.set(sessionId, history)

    return NextResponse.json({
      success: true,
      response: aiResponse,
    })
  } catch (error) {
    console.error('[SUTA API Error]', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur. Veuillez réessayer.' },
      { status: 500 }
    )
  }
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
