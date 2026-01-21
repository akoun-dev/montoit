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
    const { leaseId, otp } = await req.json();

    if (!otp) {
      return new Response(
        JSON.stringify({ error: 'Code OTP requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔐 Signature électronique CryptoNeo pour bail:', leaseId);

    // 1. Verify lease and signatures
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

    if (!lease.landlord_signed_at || !lease.tenant_signed_at) {
      return new Response(
        JSON.stringify({ error: 'Les deux parties doivent avoir signé (signature simple) d\'abord' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lease.document_url) {
      return new Response(
        JSON.stringify({ error: 'Le PDF du bail doit être généré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify or auto-generate certificate
    let certificate = await supabaseAdmin
      .from('digital_certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('certificate_status', 'active')
      .maybeSingle();

    if (!certificate.data) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('oneci_verified')
        .eq('id', user.id)
        .single();

      if (profile?.oneci_verified) {
        console.log('Auto-generating certificate for user:', user.id);
        const genResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-generate-certificate`, {
          method: 'POST',
          headers: { Authorization: req.headers.get('Authorization')! }
        });
        
        if (!genResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Échec génération automatique du certificat' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        certificate = await supabaseAdmin
          .from('digital_certificates')
          .select('*')
          .eq('user_id', user.id)
          .single();
      } else {
        return new Response(
          JSON.stringify({ error: 'Certificat actif requis. Vérification ONECI nécessaire.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Download PDF from storage
    let pdfBlob;
    const pdfPath = lease.document_url;

    // Handle both full URLs and relative paths
    if (pdfPath.includes('http')) {
      // Full URL - download directly
      const pdfResponse = await fetch(pdfPath);
      if (!pdfResponse.ok) {
        throw new Error('Échec téléchargement du PDF depuis URL');
      }
      pdfBlob = await pdfResponse.blob();
    } else {
      // Relative path - download from storage
      const pathParts = pdfPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      const { data: downloadedBlob, error: downloadError } = await supabaseAdmin.storage
        .from('lease-documents')
        .download(fileName);

      if (downloadError || !downloadedBlob) {
        console.error('Error downloading PDF:', downloadError);
        return new Response(
          JSON.stringify({ error: 'Échec téléchargement du PDF' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      pdfBlob = downloadedBlob;
    }

    // 4. Get JWT token
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-auth`, {
      headers: { Authorization: req.headers.get('Authorization')! }
    });
    
    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Échec authentification CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token: jwt } = await authResponse.json();

    // 5. Prepare multipart/form-data for CryptoNeo
    const formData = new FormData();
    formData.append('files', pdfBlob, `bail_${leaseId}.pdf`);
    formData.append('certificateId', certificate.data.certificate_id);
    formData.append('otp', otp);
    formData.append('callbackUrl', `${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-callback`);

    console.log('📤 Envoi de la requête de signature à CryptoNeo...');

    // 6. Call CryptoNeo sign API
    const signResponse = await fetch(`${CRYPTONEO_BASE_URL}/sign/signFileBatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
        // Note: Ne pas définir Content-Type, FormData le fait automatiquement
      },
      body: formData
    });

    if (!signResponse.ok) {
      const error = await signResponse.text();
      console.error('CryptoNeo signature failed:', error);
      
      // Check if it's an OTP error
      if (error.includes('OTP') || error.includes('8006')) {
        return new Response(
          JSON.stringify({ error: 'Code OTP invalide ou expiré' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Échec signature CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signData = await signResponse.json();
    
    if (signData.statusCode !== 7004) {
      return new Response(
        JSON.stringify({ error: signData.statusMessage || 'Échec signature' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const operationId = signData.data?.operationId;
    
    if (!operationId) {
      return new Response(
        JSON.stringify({ error: 'Operation ID manquant dans la réponse CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Signature initiée avec succès. Operation ID:', operationId);

    // 7. Update lease with operation ID
    await supabaseAdmin
      .from('leases')
      .update({
        cryptoneo_operation_id: operationId,
        cryptoneo_signature_status: 'processing'
      })
      .eq('id', leaseId);

    // 8. Create notification
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: lease.landlord_id,
        type: 'lease_signature_processing',
        category: 'lease',
        title: 'Signature en cours',
        message: 'La signature électronique du bail est en cours de traitement.',
        link: `/leases/${leaseId}`
      },
      {
        user_id: lease.tenant_id,
        type: 'lease_signature_processing',
        category: 'lease',
        title: 'Signature en cours',
        message: 'La signature électronique du bail est en cours de traitement.',
        link: `/leases/${leaseId}`
      }
    ]);

    // 9. Log in audit logs
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action_type: 'lease_signature_initiated',
      target_type: 'lease',
      target_id: leaseId,
      notes: `Signature électronique CryptoNeo initiée - Operation: ${operationId}`
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        operationId,
        message: 'Signature en cours de traitement. Vous serez notifié une fois terminée.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-sign-document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

