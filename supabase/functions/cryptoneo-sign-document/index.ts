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
    const { leaseId, userType } = await req.json();

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
    const pdfPath = lease.document_url.split('/').pop();
    const { data: pdfBlob, error: downloadError } = await supabaseAdmin.storage
      .from('lease-documents')
      .download(pdfPath);

    if (downloadError || !pdfBlob) {
      console.error('Error downloading PDF:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Échec téléchargement du PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Convert PDF to base64
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64File = btoa(String.fromCharCode(...bytes));

    // 5. Calculate hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashFile = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 6. Get JWT token
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-auth`, {
      headers: { Authorization: req.headers.get('Authorization')! }
    });
    const { token: jwt } = await authResponse.json();

    // 7. Call CryptoNeo sign API
    const signResponse = await fetch(`${CRYPTONEO_BASE_URL}/sign/signPdfBatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        certificatId: certificate.data.certificate_id,
        hashFile,
        base64File,
        fileName: `bail_${leaseId}_${userType}.pdf`,
        signReason: `Signature électronique ${userType === 'landlord' ? 'du propriétaire' : 'du locataire'}`,
        location: lease.properties?.city || 'Abidjan'
      })
    });

    if (!signResponse.ok) {
      const error = await signResponse.text();
      console.error('CryptoNeo signature failed:', error);
      return new Response(
        JSON.stringify({ error: 'Échec signature CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signData = await signResponse.json();
    const operationId = signData.operationId;

    // 8. Update lease
    const updateField = userType === 'landlord' 
      ? 'landlord_signature_operation_id' 
      : 'tenant_signature_operation_id';
    
    const timestampField = `${userType}_cryptoneo_signature_at`;

    await supabaseAdmin
      .from('leases')
      .update({
        [updateField]: operationId,
        [timestampField]: new Date().toISOString()
      })
      .eq('id', leaseId);

    // 9. Log operation
    await supabaseAdmin
      .from('electronic_signature_logs')
      .insert({
        lease_id: leaseId,
        user_id: user.id,
        operation_id: operationId,
        signature_type: userType,
        status: 'in_progress',
        cryptoneo_response: signData
      });

    // 10. Trigger async verification after 30s
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

    console.log('Signature initiated:', operationId);

    return new Response(
      JSON.stringify({ 
        success: true,
        operationId
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
