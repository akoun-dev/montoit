import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * GET /api/scoring — compute Trust Score for the authenticated locataire
 *
 * Trust Score breakdown (100 points total):
 * - Profil complet (5%): Based on required profile fields filled
 * - NEOFACE (20%): Biometric verification
 * - ONECI (25%): National ID card verification
 * - Dossier locataire (50%): Rental file approved by TC
 *
 * Status thresholds:
 * - 70+ → "Approuvé"
 * - 50-69 → "Sous conditions"
 * - <50 → "Non recommandé"
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        gender: true,
        city: true,
        address: true,
        neofaceVerified: true,
        oneciVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // ── 1. Profil complet (5%) ──────────────────────────────────────────────
    const profileFields = [
      { key: 'fullName', label: 'Nom complet', filled: !!(user.firstName && user.lastName) },
      { key: 'phone', label: 'Téléphone', filled: !!user.phone },
      { key: 'city', label: 'Ville', filled: !!user.city },
      { key: 'address', label: 'Adresse', filled: !!user.address },
      { key: 'gender', label: 'Genre', filled: !!user.gender },
    ]
    const profileFilledCount = profileFields.filter((f) => f.filled).length
    const profileTotalFields = profileFields.length
    const profileScore = Math.round((profileFilledCount / profileTotalFields) * 5) // max 5 points

    // ── 2. NEOFACE (20%) ────────────────────────────────────────────────────
    const neofaceScore = user.neofaceVerified ? 20 : 0

    // ── 3. ONECI (25%) ──────────────────────────────────────────────────────
    const oneciScore = user.oneciVerified ? 25 : 0

    // ── 4. Dossier locataire (50%) ──────────────────────────────────────────
    const approvedRentalFile = await db.rentalFile.findFirst({
      where: { tenantId: userId, status: 'VALIDATED' },
      select: { id: true, status: true },
    })
    const hasApprovedRentalFile = !!approvedRentalFile
    const rentalFileScore = hasApprovedRentalFile ? 50 : 0

    // Check if user has a rental file in any status
    const anyRentalFile = await db.rentalFile.findFirst({
      where: { tenantId: userId },
      select: { id: true, status: true },
    })

    // ── Total score ─────────────────────────────────────────────────────────
    const totalScore = profileScore + neofaceScore + oneciScore + rentalFileScore

    // ── Status ──────────────────────────────────────────────────────────────
    let status: 'approuve' | 'sous_conditions' | 'non_recommande'
    let statusLabel: string
    let statusColor: string

    if (totalScore >= 70) {
      status = 'approuve'
      statusLabel = 'Approuvé'
      statusColor = 'emerald'
    } else if (totalScore >= 50) {
      status = 'sous_conditions'
      statusLabel = 'Sous conditions'
      statusColor = 'amber'
    } else {
      status = 'non_recommande'
      statusLabel = 'Non recommandé'
      statusColor = 'red'
    }

    // ── Recommendations ─────────────────────────────────────────────────────
    const recommendations: Array<{
      id: string
      title: string
      description: string
      impact: number
      action: string
      actionLabel: string
      completed: boolean
    }> = []

    if (profileFilledCount < profileTotalFields) {
      recommendations.push({
        id: 'profile',
        title: 'Compléter le profil',
        description: 'Ajoutez les informations manquantes à votre profil',
        impact: 5 - profileScore,
        action: 'settings',
        actionLabel: 'Modifier le profil',
        completed: false,
      })
    }

    if (!user.neofaceVerified) {
      recommendations.push({
        id: 'neoface',
        title: 'Reconnaissance faciale',
        description: 'Vérification d\'identité KYC (reconnaissance faciale)',
        impact: 20,
        action: 'neoface',
        actionLabel: 'Vérification KYC',
        completed: false,
      })
    }

    if (!user.oneciVerified) {
      recommendations.push({
        id: 'oneci',
        title: 'Vérification ONECI',
        description: 'Carte d\'identité nationale',
        impact: 25,
        action: 'oneci',
        actionLabel: 'Vérifier ma CNI',
        completed: false,
      })
    }

    if (!hasApprovedRentalFile) {
      recommendations.push({
        id: 'rental-file',
        title: 'Dossier locataire',
        description: 'Dossier locataire validé = +50% sur votre score',
        impact: 50,
        action: 'rental-file',
        actionLabel: anyRentalFile ? 'Voir mon dossier' : 'Commencer la vérification',
        completed: false,
      })
    }

    return NextResponse.json({
      score: totalScore,
      status,
      statusLabel,
      statusColor,
      breakdown: {
        profile: {
          score: profileScore,
          max: 5,
          weight: 5,
          fields: profileFields,
        },
        neoface: {
          score: neofaceScore,
          max: 20,
          weight: 20,
          verified: user.neofaceVerified,
          label: 'KYC',
          description: 'Reconnaissance faciale',
        },
        oneci: {
          score: oneciScore,
          max: 25,
          weight: 25,
          verified: user.oneciVerified,
          label: 'ONECI',
          description: 'Carte d\'identité nationale',
        },
        rentalFile: {
          score: rentalFileScore,
          max: 50,
          weight: 50,
          approved: hasApprovedRentalFile,
          hasFile: !!anyRentalFile,
          label: 'Dossier locataire',
          description: 'Dossier locataire approuvé',
        },
      },
      recommendations,
    })
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
