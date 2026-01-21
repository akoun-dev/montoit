import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constantes selon la spécification
const WEIGHTS = { 
  profile: 0.20, 
  verification: 0.40, 
  history: 0.40 
};

const PROFILE_POINTS = { 
  fullName: 15, 
  phone: 15, 
  city: 15, 
  bio: 15, 
  avatar: 20, 
  address: 20 
};

const VERIFICATION_POINTS = { 
  oneci: 30, 
  cnam: 25, 
  facial: 25, 
  ansut: 20 
};

const THRESHOLDS = { 
  approved: 70, 
  conditional: 50 
};

const DEFAULT_HISTORY_SCORE = 50;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantId, propertyId, monthlyRent } = await req.json();
    console.log('Tenant Scoring Request:', { applicantId, propertyId, monthlyRent });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Récupérer le profil (la clé primaire est id = user.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', applicantId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch profile');
    }

    if (!profile) {
      console.log('Profile not found for applicantId:', applicantId);
      return new Response(
        JSON.stringify({ 
          error: 'Profile not found',
          score: 0,
          globalScore: 0,
          recommendation: 'rejected'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calculer le Score de Profil (20% du total, max 100 pts)
    let profileScore = 0;
    const profileDetails = {
      fullName: !!profile.full_name,
      phone: !!profile.phone,
      city: !!profile.city,
      bio: !!profile.bio,
      avatar: !!profile.avatar_url,
      address: !!profile.address,
    };

    if (profileDetails.fullName) profileScore += PROFILE_POINTS.fullName;
    if (profileDetails.phone) profileScore += PROFILE_POINTS.phone;
    if (profileDetails.city) profileScore += PROFILE_POINTS.city;
    if (profileDetails.bio) profileScore += PROFILE_POINTS.bio;
    if (profileDetails.avatar) profileScore += PROFILE_POINTS.avatar;
    if (profileDetails.address) profileScore += PROFILE_POINTS.address;

    console.log('Profile Score:', profileScore, profileDetails);

    // 3. Calculer le Score de Vérification (40% du total, max 100 pts)
    let verificationScore = 0;
    const verificationDetails = {
      oneci: !!profile.oneci_verified,
      cnam: !!profile.cnam_verified,
      facial: profile.facial_verification_status === 'verified',
      ansut: !!profile.is_verified,
    };

    if (verificationDetails.oneci) verificationScore += VERIFICATION_POINTS.oneci;
    if (verificationDetails.cnam) verificationScore += VERIFICATION_POINTS.cnam;
    if (verificationDetails.facial) verificationScore += VERIFICATION_POINTS.facial;
    if (verificationDetails.ansut) verificationScore += VERIFICATION_POINTS.ansut;

    console.log('Verification Score:', verificationScore, verificationDetails);

    // 4. Calculer le Score d'Historique (40% du total, max 100 pts)
    let historyScore = DEFAULT_HISTORY_SCORE;
    const historyDetails = {
      paymentReliability: DEFAULT_HISTORY_SCORE,
      landlordRating: DEFAULT_HISTORY_SCORE,
      totalPayments: 0,
      onTimePayments: 0,
      totalReviews: 0,
      averageRating: 0,
      hasHistory: false,
      rentalHistoryCount: 0,
      verifiedRentals: 0,
      rentalHistoryBonus: 0,
    };

    // 4.1 Récupérer et analyser les paiements
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('status, due_date, paid_date')
      .eq('payer_id', applicantId);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    if (payments && payments.length > 0) {
      historyDetails.hasHistory = true;
      historyDetails.totalPayments = payments.length;

      // Compter les paiements à temps
      const onTimePayments = payments.filter(p => {
        // Si le paiement est complété
        if (p.status === 'completed') {
          // Si on a les dates, vérifier si payé avant échéance
          if (p.paid_date && p.due_date) {
            return new Date(p.paid_date) <= new Date(p.due_date);
          }
          // Si pas de dates, considérer comme à temps
          return true;
        }
        return false;
      }).length;

      historyDetails.onTimePayments = onTimePayments;
      const paymentRate = payments.length > 0 ? onTimePayments / payments.length : 0;
      historyDetails.paymentReliability = Math.round(paymentRate * 100);
    }

    console.log('Payment History:', historyDetails.totalPayments, 'payments,', historyDetails.onTimePayments, 'on time');

    // 4.2 Récupérer les évaluations des propriétaires
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', applicantId)
      .eq('review_type', 'tenant');

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
    }

    if (reviews && reviews.length > 0) {
      historyDetails.hasHistory = true;
      historyDetails.totalReviews = reviews.length;

      const validRatings = reviews.filter(r => r.rating !== null && r.rating !== undefined);
      if (validRatings.length > 0) {
        const avgRating = validRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / validRatings.length;
        historyDetails.averageRating = Math.round(avgRating * 10) / 10;
        // Convertir la note /5 en pourcentage
        historyDetails.landlordRating = Math.round((avgRating / 5) * 100);
      }
    }

    console.log('Reviews:', historyDetails.totalReviews, 'reviews, avg rating:', historyDetails.averageRating);

    // 4.3 Récupérer l'historique déclaré par le locataire (rental_history)
    const { data: rentalHistory, error: rentalHistoryError } = await supabase
      .from('rental_history')
      .select('*')
      .eq('tenant_id', applicantId);

    if (rentalHistoryError) {
      console.error('Error fetching rental history:', rentalHistoryError);
    }

    if (rentalHistory && rentalHistory.length > 0) {
      historyDetails.hasHistory = true;
      historyDetails.rentalHistoryCount = rentalHistory.length;

      let rentalBonus = 0;

      // Calculer le bonus selon le statut de vérification
      rentalHistory.forEach((rental: any) => {
        const startDate = new Date(rental.start_date);
        const endDate = rental.end_date ? new Date(rental.end_date) : new Date();
        const months = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

        if (rental.verification_status === 'verified') {
          historyDetails.verifiedRentals++;
          // Historique vérifié = 2 pts par mois, max 20 pts par location
          rentalBonus += Math.min(months * 2, 20);
        } else if (rental.verification_status === 'pending') {
          // Historique en attente = 0.5 pt par mois, max 5 pts
          rentalBonus += Math.min(months * 0.5, 5);
        } else if (rental.verification_status === 'unverifiable') {
          // Non vérifiable = bonus fixe de 2 pts
          rentalBonus += 2;
        }
        // 'rejected' = 0 pts
      });

      // Bonus ancienneté: si > 24 mois d'historique total
      const totalMonths = rentalHistory.reduce((sum: number, rental: any) => {
        const startDate = new Date(rental.start_date);
        const endDate = rental.end_date ? new Date(rental.end_date) : new Date();
        return sum + Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }, 0);

      if (totalMonths >= 24) {
        rentalBonus += 10; // Bonus ancienneté
      }

      historyDetails.rentalHistoryBonus = Math.min(rentalBonus, 50);
    }

    console.log('Rental History:', historyDetails.rentalHistoryCount, 'rentals,', historyDetails.verifiedRentals, 'verified, bonus:', historyDetails.rentalHistoryBonus);

    // Calculer le score d'historique final
    // Pondération: 40% paiements, 30% évaluations, 30% historique déclaré
    if (historyDetails.hasHistory) {
      historyScore = Math.round(
        (historyDetails.paymentReliability * 0.4) + 
        (historyDetails.landlordRating * 0.3) +
        (Math.min(historyDetails.rentalHistoryBonus * 2, 100) * 0.3) // Convertir bonus en score /100
      );
    }

    console.log('History Score:', historyScore);

    // 5. Calculer le Score Global avec pondération selon la spec
    const globalScore = Math.round(
      (profileScore * WEIGHTS.profile) +
      (verificationScore * WEIGHTS.verification) +
      (historyScore * WEIGHTS.history)
    );

    console.log('Global Score Calculation:', {
      profileContribution: Math.round(profileScore * WEIGHTS.profile),
      verificationContribution: Math.round(verificationScore * WEIGHTS.verification),
      historyContribution: Math.round(historyScore * WEIGHTS.history),
      globalScore
    });

    // 6. Déterminer la recommandation selon les seuils corrects (70/50)
    let recommendation: 'approved' | 'conditional' | 'rejected';
    if (globalScore >= THRESHOLDS.approved) {
      recommendation = 'approved';
    } else if (globalScore >= THRESHOLDS.conditional) {
      recommendation = 'conditional';
    } else {
      recommendation = 'rejected';
    }

    // 7. Persister le score dans profiles.trust_score et reliability_score
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        trust_score: globalScore,
        reliability_score: historyScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicantId);

    if (updateError) {
      console.error('Error updating trust_score:', updateError);
    } else {
      console.log('Trust score persisted:', globalScore, 'for user:', applicantId);
    }

    // 8. Retourner la réponse complète
    const response = {
      score: historyScore, // Pour compatibilité avec ScoringService frontend
      globalScore,
      maxScore: 100,
      recommendation,
      breakdown: {
        profile: { 
          score: profileScore, 
          weight: WEIGHTS.profile,
          contribution: Math.round(profileScore * WEIGHTS.profile),
          details: profileDetails 
        },
        verification: { 
          score: verificationScore, 
          weight: WEIGHTS.verification,
          contribution: Math.round(verificationScore * WEIGHTS.verification),
          details: verificationDetails 
        },
        history: { 
          score: historyScore, 
          weight: WEIGHTS.history,
          contribution: Math.round(historyScore * WEIGHTS.history),
          details: historyDetails 
        },
      },
    };

    console.log('Tenant Scoring Response:', { applicantId, globalScore, recommendation });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tenant-scoring:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        score: 0,
        globalScore: 0,
        recommendation: 'rejected'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
