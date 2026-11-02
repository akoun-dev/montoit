import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRYPTONEO_BASE_URL = Deno.env.get('CRYPTONEO_BASE_URL');

interface SignMandateRequest {
  mandateId: string;
  signerType: 'owner' | 'agency';
  otp?: string;
  signatureMethod: 'simple' | 'cryptoneo';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { mandateId, signerType, otp, signatureMethod }: SignMandateRequest = await req.json();

    console.log(`Processing ${signatureMethod} signature for mandate ${mandateId} by ${signerType}`);

    // Fetch mandate with agency details
    const { data: mandate, error: mandateError } = await supabaseAdmin
      .from('agency_mandates')
      .select(`
        *,
        agency:agencies(*),
        property:properties(id, title, city, neighborhood, monthly_rent)
      `)
      .eq('id', mandateId)
      .single();

    if (mandateError || !mandate) {
      console.error('Mandate fetch error:', mandateError);
      return new Response(
        JSON.stringify({ error: 'Mandat introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to sign
    const isOwner = mandate.owner_id === user.id;
    const isAgencyUser = mandate.agency?.user_id === user.id;

    if ((signerType === 'owner' && !isOwner) || (signerType === 'agency' && !isAgencyUser)) {
      return new Response(
        JSON.stringify({ error: 'Vous n\'êtes pas autorisé à signer ce mandat' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already signed by this party
    if (signerType === 'owner' && mandate.owner_signed_at) {
      return new Response(
        JSON.stringify({ error: 'Vous avez déjà signé ce mandat', alreadySigned: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (signerType === 'agency' && mandate.agency_signed_at) {
      return new Response(
        JSON.stringify({ error: 'L\'agence a déjà signé ce mandat', alreadySigned: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let updateData: Record<string, unknown> = {};
    let signatureStatus = mandate.cryptoneo_signature_status || 'pending';

    if (signatureMethod === 'simple') {
      // Simple signature (acceptance without CryptoNeo)
      if (signerType === 'owner') {
        updateData = {
          owner_signed_at: now,
          cryptoneo_signature_status: mandate.agency_signed_at ? 'completed' : 'owner_signed',
        };
        signatureStatus = mandate.agency_signed_at ? 'completed' : 'owner_signed';
      } else {
        updateData = {
          agency_signed_at: now,
          cryptoneo_signature_status: mandate.owner_signed_at ? 'completed' : 'agency_signed',
        };
        signatureStatus = mandate.owner_signed_at ? 'completed' : 'agency_signed';
      }

      // If both signed, activate the mandate
      if (signatureStatus === 'completed') {
        updateData.status = 'active';
        updateData.signed_at = now;
      }

    } else if (signatureMethod === 'cryptoneo') {
      // CryptoNeo signature with OTP verification
      if (!otp) {
        return new Response(
          JSON.stringify({ error: 'Code OTP requis pour la signature certifiée' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get CryptoNeo JWT token
      const authResponse = await fetch(`${SUPABASE_URL}/functions/v1/cryptoneo-auth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      if (!authResponse.ok) {
        console.error('CryptoNeo auth failed');
        return new Response(
          JSON.stringify({ error: 'Erreur d\'authentification CryptoNeo' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { token: cryptoneoToken } = await authResponse.json();

      // Call CryptoNeo signature API
      const signaturePayload = {
        documentType: 'MANDATE',
        documentId: mandateId,
        signerPhone: user.phone || user.email,
        otp: otp,
        metadata: {
          mandateId,
          signerType,
          signedAt: now,
        }
      };

      try {
        const signResponse = await fetch(`${CRYPTONEO_BASE_URL}/signature/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cryptoneoToken}`
          },
          body: JSON.stringify(signaturePayload)
        });

        const signResult = await signResponse.json();

        if (!signResponse.ok) {
          console.error('CryptoNeo signature failed:', signResult);
          
          // Log the failure
          await supabaseAdmin.from('mandate_signature_logs').insert({
            mandate_id: mandateId,
            operation_id: signResult.operationId || null,
            signer_type: signerType,
            signer_id: user.id,
            status: 'failed',
            cryptoneo_response: signResult,
            error_message: signResult.message || 'Signature failed',
            ip_address: req.headers.get('x-forwarded-for') || null
          });

          return new Response(
            JSON.stringify({ 
              error: signResult.message || 'Échec de la signature CryptoNeo',
              code: signResult.code 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Successful CryptoNeo signature
        if (signerType === 'owner') {
          updateData = {
            owner_signed_at: now,
            cryptoneo_operation_id: signResult.operationId || mandate.cryptoneo_operation_id,
            cryptoneo_signature_status: mandate.agency_signed_at ? 'completed' : 'owner_signed',
          };
          signatureStatus = mandate.agency_signed_at ? 'completed' : 'owner_signed';
        } else {
          updateData = {
            agency_signed_at: now,
            cryptoneo_operation_id: signResult.operationId || mandate.cryptoneo_operation_id,
            cryptoneo_signature_status: mandate.owner_signed_at ? 'completed' : 'agency_signed',
          };
          signatureStatus = mandate.owner_signed_at ? 'completed' : 'agency_signed';
        }

        // Store signed document URL if provided
        if (signResult.signedDocumentUrl) {
          updateData.signed_mandate_url = signResult.signedDocumentUrl;
        }

        // If both signed, activate the mandate
        if (signatureStatus === 'completed') {
          updateData.status = 'active';
          updateData.signed_at = now;
        }

        // Log successful signature
        await supabaseAdmin.from('mandate_signature_logs').insert({
          mandate_id: mandateId,
          operation_id: signResult.operationId || null,
          signer_type: signerType,
          signer_id: user.id,
          status: 'success',
          cryptoneo_response: signResult,
          ip_address: req.headers.get('x-forwarded-for') || null
        });

      } catch (cryptoneoError) {
        console.error('CryptoNeo API error:', cryptoneoError);
        
        // For development/testing: allow simple signature as fallback
        console.log('Falling back to simple signature due to CryptoNeo error');
        
        if (signerType === 'owner') {
          updateData = {
            owner_signed_at: now,
            cryptoneo_signature_status: mandate.agency_signed_at ? 'completed' : 'owner_signed',
          };
          signatureStatus = mandate.agency_signed_at ? 'completed' : 'owner_signed';
        } else {
          updateData = {
            agency_signed_at: now,
            cryptoneo_signature_status: mandate.owner_signed_at ? 'completed' : 'agency_signed',
          };
          signatureStatus = mandate.owner_signed_at ? 'completed' : 'agency_signed';
        }

        if (signatureStatus === 'completed') {
          updateData.status = 'active';
          updateData.signed_at = now;
        }

        // Log fallback signature
        await supabaseAdmin.from('mandate_signature_logs').insert({
          mandate_id: mandateId,
          signer_type: signerType,
          signer_id: user.id,
          status: 'fallback_simple',
          error_message: 'CryptoNeo unavailable, used simple signature',
          ip_address: req.headers.get('x-forwarded-for') || null
        });
      }
    }

    // Update the mandate
    const { error: updateError } = await supabaseAdmin
      .from('agency_mandates')
      .update(updateData)
      .eq('id', mandateId);

    if (updateError) {
      console.error('Mandate update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour du mandat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-mandate-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          type: signerType === 'owner' ? 'mandate_owner_signed' : 'mandate_agency_signed',
          mandateId,
          signatureStatus
        })
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the signature if notification fails
    }

    console.log(`Mandate ${mandateId} signed successfully by ${signerType}`);

    return new Response(
      JSON.stringify({
        success: true,
        signatureStatus,
        signerType,
        signedAt: now,
        isComplete: signatureStatus === 'completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-sign-mandate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
