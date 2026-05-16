import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

/**
 * GET /api/scoring — compute Trust Score for the authenticated user
 *
 * The Trust Score is role-aware:
 *
 * LOCATAIRE breakdown (100 points total):
 * - Profil complet (5%): Based on required profile fields filled
 * - KYC (20%): Biometric verification
 * - ONECI (25%): National ID card verification
 * - Dossier locataire (50%): Rental file approved by TC
 *
 * PROPRIETAIRE / AGENCE breakdown (100 points total):
 * - Profil complet (5%): Based on required profile fields filled (SAME as locataire)
 * - KYC (20%): Biometric verification (SAME as locataire)
 * - ONECI (25%): National ID card verification (SAME as locataire)
 * - Dossier propriétaire (50%): Owner file approved by TC
 *
 * Status thresholds:
 * - 70+ → "Approuvé"
 * - 50-69 → "Sous conditions"
 * - <50 → "Non recommandé"
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

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
        neofaceVerified: true,
        oneciVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Determine the effective role
    const isProprietaire = effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE'

    // ── 1. Profil complet (5%) — SAME for all roles ────────────────────────
    const profileFields = [
      { key: 'fullName', label: 'Nom complet', filled: !!(user.firstName && user.lastName) },
      { key: 'phone', label: 'Téléphone', filled: !!user.phone },
      { key: 'city', label: 'Ville', filled: !!user.city },
      { key: 'gender', label: 'Genre', filled: !!user.gender },
    ]
    const profileFilledCount = profileFields.filter((f) => f.filled).length
    const profileTotalFields = profileFields.length
    const profileScore = Math.round((profileFilledCount / profileTotalFields) * 5) // max 5 points

    // ── 2. KYC / NEOFACE (20%) — SAME for all roles ───────────────────────
    const neofaceScore = user.neofaceVerified ? 20 : 0

    // ── 3. ONECI (25%) — SAME for all roles ────────────────────────────────
    const oneciScore = user.oneciVerified ? 25 : 0

    // ── 4. Role-specific component (50%) ────────────────────────────────────
    let roleSpecificScore = 0
    let roleSpecificLabel = ''
    let roleSpecificDescription = ''
    let roleSpecificApproved = false
    let roleSpecificHasFile = false
    let roleSpecificRecommendationTitle = ''
    let roleSpecificRecommendationDescription = ''
    let roleSpecificAction = ''
    let roleSpecificActionLabel = ''

    if (isProprietaire) {
      // PROPRIETAIRE: Score based on owner file validation (same logic as Dossier locataire)
      const approvedOwnerFile = await db.ownerFile.findFirst({
        where: { ownerId: userId, status: 'VALIDATED' },
        select: { id: true, status: true },
      })

      const anyOwnerFile = await db.ownerFile.findFirst({
        where: { ownerId: userId },
        select: { id: true, status: true },
      })

      roleSpecificApproved = !!approvedOwnerFile
      roleSpecificScore = roleSpecificApproved ? 50 : 0
      roleSpecificHasFile = !!anyOwnerFile
      roleSpecificLabel = 'Dossier propriétaire'
      roleSpecificDescription = 'Dossier propriétaire approuvé'
      roleSpecificRecommendationTitle = 'Dossier propriétaire'
      roleSpecificRecommendationDescription = 'Dossier propriétaire validé = +50% sur votre score'
      roleSpecificAction = 'owner-file'
      roleSpecificActionLabel = anyOwnerFile ? 'Voir mon dossier' : 'Commencer la vérification'
    } else {
      // LOCATAIRE: Score based on rental file validation
      const approvedRentalFile = await db.rentalFile.findFirst({
        where: { tenantId: userId, status: 'VALIDATED' },
        select: { id: true, status: true },
      })

      const anyRentalFile = await db.rentalFile.findFirst({
        where: { tenantId: userId },
        select: { id: true, status: true },
      })

      roleSpecificApproved = !!approvedRentalFile
      roleSpecificScore = roleSpecificApproved ? 50 : 0
      roleSpecificHasFile = !!anyRentalFile
      roleSpecificLabel = 'Dossier locataire'
      roleSpecificDescription = 'Dossier locataire approuvé'
      roleSpecificRecommendationTitle = 'Dossier locataire'
      roleSpecificRecommendationDescription = 'Dossier locataire validé = +50% sur votre score'
      roleSpecificAction = 'rental-file'
      roleSpecificActionLabel = anyRentalFile ? 'Voir mon dossier' : 'Commencer la vérification'
    }

    // ── Total score ─────────────────────────────────────────────────────────
    const totalScore = profileScore + neofaceScore + oneciScore + roleSpecificScore

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

    if (!roleSpecificApproved) {
      recommendations.push({
        id: isProprietaire ? 'owner-file' : 'rental-file',
        title: roleSpecificRecommendationTitle,
        description: roleSpecificRecommendationDescription,
        impact: 50 - roleSpecificScore,
        action: roleSpecificAction,
        actionLabel: roleSpecificActionLabel,
        completed: false,
      })
    }

    // ── Role label for UI ───────────────────────────────────────────────────
    const roleLabel = isProprietaire ? 'propriétaire' : 'locataire'

    return NextResponse.json({
      score: totalScore,
      status,
      statusLabel,
      statusColor,
      roleLabel,
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
        roleSpecific: {
          score: roleSpecificScore,
          max: 50,
          weight: 50,
          approved: roleSpecificApproved,
          hasFile: roleSpecificHasFile,
          label: roleSpecificLabel,
          description: roleSpecificDescription,
        },
      },
      recommendations,
    })
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
