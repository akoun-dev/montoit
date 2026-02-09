import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

    // 1. Valider l'OTP localement
    console.log('1️⃣ Validation de l\'OTP local...');
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('recipient', user.id)
      .eq('purpose', 'verification')
      .eq('code', otp)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (otpError || !otpRecord) {
      console.error('❌ OTP invalide ou expiré');
      return new Response(
        JSON.stringify({ error: 'Code OTP invalide ou expiré', isOtpError: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: On ne vérifie plus otpRecord.used ici pour permettre les réessais en cas d'erreur
    // L'OTP sera marqué comme utilisé uniquement après signature CryptoNeo réussie

    console.log('✅ OTP validé avec succès');

    // 2. Récupérer le certificat de l'utilisateur
    console.log('2️⃣ Récupération du certificat...');
    const { data: certificate } = await supabaseAdmin
      .from('digital_certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!certificate) {
      return new Response(
        JSON.stringify({ error: 'Certificat actif non trouvé. Veuillez générer un certificat d\'abord.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Activate certificate if not already active
    if (certificate.certificate_status !== 'active') {
      await supabaseAdmin
        .from('digital_certificates')
        .update({ certificate_status: 'active' })
        .eq('id', certificate.id);
    }

    // Check if certificate was locally generated (not from CryptoNeo)
    const certificateData = certificate.certificate_data as any;
    if (certificateData?.locallyGenerated || !certificateData?.certificatId) {
      return new Response(
        JSON.stringify({
          error: 'Certificat local non valide pour la signature CryptoNeo. Veuillez régénérer votre certificat.',
          isLocalCertificate: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aliasCertificat = certificateData?.certificatId || certificate.certificate_id;
    console.log('✅ Certificat CryptoNeo trouvé:', aliasCertificat);

    // 4. Get JWT token from auth function
    console.log('3️⃣ Récupération du token CryptoNeo...');
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
    console.log('✅ Token CryptoNeo obtenu');

    // 5. Préparer la requête de signature selon l'API CryptoNeo
    // Note: Nous n'envoyons pas l'OTP à CryptoNeo car nous l'avons déjà validé localement
    const signRequestBody = {
      aliasCertificat,
      otp: '',  // OTP vide car déjà validé localement
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

    console.log('4️⃣ Envoi de la requête de signature à CryptoNeo...');
    console.log('URL:', `${CRYPTONEO_BASE_URL}/sign/signFileBatch`);
    console.log('Request body:', JSON.stringify(signRequestBody, null, 2));

    // 4. Call CryptoNeo signFileBatch API
    let signResponse;
    try {
      signResponse = await fetch(`${CRYPTONEO_BASE_URL}/sign/signFileBatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signRequestBody)
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erreur de connexion à CryptoNeo', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CryptoNeo response status:', signResponse.status);
    console.log('CryptoNeo response ok:', signResponse.ok);

    if (!signResponse.ok) {
      const errorText = await signResponse.text();
      console.error('CryptoNeo signature failed:', errorText);

      let errorJson;
      try {
        errorJson = await signResponse.clone().json();
      } catch {
        errorJson = null;
      }

      console.error('Error JSON:', errorJson);

      // Check if it's an OTP error
      if (signResponse.status === 400 || errorText.includes('OTP') || errorText.includes('8006')) {
        return new Response(
          JSON.stringify({ error: 'Code OTP invalide ou expiré', isOtpError: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Échec de la signature CryptoNeo', details: errorJson || errorText, statusCode: 0 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let signData;
    try {
      signData = await signResponse.json();
    } catch (jsonError) {
      const responseText = await signResponse.text();
      console.error('Failed to parse JSON response:', responseText);
      return new Response(
        JSON.stringify({ error: 'Réponse CryptoNeo invalide', details: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Réponse CryptoNeo:', JSON.stringify(signData));

    // CryptoNeo retourne statusCode 7003 pour succès
    if (!signData || signData.statusCode !== 7003) {
      console.error('Unexpected statusCode:', signData?.statusCode, 'expected: 7003');
      return new Response(
        JSON.stringify({
          error: signData?.statusMessage || 'Échec de la signature',
          statusCode: signData?.statusCode || 0,
          fullResponse: signData
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

    // Marquer l'OTP comme utilisé uniquement après signature réussie
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    console.log('✅ OTP marqué comme utilisé');

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
