import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cniNumber, employerName, socialSecurityNumber } = await req.json();
    const authHeader = req.headers.get('Authorization')!;

    // Anonymize sensitive data in logs
    const cniHash = cniNumber ? `CNI_${cniNumber.slice(-4)}` : 'N/A';
    const ssHash = socialSecurityNumber ? `SS_${socialSecurityNumber.slice(-4)}` : 'N/A';
    console.log('CNAM Verification Request:', { 
      cniHash, 
      ssHash,
      timestamp: new Date().toISOString() 
    });

    // Validation
    if (!cniNumber || !employerName) {
      return new Response(
        JSON.stringify({ error: 'CNI et employeur sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulation de vérification (90% de succès)
    const isValid = Math.random() < 0.90;

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simule délai API

    if (isValid) {
      const employers = [
        'Orange Côte d\'Ivoire',
        'MTN Côte d\'Ivoire',
        'SODECI',
        'CIE',
        'Banque Atlantique',
        'SGI',
        'Air Côte d\'Ivoire'
      ];

      const randomEmployer = employers[Math.floor(Math.random() * employers.length)];
      const estimatedSalary = Math.floor(Math.random() * (1000000 - 200000) + 200000);

      const employmentData = {
        employer: employerName || randomEmployer,
        socialSecurityNumber: socialSecurityNumber || `SS${Math.random().toString().slice(2, 8)}`,
        employmentStatus: 'ACTIVE',
        contributionStatus: 'À JOUR',
        contractType: 'CDI',
        estimatedSalary: estimatedSalary,
        lastContribution: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      // Extract user_id from JWT BEFORE creating service role client
      const tempSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const { data: { user } } = await tempSupabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (!user) throw new Error('Utilisateur non authentifié');

      // Create service role client WITHOUT user JWT
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Upsert dans user_verifications avec creation automatique
      const { error: upsertError } = await supabase
        .from('user_verifications')
        .upsert({
          user_id: user.id,
          cnam_status: 'pending_review',
          cnam_data: employmentData,
          cnam_employer: employerName,
          cnam_social_security_number: socialSecurityNumber,
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ cnam_verified: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      return new Response(
        JSON.stringify({
          verified: true,
          cniNumber,
          employmentInfo: employmentData,
          status: 'PENDING_REVIEW',
          message: 'Vérification soumise. En attente de validation par un administrateur.',
          verifiedAt: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Aucune information CNAM trouvée',
          status: 'FAILED'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in cnam-verification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
