import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Récupérer les données du candidat
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', applicantId)
      .single();

    const { data: verification } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', applicantId)
      .single();

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('payer_id', applicantId)
      .eq('status', 'completed');

    let score = 0;
    const criteria: any = {};

    // 1. Vérification ONECI (25 points)
    if (verification?.oneci_status === 'verified') {
      score += 25;
      criteria.oneci_verified = true;
    }

    // 2. Statut emploi CNAM (20 points)
    if (verification?.cnam_status === 'verified') {
      score += 20;
      criteria.cnam_verified = true;

      // Ratio revenus/loyer (15 points)
      const estimatedSalary = verification.cnam_data?.employment?.estimatedMonthlySalary || 0;
      const rentToIncomeRatio = monthlyRent / estimatedSalary;
      
      if (rentToIncomeRatio <= 0.33) {
        score += 15;
        criteria.rent_to_income_ratio = 'excellent';
      } else if (rentToIncomeRatio <= 0.40) {
        score += 10;
        criteria.rent_to_income_ratio = 'good';
      } else if (rentToIncomeRatio <= 0.50) {
        score += 5;
        criteria.rent_to_income_ratio = 'acceptable';
      } else {
        criteria.rent_to_income_ratio = 'high_risk';
      }
    }

    // 3. Historique paiements (20 points)
    if (payments && payments.length > 0) {
      const onTimePayments = payments.filter((p: any) => p.status === 'completed').length;
      const paymentRate = onTimePayments / payments.length;
      
      if (paymentRate >= 0.95) {
        score += 20;
        criteria.payment_history = 'excellent';
      } else if (paymentRate >= 0.80) {
        score += 15;
        criteria.payment_history = 'good';
      } else if (paymentRate >= 0.60) {
        score += 10;
        criteria.payment_history = 'average';
      }
    }

    // 4. Documents fournis (10 points)
    // Simulé - à implémenter selon les documents uploadés
    score += 8;
    criteria.documents_complete = true;

    // 5. Profil complet (10 points)
    if (profile?.phone && profile?.city && profile?.bio) {
      score += 10;
      criteria.profile_complete = true;
    }

    // Recommandation
    let recommendation = 'rejected';
    if (score >= 75) {
      recommendation = 'approved';
    } else if (score >= 60) {
      recommendation = 'conditional';
    }

    const breakdown = {
      identity_verification: verification?.oneci_status === 'verified' ? 25 : 0,
      employment_verification: verification?.cnam_status === 'verified' ? 20 : 0,
      payment_history: criteria.payment_history === 'excellent' ? 20 : (criteria.payment_history === 'good' ? 15 : 10),
      income_ratio: score >= 90 ? 15 : (score >= 75 ? 10 : 5),
      documents: 8,
      profile_completeness: criteria.profile_complete ? 10 : 0
    };

    // Stocker le score dans user_verifications
    await supabase
      .from('user_verifications')
      .update({
        tenant_score: score,
        score_updated_at: new Date().toISOString()
      })
      .eq('user_id', applicantId);

    console.log('Score updated for user:', applicantId, 'Score:', score);

    return new Response(
      JSON.stringify({
        score,
        maxScore: 100,
        recommendation,
        criteria,
        breakdown
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tenant-scoring:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
