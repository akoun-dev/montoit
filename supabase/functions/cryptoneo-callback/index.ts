import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { operationId, status, signedFiles } = await req.json();

    console.log('📥 Callback CryptoNeo reçu:', { operationId, status });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find the lease by operationId
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .select('*')
      .eq('cryptoneo_operation_id', operationId)
      .single();

    if (leaseError || !lease) {
      console.error('Bail non trouvé pour operationId:', operationId);
      return new Response(
        JSON.stringify({ error: 'Bail non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Bail trouvé:', lease.id);

    if (status === 'completed' && signedFiles && signedFiles.length > 0) {
      console.log('📄 Signature réussie, téléchargement du document signé...');

      const signedFile = signedFiles[0];
      
      // 2. Download the signed PDF from CryptoNeo
      const signedPdfResponse = await fetch(signedFile.downloadUrl);
      if (!signedPdfResponse.ok) {
        throw new Error('Échec téléchargement du PDF signé');
      }

      const signedPdfBlob = await signedPdfResponse.blob();
      const signedPdfBuffer = await signedPdfBlob.arrayBuffer();

      // 3. Upload to Supabase Storage
      const fileName = `${lease.id}_signed_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('leases')
        .upload(fileName, signedPdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Erreur upload Storage:', uploadError);
        throw uploadError;
      }

      // 4. Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('leases')
        .getPublicUrl(fileName);

      console.log('✅ Document signé uploadé:', publicUrl);

      // 5. Update lease with signed document
      const { error: updateError } = await supabaseAdmin
        .from('leases')
        .update({
          cryptoneo_signed_document_url: publicUrl,
          cryptoneo_signature_status: 'completed',
          cryptoneo_callback_received_at: new Date().toISOString(),
          is_electronically_signed: true,
          landlord_cryptoneo_signature_at: new Date().toISOString(),
          tenant_cryptoneo_signature_at: new Date().toISOString()
        })
        .eq('id', lease.id);

      if (updateError) {
        console.error('Erreur mise à jour bail:', updateError);
        throw updateError;
      }

      // 6. Create notifications for both parties
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: lease.landlord_id,
          type: 'lease_electronically_signed',
          category: 'lease',
          title: 'Bail signé électroniquement',
          message: 'Le bail a été signé électroniquement avec succès via CryptoNeo.',
          link: `/leases/${lease.id}`
        },
        {
          user_id: lease.tenant_id,
          type: 'lease_electronically_signed',
          category: 'lease',
          title: 'Bail signé électroniquement',
          message: 'Le bail a été signé électroniquement avec succès via CryptoNeo.',
          link: `/leases/${lease.id}`
        }
      ]);

      // 7. Send emails
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: [lease.landlord_id, lease.tenant_id],
          template: 'lease-signed',
          data: {
            leaseId: lease.id,
            signedDocumentUrl: publicUrl
          }
        }
      });

      // 8. Log in audit logs
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: lease.landlord_id,
        action_type: 'lease_electronically_signed',
        target_type: 'lease',
        target_id: lease.id,
        notes: `Signature électronique CryptoNeo réussie - Operation: ${operationId}`
      });

      console.log('✅ Callback traité avec succès pour bail:', lease.id);

    } else if (status === 'failed') {
      console.error('❌ Signature échouée pour operationId:', operationId);

      // Update lease with failed status
      await supabaseAdmin
        .from('leases')
        .update({
          cryptoneo_signature_status: 'failed',
          cryptoneo_callback_received_at: new Date().toISOString()
        })
        .eq('id', lease.id);

      // Create notifications
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: lease.landlord_id,
          type: 'lease_signature_failed',
          category: 'lease',
          title: 'Échec signature électronique',
          message: 'La signature électronique du bail a échoué. Veuillez réessayer.',
          link: `/leases/${lease.id}`
        },
        {
          user_id: lease.tenant_id,
          type: 'lease_signature_failed',
          category: 'lease',
          title: 'Échec signature électronique',
          message: 'La signature électronique du bail a échoué. Veuillez réessayer.',
          link: `/leases/${lease.id}`
        }
      ]);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback traité' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

