/**
 * Service de Scoring Centralisé - Mon Toit
 * Calcule le Global Trust Score basé sur 3 sous-scores pondérés
 */

import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';

export interface ScoreBreakdown {
  // Tenant weights: Profil complet 5%, Facial 20%, ONECI 25%, Dossier 50%
  profileScore: number; // 0-100 (complétude du profil)
  verificationScore: number; // 0-100 (facial + ONECI)
  historyScore: number; // 0-100 (dossier validé)
  globalScore: number; // 0-100 (moyenne pondérée)
  recommendation: 'approved' | 'conditional' | 'rejected';
  details: {
    profile: ProfileScoreDetails;
    verification: VerificationScoreDetails;
    history: HistoryScoreDetails;
  };
}

export interface ProfileScoreDetails {
  fullName: boolean;
  phone: boolean;
  city: boolean;
  gender: boolean;
  bio: boolean;
  avatar: boolean;
  address: boolean;
  total: number;
}

export interface VerificationScoreDetails {
  oneci: boolean;
  facial: boolean;
  dossier: boolean;
  total: number;
}

export interface HistoryScoreDetails {
  paymentReliability: number;
  propertyCondition: number;
  leaseCompliance: number;
  total: number;
}

export interface AgencyScoreDetails {
  agencyInfo: boolean; // Nom, description
  contactInfo: boolean; // Email, téléphone, ville
  logo: boolean; // Logo de l'agence
  website: boolean; // Site web
  address: boolean; // Adresse
  representative: boolean; // Nom complet du représentant
  representativeAvatar: boolean; // Photo du représentant
  representativePhone: boolean; // Téléphone du représentant
  total: number;
}

// Pondérations des sous-scores (locataire)
export const TENANT_SCORING_WEIGHTS = {
  profileComplete: 5,
  facial: 20,
  oneci: 25,
  dossier: 50,
} as const;

const TENANT_VERIFICATION_TOTAL = TENANT_SCORING_WEIGHTS.facial + TENANT_SCORING_WEIGHTS.oneci;

// Points pour chaque élément du profil (complétude)
const PROFILE_POINTS = {
  fullName: 15,
  phone: 15,
  city: 15,
  bio: 15,
  avatar: 20,
  address: 20,
};

// Si l'edge function n'existe pas / renvoie 500, on évite de la rappeler
let skipTenantScoring = false; // activé par défaut, sera désactivé automatiquement en cas d'erreur

export const ScoringService = {
  isProfileComplete(details: ProfileScoreDetails): boolean {
    return details.fullName && details.phone && details.city && details.address && details.gender;
  },

  /**
   * Calcule le score de profil (complétude)
   */
  calculateProfileScore(profile: Profile | null): { score: number; details: ProfileScoreDetails } {
    const hasText = (value: string | null | undefined): boolean =>
      typeof value === 'string' && value.trim().length > 0;
    const hasJsonValue = (value: unknown): boolean => {
      if (!value) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object')
        return Object.keys(value as Record<string, unknown>).length > 0;
      return false;
    };

    const details: ProfileScoreDetails = {
      fullName: hasText(profile?.full_name),
      phone: hasText(profile?.phone ?? ''),
      city: hasText(profile?.city),
      gender: hasText(profile?.gender),
      bio: hasText(profile?.bio),
      avatar: hasText(profile?.avatar_url),
      address: hasJsonValue(profile?.address),
      total: 0,
    };

    let score = 0;
    if (details.fullName) score += PROFILE_POINTS.fullName;
    if (details.phone) score += PROFILE_POINTS.phone;
    if (details.city) score += PROFILE_POINTS.city;
    if (details.bio) score += PROFILE_POINTS.bio;
    if (details.avatar) score += PROFILE_POINTS.avatar;
    if (details.address) score += PROFILE_POINTS.address;

    details.total = score;
    return { score, details };
  },

  /**
   * Calcule le score de vérification (facial + ONECI)
   */
  calculateVerificationScore(profile: Profile | null): {
    score: number;
    details: VerificationScoreDetails;
  } {
    const details: VerificationScoreDetails = {
      oneci: !!profile?.oneci_verified,
      facial: profile?.facial_verification_status === 'verified',
      dossier: false,
      total: 0,
    };

    const earned =
      (details.oneci ? TENANT_SCORING_WEIGHTS.oneci : 0) +
      (details.facial ? TENANT_SCORING_WEIGHTS.facial : 0);
    const score = Math.round((earned / TENANT_VERIFICATION_TOTAL) * 100);

    details.total = score;
    return { score, details };
  },

  /**
   * Calcule le score d'historique via l'edge function
   */
  async calculateHistoryScore(
    userId: string,
    propertyId?: string,
    monthlyRent?: number
  ): Promise<{ score: number; details: HistoryScoreDetails }> {
    if (skipTenantScoring) {
      return {
        score: 50,
        details: {
          paymentReliability: 50,
          propertyCondition: 50,
          leaseCompliance: 50,
          total: 50,
        },
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('tenant-scoring', {
        body: {
          applicantId: userId,
          propertyId: propertyId || null,
          monthlyRent: monthlyRent || 0,
        },
      });

      if (error) {
        console.warn('tenant-scoring unavailable, using default history score');
        skipTenantScoring = true;
        return {
          score: 50, // Score par défaut pour nouveaux utilisateurs
          details: {
            paymentReliability: 50,
            propertyCondition: 50,
            leaseCompliance: 50,
            total: 50,
          },
        };
      }

      const breakdown = data?.breakdown || {};
      const details: HistoryScoreDetails = {
        paymentReliability: breakdown.payment_history || 50,
        propertyCondition: breakdown.documents || 50,
        leaseCompliance: breakdown.profile_completeness || 50,
        total: data?.score || 50,
      };

      return { score: data?.score || 50, details };
    } catch (err) {
      console.warn('Error in calculateHistoryScore, fallback to defaults', err);
      skipTenantScoring = true;
      return {
        score: 50,
        details: {
          paymentReliability: 50,
          propertyCondition: 50,
          leaseCompliance: 50,
          total: 50,
        },
      };
    }
  },

  /**
   * Calcule le score spécifique pour les agences immobilières
   * Dossier approuvé → 100%
   * Sinon: Infos agence (50%) + Représentant (25%) + Vérifications (25%)
   */
  async calculateAgencyScore(userId: string, profile: Profile | null): Promise<ScoreBreakdown> {
    // Récupérer les infos de l'agence
    const { data: agency } = await supabase
      .from('agencies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Vérifier si un dossier de certification agence est approuvé
    const { data: approvedDossier } = await supabase
      .from('verification_applications')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('dossier_type', 'agency')
      .maybeSingle();

    // Si dossier approuvé, score = 100%
    if (approvedDossier) {
      return {
        profileScore: 100,
        verificationScore: 100,
        historyScore: 100,
        globalScore: 100,
        recommendation: 'approved',
        details: {
          profile: {
            fullName: !!profile?.full_name,
            phone: !!profile?.phone,
            city: !!agency?.city || !!profile?.city,
            gender: !!profile?.gender,
            bio: !!agency?.description,
            avatar: !!profile?.avatar_url,
            address: !!agency?.address || !!profile?.address,
            total: 100,
          },
          verification: {
            oneci: !!profile?.oneci_verified,
            facial: profile?.facial_verification_status === 'verified',
            dossier: true,
            total: 100,
          },
          history: {
            paymentReliability: 100,
            propertyCondition: 100,
            leaseCompliance: 100,
            total: 100,
          },
        },
      };
    }

    // Calcul du score d'agence
    const agencyInfoScore = this.calculateAgencyInfoScore(agency, profile);
    const representativeScore = this.calculateRepresentativeScore(profile);
    const verificationScore = this.calculateAgencyVerificationScore(profile);

    // Score total: Infos agence (50%) + Représentant (25%) + Vérifications (25%)
    const globalScore = Math.round(
      agencyInfoScore * 0.5 + representativeScore * 0.25 + verificationScore * 0.25
    );

    // Arrondir à 100 si très proche
    const finalScore = globalScore >= 99.5 ? 100 : globalScore;

    // Déterminer la recommandation
    let recommendation: 'approved' | 'conditional' | 'rejected';
    if (finalScore >= 70) {
      recommendation = 'approved';
    } else if (finalScore >= 50) {
      recommendation = 'conditional';
    } else {
      recommendation = 'rejected';
    }

    return {
      profileScore: agencyInfoScore,
      verificationScore: verificationScore,
      historyScore: representativeScore,
      globalScore: finalScore,
      recommendation,
      details: {
        profile: {
          fullName: !!profile?.full_name,
          phone: !!profile?.phone,
          city: !!agency?.city || !!profile?.city,
          gender: !!profile?.gender,
          bio: !!agency?.description,
          avatar: !!profile?.avatar_url,
          address: !!agency?.address || !!profile?.address,
          total: agencyInfoScore,
        },
        verification: {
          oneci: !!profile?.oneci_verified,
          facial: profile?.facial_verification_status === 'verified',
          dossier: false,
          total: verificationScore,
        },
        history: {
          paymentReliability: representativeScore,
          propertyCondition: representativeScore,
          leaseCompliance: representativeScore,
          total: representativeScore,
        },
      },
    };
  },

  /**
   * Calcule le score des infos agence (max 100)
   */
  calculateAgencyInfoScore(agency: Record<string, unknown> | null, profile: Profile | null): number {
    let score = 0;
    // Nom de l'agence (20 points)
    if (agency?.agency_name || profile?.agency_name) score += 20;
    // Description (15 points)
    if (agency?.description || profile?.agency_description) score += 15;
    // Logo (15 points)
    if (agency?.logo_url || profile?.agency_logo) score += 15;
    // Email de contact (10 points)
    if (agency?.email) score += 10;
    // Téléphone (10 points)
    if (agency?.phone || profile?.phone) score += 10;
    // Site web (10 points)
    if (agency?.website) score += 10;
    // Ville (10 points)
    if (agency?.city || profile?.city) score += 10;
    // Adresse (10 points)
    if (agency?.address || profile?.address) score += 10;
    return Math.min(score, 100);
  },

  /**
   * Calcule le score du représentant (max 100)
   */
  calculateRepresentativeScore(profile: Profile | null): number {
    let score = 0;
    // Nom complet du représentant (35 points)
    if (profile?.full_name) score += 35;
    // Photo du représentant (35 points)
    if (profile?.avatar_url) score += 35;
    // Téléphone du représentant (30 points)
    if (profile?.phone) score += 30;
    return Math.min(score, 100);
  },

  /**
   * Calcule le score de vérification agence (max 100)
   */
  calculateAgencyVerificationScore(profile: Profile | null): number {
    let score = 0;
    // Email vérifié (50 points - toujours vrai avec Supabase Auth)
    score += 50;
    // ONECI vérifié (50 points)
    if (profile?.oneci_verified) score += 50;
    return Math.min(score, 100);
  },

  /**
   * Calcule le Global Trust Score complet en utilisant la fonction Edge
   * Si la fonction Edge n'est pas disponible, utilise le calcul côté client en fallback
   */
  async calculateGlobalTrustScore(
    userId: string,
    propertyId?: string,
    monthlyRent?: number
  ): Promise<ScoreBreakdown> {
    // Récupérer le profil utilisateur
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    // Vérifier si c'est une agence
    const userType = profile?.user_type?.toLowerCase();
    const isAgency = userType === 'agency' || userType === 'agency';

    // Pour les agences, utiliser le calcul spécifique (pas de fonction Edge pour les agences)
    if (isAgency) {
      return await this.calculateAgencyScore(userId, profile);
    }

    // Essayer d'utiliser la fonction Edge pour le calcul complet
    if (!skipTenantScoring) {
      try {
        const { data, error } = await supabase.functions.invoke('tenant-scoring', {
          body: {
            applicantId: userId,
            propertyId: propertyId || null,
            monthlyRent: monthlyRent || 0,
          },
        });

        if (!error && data && typeof data.globalScore === 'number') {
          // La fonction Edge a retourné un résultat valide
          const breakdown = data.breakdown || {};
          const details = breakdown.details || {};

          return {
            profileScore: breakdown.profile?.score || 0,
            verificationScore: breakdown.verification?.score || 0,
            historyScore: breakdown.history?.score || 0,
            globalScore: data.globalScore,
            recommendation: data.recommendation || 'rejected',
            details: {
              profile: this.mapProfileDetails(details.profile || {}, profile),
              verification: {
                oneci: !!details.verification?.oneci,
                facial: details.verification?.facial || false,
                dossier: !!details.verification?.ansut,
                total: breakdown.verification?.score || 0,
              },
              history: {
                paymentReliability: details.history?.paymentReliability || 50,
                propertyCondition: details.history?.propertyCondition || 50,
                leaseCompliance: details.history?.leaseCompliance || 50,
                total: breakdown.history?.score || 0,
              },
            },
          };
        }
      } catch (err) {
        console.warn('Edge function tenant-scoring failed, using client-side calculation', err);
        skipTenantScoring = true;
      }
    }

    // Fallback: calcul côté client
    return await this.calculateClientSideScore(userId, profile, propertyId, monthlyRent);
  },

  /**
   * Mappe les détails de la fonction Edge vers le format local
   */
  mapProfileDetails(edgeDetails: Record<string, unknown>, profile: Profile | null): ProfileScoreDetails {
    return {
      fullName: !!edgeDetails.fullName,
      phone: !!edgeDetails.phone,
      city: !!edgeDetails.city,
      gender: !!profile?.gender,
      bio: !!edgeDetails.bio,
      avatar: !!edgeDetails.avatar,
      address: !!edgeDetails.address,
      total: typeof edgeDetails.total === 'number' ? edgeDetails.total : 0,
    };
  },

  /**
   * Calcul côté client en fallback si la fonction Edge n'est pas disponible
   */
  async calculateClientSideScore(
    userId: string,
    profile: Profile | null,
    _propertyId?: string,
    _monthlyRent?: number
  ): Promise<ScoreBreakdown> {
    // Vérifier si un dossier est approuvé (Dossier locataire)
    const { data: approvedDossier } = await supabase
      .from('verification_applications')
      .select('id, status, dossier_type')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle();

    // Calculer les sous-scores (locataire)
    const profileResult = this.calculateProfileScore(profile);
    const profileComplete = this.isProfileComplete(profileResult.details);

    const facialVerified = profile?.facial_verification_status === 'verified';
    const oneciVerified = !!profile?.oneci_verified;
    const dossierApproved = !!approvedDossier;

    const profileContribution = profileComplete ? TENANT_SCORING_WEIGHTS.profileComplete : 0;
    const facialContribution = facialVerified ? TENANT_SCORING_WEIGHTS.facial : 0;
    const oneciContribution = oneciVerified ? TENANT_SCORING_WEIGHTS.oneci : 0;
    const dossierContribution = dossierApproved ? TENANT_SCORING_WEIGHTS.dossier : 0;

    const verificationScore = Math.round(
      ((facialContribution + oneciContribution) / TENANT_VERIFICATION_TOTAL) * 100
    );

    const historyScore = dossierApproved ? 100 : 0;
    const historyDetails: HistoryScoreDetails = {
      paymentReliability: historyScore,
      propertyCondition: historyScore,
      leaseCompliance: historyScore,
      total: historyScore,
    };

    const globalScore =
      profileContribution + facialContribution + oneciContribution + dossierContribution;

    // Arrondir à 100 si c'est très proche
    const finalScore = globalScore >= 99.5 ? 100 : globalScore;

    // Déterminer la recommandation
    let recommendation: 'approved' | 'conditional' | 'rejected';
    if (finalScore >= 70) {
      recommendation = 'approved';
    } else if (finalScore >= 50) {
      recommendation = 'conditional';
    } else {
      recommendation = 'rejected';
    }

    return {
      profileScore: profileComplete ? 100 : 0,
      verificationScore: verificationScore,
      historyScore: historyScore,
      globalScore: finalScore,
      recommendation,
      details: {
        profile: profileResult.details,
        verification: {
          oneci: oneciVerified,
          facial: facialVerified,
          dossier: dossierApproved,
          total: verificationScore,
        },
        history: historyDetails,
      },
    };
  },

  /**
   * Calcule le score de vérification (facial + ONECI) sur 100
   */
  calculateEnhancedVerificationScore(profile: Profile | null): number {
    const facial = profile?.facial_verification_status === 'verified';
    const oneci = !!profile?.oneci_verified;
    const earned =
      (facial ? TENANT_SCORING_WEIGHTS.facial : 0) + (oneci ? TENANT_SCORING_WEIGHTS.oneci : 0);
    return Math.round((earned / TENANT_VERIFICATION_TOTAL) * 100);
  },

  /**
   * Calcule un score simple pour les candidatures (locataire)
   * Profil complet (5%) + Facial (20%) + ONECI (25%) + Dossier validé (50%)
   */
  async calculateSimpleScore(profile: Profile | null, userId?: string): Promise<number> {
    const profileResult = this.calculateProfileScore(profile);
    const profileComplete = this.isProfileComplete(profileResult.details);

    const facialVerified = profile?.facial_verification_status === 'verified';
    const oneciVerified = !!profile?.oneci_verified;
    let dossierApproved = false;

    if (userId) {
      const { data: approvedDossier } = await supabase
        .from('verification_applications')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .maybeSingle();
      dossierApproved = !!approvedDossier;
    }

    const score =
      (profileComplete ? TENANT_SCORING_WEIGHTS.profileComplete : 0) +
      (facialVerified ? TENANT_SCORING_WEIGHTS.facial : 0) +
      (oneciVerified ? TENANT_SCORING_WEIGHTS.oneci : 0) +
      (dossierApproved ? TENANT_SCORING_WEIGHTS.dossier : 0);

    // Arrondir à 100 si très proche
    return score >= 99.5 ? 100 : score;
  },

  /**
   * Obtient le libellé de la recommandation en français
   */
  getRecommendationLabel(recommendation: 'approved' | 'conditional' | 'rejected'): string {
    switch (recommendation) {
      case 'approved':
        return 'Approuvé';
      case 'conditional':
        return 'Sous conditions';
      case 'rejected':
        return 'Non recommandé';
    }
  },

  /**
   * Obtient la couleur de la recommandation
   */
  getRecommendationColor(recommendation: 'approved' | 'conditional' | 'rejected'): string {
    switch (recommendation) {
      case 'approved':
        return 'text-green-600';
      case 'conditional':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
    }
  },
};

export default ScoringService;
