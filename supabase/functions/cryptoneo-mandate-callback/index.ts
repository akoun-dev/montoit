import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CryptoNeoCallback {
  operationId: string;
  status: 'completed' | 'failed' | 'expired';
  signedDocumentUrl?: string;
  signedDocumentBase64?: string;
  certificateUrl?: string;
  metadata?: {
    mandateId?: string;
    signerType?: string;
    signedAt?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const callback: CryptoNeoCallback = await req.json();
    
    console.log('Received CryptoNeo callback:', JSON.stringify(callback));

    if (!callback.operationId) {
      return new Response(
        JSON.stringify({ error: 'Missing operationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the mandate by operation ID
    const { data: mandate, error: findError } = await supabaseAdmin
      .from('agency_mandates')
      .select('*')
      .eq('cryptoneo_operation_id', callback.operationId)
      .single();

    if (findError || !mandate) {
      console.error('Mandate not found for operation:', callback.operationId);
      
      // Log the callback even if mandate not found
      await supabaseAdmin.from('mandate_signature_logs').insert({
        mandate_id: callback.metadata?.mandateId || null,
        operation_id: callback.operationId,
        signer_type: callback.metadata?.signerType || 'unknown',
        signer_id: '00000000-0000-0000-0000-000000000000', // System
        status: 'callback_mandate_not_found',
        cryptoneo_response: callback,
        ip_address: req.headers.get('x-forwarded-for') || null
      });

      return new Response(
        JSON.stringify({ error: 'Mandate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (callback.status === 'completed') {
      // Handle successful signature
      let signedDocumentUrl = callback.signedDocumentUrl;

      // If we have base64 document, upload to storage
      if (callback.signedDocumentBase64 && !signedDocumentUrl) {
        try {
          const documentBuffer = Uint8Array.from(
            atob(callback.signedDocumentBase64),
            c => c.charCodeAt(0)
          );

          const filePath = `${mandate.id}/mandat-signe-${Date.now()}.pdf`;
          
          const { error: uploadError } = await supabaseAdmin.storage
            .from('mandate-documents')
            .upload(filePath, documentBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
          } else {
            const { data: urlData } = supabaseAdmin.storage
              .from('mandate-documents')
              .getPublicUrl(filePath);
            
            signedDocumentUrl = urlData.publicUrl;
          }
        } catch (uploadErr) {
          console.error('Error uploading signed document:', uploadErr);
        }
      }

      updateData.signed_mandate_url = signedDocumentUrl || mandate.signed_mandate_url;
      updateData.cryptoneo_signature_status = 'completed';
      updateData.status = 'active';
      updateData.signed_at = new Date().toISOString();

    } else if (callback.status === 'failed') {
      updateData.cryptoneo_signature_status = 'failed';
      
    } else if (callback.status === 'expired') {
      updateData.cryptoneo_signature_status = 'expired';
    }

    // Update the mandate
    const { error: updateError } = await supabaseAdmin
      .from('agency_mandates')
      .update(updateData)
      .eq('id', mandate.id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Log the callback
    await supabaseAdmin.from('mandate_signature_logs').insert({
      mandate_id: mandate.id,
      operation_id: callback.operationId,
      signer_type: callback.metadata?.signerType || 'callback',
      signer_id: mandate.owner_id, // Use owner as default
      status: `callback_${callback.status}`,
      cryptoneo_response: callback,
      ip_address: req.headers.get('x-forwarded-for') || null
    });

    // Send notification
    if (callback.status === 'completed') {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-mandate-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            type: 'mandate_signature_completed',
            mandateId: mandate.id,
            signedDocumentUrl: updateData.signed_mandate_url
          })
        });
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }

    console.log(`Callback processed for mandate ${mandate.id}: ${callback.status}`);

    return new Response(
      JSON.stringify({ success: true, mandateId: mandate.id, status: callback.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-mandate-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
