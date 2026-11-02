import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import edgeLogger from '../_shared/logger.ts';
import type { CNAMRequest, CNAMVerificationResult } from '../_shared/types/verification.types.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      verificationId,
      cnamNumber,
      firstName,
      lastName,
      userId
    } = await req.json() as CNAMRequest;

    if (!verificationId || !cnamNumber || !firstName || !lastName || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    edgeLogger.info('CNAM verification started', { verificationId, userId });

    const apiKeys = await supabaseClient.rpc('get_api_keys', { service: 'cnam' });

    if (!apiKeys.data || !apiKeys.data.api_key || !apiKeys.data.api_url) {
      await supabaseClient
        .from('cnam_verifications')
        .update({
          status: 'rejected',
          cnam_response: { error: 'API CNAM non configurée' }
        })
        .eq('id', verificationId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service CNAM temporairement indisponible. Votre vérification sera traitée plus tard.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${apiKeys.data.api_url}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeys.data.api_key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        cnam_number: cnamNumber,
        first_name: firstName,
        last_name: lastName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      
      await supabaseClient
        .from('cnam_verifications')
        .update({
          status: 'rejected',
          cnam_response: error
        })
        .eq('id', verificationId);

      throw new Error(error.message || 'CNAM verification failed');
    }

    const result = await response.json() as CNAMVerificationResult;
    const isVerified = result.verified === true || result.status === 'active';

    await supabaseClient
      .from('cnam_verifications')
      .update({
        status: isVerified ? 'verified' : 'rejected',
        insured_name: result.full_name || `${firstName} ${lastName}`,
        policy_status: result.status || result.policy_status,
        cnam_response: result,
        verified_at: isVerified ? new Date().toISOString() : null
      })
      .eq('id', verificationId);

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'cnam',
      p_action: 'verify_cnam',
      p_status: 'success',
      p_request_data: { cnamNumber, verificationId },
      p_response_data: result,
      p_user_id: userId
    });

    edgeLogger.info('CNAM verification completed', { 
      verificationId, 
      userId, 
      isVerified 
    });

    return new Response(
      JSON.stringify({
        success: true,
        verified: isVerified,
        data: {
          fullName: result.full_name || `${firstName} ${lastName}`,
          affiliationNumber: result.affiliation_number,
          affiliationDate: result.affiliation_date,
          status: result.status || result.policy_status,
          employer: result.employer,
          isActive: result.is_active || isVerified
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    edgeLogger.error('CNAM verification error', error instanceof Error ? error : undefined, { errorMessage });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'cnam',
      p_action: 'verify_cnam',
      p_status: 'error',
      p_error_message: errorMessage
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
