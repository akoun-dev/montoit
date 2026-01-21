import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import edgeLogger from '../_shared/logger.ts';
import type { 
  SignatureRequest, 
  LeaseSignatureUpdate,
  CryptoNeoSignResult,
  CryptoNeoCertificateResult
} from '../_shared/types/verification.types.ts';

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

    const requestData = await req.json() as SignatureRequest;
    const { action, userId } = requestData;

    if (!action || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    edgeLogger.info('CryptoNeo signature request', { action, userId });

    const apiKeys = await supabaseClient.rpc('get_api_keys', { service: 'cryptoneo' });

    if (!apiKeys.data || !apiKeys.data.api_key || !apiKeys.data.api_url) {
      throw new Error('CryptoNeo API not configured');
    }

    const cryptoneoApiUrl = apiKeys.data.api_url as string;
    const cryptoneoApiKey = apiKeys.data.api_key as string;

    switch (action) {
      case 'request_certificate': {
        const { phoneNumber, email, fullName } = requestData;
        
        if (!phoneNumber || !email || !fullName) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields for certificate request' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${cryptoneoApiUrl}/certificates/request`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cryptoneoApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            full_name: fullName,
            email: email,
            phone_number: phoneNumber,
            certificate_type: 'signing',
            validity_days: 365
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Certificate request failed');
        }

        const result = await response.json() as CryptoNeoCertificateResult;

        await supabaseClient
          .from('digital_certificates')
          .insert({
            user_id: userId,
            certificate_id: result.certificate_id,
            status: 'pending_activation',
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            certificate_data: result
          });

        await supabaseClient.rpc('log_api_usage', {
          p_service_name: 'cryptoneo',
          p_action: 'request_certificate',
          p_status: 'success',
          p_user_id: userId
        });

        edgeLogger.info('Certificate requested successfully', { userId, certificateId: result.certificate_id });

        return new Response(
          JSON.stringify({
            success: true,
            certificateId: result.certificate_id,
            message: 'Certificate requested successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify_otp': {
        const { otpCode, leaseId } = requestData;
        
        if (!otpCode || !leaseId) {
          return new Response(
            JSON.stringify({ error: 'Missing OTP code or lease ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${cryptoneoApiUrl}/otp/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cryptoneoApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            otp_code: otpCode,
            document_id: leaseId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'OTP verification failed');
        }

        const result = await response.json() as { verified: boolean };

        const { data: lease } = await supabaseClient
          .from('leases')
          .select('landlord_id, tenant_id')
          .eq('id', leaseId)
          .single();

        if (lease) {
          const isLandlord = lease.landlord_id === userId;
          const updateField = isLandlord ? 'landlord_otp_verified_at' : 'tenant_otp_verified_at';

          await supabaseClient
            .from('leases')
            .update({ [updateField]: new Date().toISOString() })
            .eq('id', leaseId);

          await supabaseClient
            .from('signature_history')
            .insert({
              lease_id: leaseId,
              user_id: userId,
              action: 'otp_verified',
              otp_code: otpCode,
              metadata: { verified_at: new Date().toISOString() }
            });
        }

        edgeLogger.info('OTP verified successfully', { userId, leaseId });

        return new Response(
          JSON.stringify({
            success: true,
            verified: result.verified,
            message: 'OTP verified successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sign_document': {
        const { leaseId, documentUrl } = requestData;
        
        if (!leaseId || !documentUrl) {
          return new Response(
            JSON.stringify({ error: 'Missing lease ID or document URL' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: certificate } = await supabaseClient
          .from('digital_certificates')
          .select('certificate_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!certificate) {
          return new Response(
            JSON.stringify({ error: 'No active certificate found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${cryptoneoApiUrl}/documents/sign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cryptoneoApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            certificate_id: certificate.certificate_id,
            document_url: documentUrl,
            document_id: leaseId,
            signature_type: 'advanced',
            include_timestamp: true
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Document signing failed');
        }

        const result = await response.json() as CryptoNeoSignResult;

        const { data: lease } = await supabaseClient
          .from('leases')
          .select('landlord_id, tenant_id, tenant_signed_at')
          .eq('id', leaseId)
          .single();

        if (lease) {
          const isLandlord = lease.landlord_id === userId;
          const isTenant = lease.tenant_id === userId;

          const updates: LeaseSignatureUpdate = {
            signature_timestamp: result.timestamp,
            signed_pdf_url: result.signed_document_url
          };

          if (isTenant) {
            updates.tenant_signature = result.signature_id;
            updates.tenant_signed_at = new Date().toISOString();
            updates.tenant_certificate_id = certificate.certificate_id;
            updates.status = 'en_attente_signature';
          } else if (isLandlord) {
            updates.landlord_signature = result.signature_id;
            updates.landlord_signed_at = new Date().toISOString();
            updates.landlord_certificate_id = certificate.certificate_id;
            
            if (lease.tenant_signed_at) {
              updates.status = 'actif';
            }
          }

          await supabaseClient
            .from('leases')
            .update(updates)
            .eq('id', leaseId);

          await supabaseClient
            .from('signature_history')
            .insert({
              lease_id: leaseId,
              user_id: userId,
              action: 'document_signed',
              signature_type: 'advanced',
              certificate_id: certificate.certificate_id,
              metadata: result
            });
        }

        await supabaseClient.rpc('log_api_usage', {
          p_service_name: 'cryptoneo',
          p_action: 'sign_document',
          p_status: 'success',
          p_user_id: userId
        });

        edgeLogger.info('Document signed successfully', { userId, leaseId, signatureId: result.signature_id });

        return new Response(
          JSON.stringify({
            success: true,
            signatureId: result.signature_id,
            signedDocumentUrl: result.signed_document_url,
            timestamp: result.timestamp,
            message: 'Document signed successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_certificate': {
        const { data: certificates } = await supabaseClient
          .from('digital_certificates')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        return new Response(
          JSON.stringify({
            success: true,
            certificates: certificates || []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    edgeLogger.error('CryptoNeo signature error', error instanceof Error ? error : undefined, { errorMessage });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'cryptoneo',
      p_action: 'error',
      p_status: 'error',
      p_error_message: errorMessage
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
