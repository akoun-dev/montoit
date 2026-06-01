import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone, email, gender, city, neoface_verified, oneci_verified, role, active_role')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const effectiveRole = user.active_role || user.role
    const isProprietaire = effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE'

    const profileFields = [
      { key: 'fullName', label: 'Nom complet', filled: !!(user.first_name && user.last_name) },
      { key: 'phone', label: 'Téléphone', filled: !!user.phone },
      { key: 'city', label: 'Ville', filled: !!user.city },
      { key: 'gender', label: 'Genre', filled: !!user.gender },
    ]
    const profileFilledCount = profileFields.filter((f) => f.filled).length
    const profileTotalFields = profileFields.length
    const profileScore = Math.round((profileFilledCount / profileTotalFields) * 5)

    const neofaceScore = user.neoface_verified ? 20 : 0
    const oneciScore = user.oneci_verified ? 25 : 0

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
      const { data: approvedOwnerFile } = await supabase
        .from('owner_files')
        .select('id, status')
        .eq('owner_id', userId)
        .eq('status', 'VALIDATED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: anyOwnerFile } = await supabase
        .from('owner_files')
        .select('id, status')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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
      const { data: approvedRentalFile } = await supabase
        .from('rental_files')
        .select('id, status')
        .eq('tenant_id', userId)
        .eq('status', 'VALIDATED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: anyRentalFile } = await supabase
        .from('rental_files')
        .select('id, status')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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

    const totalScore = profileScore + neofaceScore + oneciScore + roleSpecificScore

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

    if (!user.neoface_verified) {
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

    if (!user.oneci_verified) {
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

    const roleLabel = isProprietaire ? 'propriétaire' : 'locataire'

    const resp = NextResponse.json({
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
          verified: user.neoface_verified,
          label: 'KYC',
          description: 'Reconnaissance faciale',
        },
        oneci: {
          score: oneciScore,
          max: 25,
          weight: 25,
          verified: user.oneci_verified,
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
    return applyCookies(resp)
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
