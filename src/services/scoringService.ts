/**
 * Service de Scoring Centralisé - Mon Toit
 * Calcule le Global Trust Score basé sur 3 sous-scores pondérés
 */

import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';

export interface ScoreBreakdown {
  profileScore: number; // 0-100 (20% du total)
  verificationScore: number; // 0-100 (40% du total)
  historyScore: number; // 0-100 (40% du total)
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
  bio: boolean;
  avatar: boolean;
  address: boolean;
  total: number;
}

export interface VerificationScoreDetails {
  oneci: boolean;
  facial: boolean;
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

// Pondérations des sous-scores
const WEIGHTS = {
  profile: 0.2, // 20%
  verification: 0.4, // 40%
  history: 0.4, // 40%
};

// Points pour chaque élément du profil
const PROFILE_POINTS = {
  fullName: 15,
  phone: 15,
  city: 15,
  bio: 15,
  avatar: 20,
  address: 20,
};

// Points pour chaque vérification (uniquement ONECI et Facial)
const VERIFICATION_POINTS = {
  oneci: 50, // 50 points sur 100
  facial: 50, // 50 points sur 100
};

// Si l'edge function n'existe pas / renvoie 500, on évite de la rappeler
let skipTenantScoring = false; // activé par défaut, sera désactivé automatiquement en cas d'erreur

export const ScoringService = {
  /**
   * Calcule le score de profil (complétude)
   */
  calculateProfileScore(profile: Profile | null): { score: number; details: ProfileScoreDetails } {
    const details: ProfileScoreDetails = {
      fullName: !!profile?.full_name,
      phone: !!profile?.phone,
      city: !!profile?.city,
      bio: !!profile?.bio,
      avatar: !!profile?.avatar_url,
      address: !!profile?.address,
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
   * Calcule le score de vérification
   */
  calculateVerificationScore(profile: Profile | null): {
    score: number;
    details: VerificationScoreDetails;
  } {
    const details: VerificationScoreDetails = {
      oneci: !!profile?.oneci_verified,
      facial: profile?.facial_verification_status === 'verified',
      total: 0,
    };

    let score = 0;
    if (details.oneci) score += VERIFICATION_POINTS.oneci;
    if (details.facial) score += VERIFICATION_POINTS.facial;

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
            bio: !!agency?.description,
            avatar: !!profile?.avatar_url,
            address: !!agency?.address || !!profile?.address,
            total: 100,
          },
          verification: {
            oneci: !!profile?.oneci_verified,
            facial: profile?.facial_verification_status === 'verified',
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
      agencyInfoScore * 0.5 +
        representativeScore * 0.25 +
        verificationScore * 0.25
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
          bio: !!agency?.description,
          avatar: !!profile?.avatar_url,
          address: !!agency?.address || !!profile?.address,
          total: agencyInfoScore,
        },
        verification: {
          oneci: !!profile?.oneci_verified,
          facial: profile?.facial_verification_status === 'verified',
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
  calculateAgencyInfoScore(agency: any, profile: Profile | null): number {
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
   * Calcule le Global Trust Score complet
   * Si le dossier (verification_application) est approuvé, retourne directement 100%
   * Sinon, calcule le score basé sur les vérifications complétées
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
    const isAgency = userType === 'agence' || userType === 'agency';

    // Pour les agences, utiliser le calcul spécifique
    if (isAgency) {
      return await this.calculateAgencyScore(userId, profile);
    }

    // Vérifier si un dossier est approuvé (priorité absolue)
    const { data: approvedDossier } = await supabase
      .from('verification_applications')
      .select('id, status, dossier_type')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle();

    // Si un dossier est approuvé, score = 100% immédiatement
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
            city: !!profile?.city,
            bio: !!profile?.bio,
            avatar: !!profile?.avatar_url,
            address: !!profile?.address,
            total: 100,
          },
          verification: {
            oneci: !!profile?.oneci_verified,
            facial: profile?.facial_verification_status === 'verified',
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

    // Calculer les sous-scores
    const profileResult = this.calculateProfileScore(profile);

    // Email toujours vérifié avec Supabase Auth
    const isEmailVerified = !!profile?.email_verified || true;
    const verificationScore = this.calculateEnhancedVerificationScore(profile, isEmailVerified);

    // SANS DOSSIER: Historique = 100 (ne pas pénaliser les nouveaux utilisateurs)
    // Le score est basé uniquement sur Profil + Vérifications
    const historyScore = 100;
    const historyDetails: HistoryScoreDetails = {
      paymentReliability: 100,
      propertyCondition: 100,
      leaseCompliance: 100,
      total: 100,
    };

    // CALCUL : Profil (50%) + Vérifications (50%) = 100% possible sans dossier
    // Profil complet (100) + Vérifications complètes (100) = 100%
    const globalScore = Math.round(
      profileResult.score * 0.5 +
        verificationScore * 0.5
    );

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
      profileScore: profileResult.score,
      verificationScore: verificationScore,
      historyScore: historyScore,
      globalScore: finalScore,
      recommendation,
      details: {
        profile: profileResult.details,
        verification: {
          oneci: !!profile?.oneci_verified,
          facial: profile?.facial_verification_status === 'verified',
          total: verificationScore,
        },
        history: historyDetails,
      },
    };
  },

  /**
   * Calcule le score de vérification ENHANCÉ (incluant email et facial)
   * Email: 33 points, ONECI: 33 points, Facial: 34 points = 100 max
   */
  calculateEnhancedVerificationScore(profile: Profile | null, isEmailVerified: boolean = true): number {
    let score = 0;

    // Email vérifié (toujours vrai avec Supabase Auth)
    if (isEmailVerified) score += 33;

    // ONECI vérifié
    if (profile?.oneci_verified) score += 33;

    // Reconnaissance faciale vérifiée
    if (profile?.facial_verification_status === 'verified') score += 34;

    return Math.min(score, 100);
  },

  /**
   * Calcule un score simple pour les candidatures
   * Si un dossier est approuvé, retourne 100%
   * Sinon, calcul basé sur Profil (50%) + Vérifications (50%)
   */
  async calculateSimpleScore(profile: Profile | null, userId?: string): Promise<number> {
    // Vérifier si un dossier est approuvé
    if (userId) {
      const { data: approvedDossier } = await supabase
        .from('verification_applications')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .maybeSingle();

      if (approvedDossier) {
        return 100;
      }
    }

    const profileResult = this.calculateProfileScore(profile);
    // Email toujours vérifié avec Supabase Auth
    const verificationScore = this.calculateEnhancedVerificationScore(profile, true);

    // CALCUL : Profil (50%) + Vérifications (50%) = 100% possible
    const score = Math.round(
      profileResult.score * 0.5 +
        verificationScore * 0.5
    );

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
