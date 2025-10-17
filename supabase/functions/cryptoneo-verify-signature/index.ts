import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRYPTONEO_BASE_URL = Deno.env.get('CRYPTONEO_BASE_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leaseId, operationId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get lease
    const { data: lease } = await supabaseAdmin
      .from('leases')
      .select('*, properties(city)')
      .eq('id', leaseId)
      .single();

    if (!lease) {
      return new Response(
        JSON.stringify({ error: 'Bail non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get JWT token
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-auth`, {
      headers: { 
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });
    const { token: jwt } = await authResponse.json();

    // 3. Verify signature status
    const verifyResponse = await fetch(`${CRYPTONEO_BASE_URL}/sign/verifySignedBatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operationId })
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.text();
      console.error('CryptoNeo verification failed:', error);
      
      await supabaseAdmin
        .from('electronic_signature_logs')
        .update({ 
          status: 'failed',
          error_message: error
        })
        .eq('operation_id', operationId);

      return new Response(
        JSON.stringify({ error: 'Échec vérification signature' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifyData = await verifyResponse.json();
    const { status, signedPdfBase64, error } = verifyData;

    if (status === 'completed' && signedPdfBase64) {
      console.log('Signature completed, storing signed PDF');

      // 4. Convert base64 to Blob
      const binaryString = atob(signedPdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });

      // 5. Upload to storage
      const fileName = `leases/signed/${leaseId}.pdf`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('lease-documents')
        .upload(fileName, pdfBlob, { upsert: true });

      if (uploadError) {
        console.error('Error uploading signed PDF:', uploadError);
        throw uploadError;
      }

      // 6. Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('lease-documents')
        .getPublicUrl(fileName);

      // 7. Update lease
      await supabaseAdmin
        .from('leases')
        .update({
          signed_document_url: urlData.publicUrl,
          is_electronically_signed: true
        })
        .eq('id', leaseId);

      // 8. Update log
      await supabaseAdmin
        .from('electronic_signature_logs')
        .update({
          status: 'completed',
          cryptoneo_response: { status, signedPdfStored: true },
          updated_at: new Date().toISOString()
        })
        .eq('operation_id', operationId);

      // 9. Notify both parties
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: lease.landlord_id,
          type: 'signature_completed',
          category: 'lease',
          title: 'Signature électronique complétée',
          message: 'Le bail a été signé électroniquement par les deux parties.',
          link: '/leases'
        },
        {
          user_id: lease.tenant_id,
          type: 'signature_completed',
          category: 'lease',
          title: 'Signature électronique complétée',
          message: 'Le bail a été signé électroniquement par les deux parties.',
          link: '/leases'
        }
      ]);

      console.log('Electronic signature completed for lease:', leaseId);

      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'completed',
          signedDocumentUrl: urlData.publicUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (status === 'in_progress') {
      console.log('Signature still in progress, will retry');

      // Retry after 30s
      setTimeout(async () => {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-verify-signature`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ leaseId, operationId })
        });
      }, 30000);

      return new Response(
        JSON.stringify({ status: 'in_progress' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (status === 'failed') {
      console.error('Signature failed:', error);

      await supabaseAdmin
        .from('electronic_signature_logs')
        .update({
          status: 'failed',
          error_message: error || 'Signature failed'
        })
        .eq('operation_id', operationId);

      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: error || 'Signature failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-verify-signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
