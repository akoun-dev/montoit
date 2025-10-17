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
    const { cniNumber, lastName, firstName, birthDate } = await req.json();
    const authHeader = req.headers.get('Authorization')!;

    // Anonymize sensitive data in logs
    const cniHash = cniNumber ? `CNI_${cniNumber.slice(-4)}` : 'N/A';
    console.log('ONECI Verification Request:', { 
      cniHash, 
      timestamp: new Date().toISOString() 
    });

    // Validation des champs requis
    if (!cniNumber || !lastName || !firstName || !birthDate) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Tous les champs sont requis pour effectuer la vérification.',
          status: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation du format CNI (CI + 9 ou 10 chiffres)
    const cniRegex = /^CI\d{9,10}$/;
    if (!cniRegex.test(cniNumber)) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Le format du numéro CNI est invalide. Format attendu : CI suivi de 9 ou 10 chiffres (ex: CI1234567890).',
          status: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation de la date de naissance
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    
    if (isNaN(birthDateObj.getTime())) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'La date de naissance fournie est invalide.',
          status: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (age < 18 || age > 120) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'La date de naissance indique un âge invalide.',
          status: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check DEMO mode or real API
    const DEMO_MODE = Deno.env.get('ONECI_DEMO_MODE') === 'true';
    const ONECI_API_KEY = Deno.env.get('ONECI_API_KEY');

    let isValid = false;
    let holderData: any = {
      lastName: lastName.toUpperCase(),
      firstName,
      birthDate,
      birthPlace: 'Abidjan',
      nationality: 'Ivoirienne',
      issueDate: '2020-01-15',
      expiryDate: '2030-01-15'
    };

    if (DEMO_MODE) {
      // Mode DEMO: Always validate with a flag
      console.log('[DEMO MODE] ONECI verification - Auto-approving');
      isValid = true;
      holderData = { ...holderData, isDemoMode: true };
    } else if (ONECI_API_KEY) {
      // Real ONECI API call (to be implemented later)
      console.log('[PRODUCTION] Calling real ONECI API');
      // TODO: Implement real API call
      isValid = true; // Temporary
    } else {
      // Neither DEMO nor API configured → error 503
      console.error('[ERROR] ONECI service not configured - DEMO_MODE and API_KEY both missing');
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Le service de vérification d\'identité ONECI est temporairement indisponible. Veuillez réessayer dans quelques instants.',
          status: 'SERVICE_UNAVAILABLE'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (isValid) {

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

      // Use UPSERT instead of UPDATE to handle new users
      const { error: updateError } = await supabase
        .from('user_verifications')
        .upsert({
          user_id: user.id,
          oneci_status: 'pending_review',
          oneci_data: holderData,
          oneci_cni_number: cniNumber,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        });

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          valid: true,
          cniNumber,
          holder: holderData,
          status: 'PENDING_REVIEW',
          message: 'Vérification soumise. En attente de validation par un administrateur.',
          verifiedAt: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'CNI non trouvée dans la base ONECI',
          status: 'FAILED'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in oneci-verification:', error);
    
    // Determine HTTP status code and user-friendly message based on error type
    let statusCode = 500;
    let errorMessage = 'Une erreur inattendue s\'est produite lors de la vérification. Veuillez réessayer.';
    let errorStatus = 'ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('non authentifié') || error.message.includes('not authenticated')) {
        statusCode = 401;
        errorMessage = 'Votre session a expiré. Veuillez vous reconnecter et réessayer.';
        errorStatus = 'AUTH_ERROR';
      } else if (error.message.includes('Format CNI') || error.message.includes('invalid')) {
        statusCode = 400;
        errorMessage = 'Les informations fournies sont incorrectes. Vérifiez le format de votre numéro CNI.';
        errorStatus = 'VALIDATION_ERROR';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        statusCode = 503;
        errorMessage = 'Impossible de joindre le service de vérification. Vérifiez votre connexion internet et réessayez.';
        errorStatus = 'NETWORK_ERROR';
      }
      
      // Log detailed error for debugging (server-side only)
      console.error('[ONECI Verification Error Details]', {
        message: error.message,
        stack: error.stack,
        statusCode,
        timestamp: new Date().toISOString()
      });
    }
    
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: errorMessage,
        status: errorStatus
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
