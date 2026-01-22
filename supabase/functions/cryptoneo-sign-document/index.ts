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
    const { documents, otp, callbackUrl } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Documents requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('🔐 Signature électronique CryptoNeo pour user:', user.id);

    // 1. Récupérer le certificat de l'utilisateur
    const { data: certificate } = await supabaseAdmin
      .from('digital_certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('certificate_status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!certificate) {
      return new Response(
        JSON.stringify({ error: 'Certificat actif non trouvé. Veuillez générer un certificat d\'abord.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aliasCertificat = certificate.data?.certificate_id || certificate.certificate_id;

    // 2. Get JWT token from auth function
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

    // 3. Préparer la requête de signature selon l'API CryptoNeo
    const signRequestBody = {
      aliasCertificat,
      otp,
      callBackUrl: callbackUrl || `${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-callback`,
      signRequest: documents.map((doc: any) => ({
        codeDoc: doc.codeDoc,
        urlDoc: doc.urlDoc,
        hashDoc: doc.hashDoc,
        visibiliteImage: doc.visibiliteImage ?? true,
        urlImage: doc.urlImage,
        hashImage: doc.hashImage,
        pageImage: doc.pageImage ?? 1,
        positionImage: doc.positionImage || '150,200',
        messageImage: doc.messageImage ?? true,
        lieuSignature: doc.lieuSignature || 'Abidjan',
        motifSignature: doc.motifSignature || 'Signature électronique',
      }))
    };

    console.log('📤 Envoi de la requête de signature à CryptoNeo...');

    // 4. Call CryptoNeo signFileBatch API
    const signResponse = await fetch(`${CRYPTONEO_BASE_URL}/sign/signFileBatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signRequestBody)
    });

    if (!signResponse.ok) {
      const error = await signResponse.text();
      console.error('CryptoNeo signature failed:', error);

      // Check if it's an OTP error
      if (signResponse.status === 400 || error.includes('OTP') || error.includes('8006')) {
        return new Response(
          JSON.stringify({ error: 'Code OTP invalide ou expiré', isOtpError: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Échec de la signature CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signData = await signResponse.json();
    console.log('Réponse CryptoNeo:', signData);

    // CryptoNeo retourne statusCode 7003 pour succès
    if (signData.statusCode !== 7003) {
      return new Response(
        JSON.stringify({
          error: signData.statusMessage || 'Échec de la signature',
          statusCode: signData.statusCode
        }),
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

    // 5. Store operation ID in database for tracking
    // Pour les contrats (lease_contracts table)
    const firstDocId = documents[0]?.codeDoc;
    if (firstDocId) {
      await supabaseAdmin
        .from('lease_contracts')
        .update({
          cryptoneo_operation_id: operationId,
          cryptoneo_signature_status: 'processing',
          cryptoneo_initiated_at: new Date().toISOString(),
        })
        .eq('id', firstDocId);
    }

    // 6. Create notification
    if (firstDocId) {
      const { data: contract } = await supabaseAdmin
        .from('lease_contracts')
        .select('owner_id, tenant_id')
        .eq('id', firstDocId)
        .single();

      if (contract) {
        await supabaseAdmin.from('notifications').insert([
          {
            user_id: contract.owner_id,
            type: 'contract_signature_processing',
            category: 'contract',
            title: 'Signature en cours',
            message: 'La signature électronique du contrat est en cours de traitement.',
            link: `/proprietaire/mes-contrats/${firstDocId}`
          },
          {
            user_id: contract.tenant_id,
            type: 'contract_signature_processing',
            category: 'contract',
            title: 'Signature en cours',
            message: 'La signature électronique du contrat est en cours de traitement.',
            link: `/locataire/mes-contrats/${firstDocId}`
          }
        ]);
      }
    }

    // 7. Log in audit logs
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action_type: 'contract_signature_initiated',
      target_type: 'lease_contract',
      target_id: firstDocId || 'unknown',
      notes: `Signature électronique CryptoNeo initiée - Operation: ${operationId}`
    });

    return new Response(
      JSON.stringify({
        statusCode: 7003,
        statusMessage: 'Signature en cours de traitement',
        data: {
          operationId
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
// Force redeploy
