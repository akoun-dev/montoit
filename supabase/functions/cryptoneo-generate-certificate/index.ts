import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const CRYPTONEO_BASE_URL = Deno.env.get('CRYPTONEO_BASE_URL');

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== cryptoneo-generate-certificate called ===');

  try {
    console.log('Step 1: Checking environment variables');
    console.log('CRYPTONEO_BASE_URL:', CRYPTONEO_BASE_URL ? 'Set' : 'NOT SET');

    if (!CRYPTONEO_BASE_URL) {
      return new Response(
        JSON.stringify({ error: 'CRYPTONEO_BASE_URL environment variable not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Step 2: Authenticating user');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('User authenticated:', user.id);

    console.log('Step 3: Getting request body');
    // Get request body with signature data
    const requestData = await req.json();
    console.log('Request data received:', JSON.stringify({
      ...requestData,
      base64: requestData.base64 ? `[${requestData.base64?.length} chars]` : undefined
    }));
    console.log('genre:', requestData.genre, 'type:', typeof requestData.genre);
    console.log('dateConsentement:', requestData.dateConsentement, 'type:', typeof requestData.dateConsentement);
    console.log('consentement:', requestData.consentement, 'type:', typeof requestData.consentement);
    console.log('base64 present:', !!requestData.base64, 'length:', requestData.base64?.length);

    console.log('Step 4: Getting user profile');
    // 1. Get profile data

    // 1. Get profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single();

    if (!profile) {
      console.error('Profile not found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Profil non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Profile found:', profile.full_name);

    console.log('Step 5: Getting ONECI data (optional)');
    // 2. Try to get ONECI data (optional)
    const { data: verification } = await supabaseClient
      .from('user_verifications')
      .select('oneci_cni_number, oneci_data')
      .eq('user_id', user.id)
      .maybeSingle();

    // Use the base64 photo from request if provided, otherwise try to get from ONECI
    const base64Photo = requestData.base64;

    // IMPORTANT: hashPiece must be the hash of the photo (binary file) as per CryptoNeo documentation
    // The frontend calculates the hash from the binary file before converting to base64
    let hashPiece: string;

    // Use photo hash from frontend if provided (already calculated from binary)
    if (requestData.photoHash) {
      hashPiece = requestData.photoHash;
      console.log('Using photo hash from frontend (binary file hash):', hashPiece.substring(0, 16) + '...');
    } else {
      // Fallback: calculate hash from base64 (less ideal but works for backward compatibility)
      if (base64Photo) {
        // Decode base64 to binary and calculate hash
        const binaryString = atob(base64Photo);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const hashBuffer = await crypto.subtle.digest('SHA-256', bytes.buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('Calculated hash from base64 photo:', hashPiece.substring(0, 16) + '...');
      } else {
        // Last resort: use CNI number or email as fallback (not ideal)
        if (verification?.oneci_data) {
          const oneciData = verification.oneci_data as any;
          const cniNumber = verification.oneci_cni_number || oneciData.cni_number || oneciData.oneci_cni_number;
          if (cniNumber) {
            const encoder = new TextEncoder();
            const data = encoder.encode(cniNumber);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('WARNING: Using CNI hash as fallback (no photo)');
          } else {
            const encoder = new TextEncoder();
            const data = encoder.encode(user.email || '');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('WARNING: Using email hash as fallback (no photo, no CNI)');
          }
        } else {
          const encoder = new TextEncoder();
          const data = encoder.encode(user.email || '');
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          console.log('WARNING: Using email hash as fallback (no photo, no ONECI data)');
        }
      }
    }

    console.log('Step 6: Getting JWT token from auth function');
    // 3. Get JWT token from auth function
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-auth`, {
      headers: { Authorization: req.headers.get('Authorization')! }
    });
    
    if (!authResponse.ok) {
      console.error('Auth response not OK:', authResponse.status, authResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Échec authentification CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token: jwt } = await authResponse.json();
    console.log('JWT token obtained successfully');

    console.log('Step 7: Preparing certificate data');
    console.log('Profile data:', JSON.stringify(profile));
    console.log('User email:', user.email);
    console.log('Has base64Photo:', !!base64Photo);

    // 4. Prepare certificate data
    const nameParts = profile.full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    console.log('Parsed firstName:', firstName, 'lastName:', lastName);

    // 5. Call CryptoNeo API
    const requestBody: any = {
      firstName,
      lastName,
      email: user.email,
      phone: profile.phone,
      organisation: 'CRYPTONEO', // IMPORTANT: doit être "CRYPTONEO" selon la doc
      typePiece: 'CNI',
      hashPiece,
      // IMPORTANT: CryptoNeo attend ces noms exacts
      gender: requestData.genre, // 'genre' du frontend -> 'gender' pour CryptoNeo
      consent: requestData.consentement ?? true, // 'consentement' du frontend -> 'consent' pour CryptoNeo
      consentDate: requestData.dateConsentement, // 'dateConsentement' du frontend -> 'consentDate' pour CryptoNeo
    };

    // Include base64 if provided (required by CryptoNeo)
    if (base64Photo) {
      requestBody.base64 = base64Photo;
    }

    console.log('Step 8: Calling CryptoNeo API');
    console.log('Request body:', JSON.stringify({
      ...requestBody,
      base64: base64Photo ? `[${base64Photo.length} chars]` : undefined,
      hashPiece: hashPiece ? `${hashPiece.substring(0, 8)}...` : undefined
    }));
    console.log('CryptoNeo URL:', `${CRYPTONEO_BASE_URL}/generateCert/generateCertificat`);

    const cryptoneoResponse = await fetch(`${CRYPTONEO_BASE_URL}/generateCert/generateCertificat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!cryptoneoResponse.ok) {
      const errorText = await cryptoneoResponse.text();
      const errorJson = await cryptoneoResponse.json().catch(() => null);
      console.error('CryptoNeo certificate generation failed:', {
        status: cryptoneoResponse.status,
        statusText: cryptoneoResponse.statusText,
        body: errorText,
        json: errorJson
      });
      return new Response(
        JSON.stringify({
          error: 'Échec génération certificat CryptoNeo',
          details: errorJson || errorText,
          status: cryptoneoResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const certificateData = await cryptoneoResponse.json();
    console.log('=== CryptoNeo FULL RESPONSE ===');
    console.log('statusCode:', certificateData?.statusCode);
    console.log('statusMessage:', certificateData?.statusMessage);
    console.log('data keys:', certificateData?.data ? Object.keys(certificateData.data) : 'no data');
    console.log('data:', JSON.stringify(certificateData?.data));
    console.log('full response:', JSON.stringify(certificateData));

    // Check if CryptoNeo returned an error (even with HTTP 200)
    if (!certificateData || certificateData.statusCode !== 7000) {
      console.error('CryptoNeo returned error status:', certificateData?.statusCode, certificateData?.statusMessage);
      return new Response(
        JSON.stringify({
          error: certificateData?.statusMessage || 'Erreur lors de la génération du certificat',
          statusCode: certificateData?.statusCode
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try different possible field names for certificate ID
    const certificatId = certificateData.data?.certificatId || certificateData.data?.certificateId || certificateData.data?.id;
    if (!certificatId) {
      console.error('CryptoNeo response missing certificatId. Available fields:', certificateData?.data ? Object.keys(certificateData.data) : 'no data');
      return new Response(
        JSON.stringify({
          error: 'Certificat ID manquant dans la réponse CryptoNeo',
          debug: { data: certificateData?.data }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Store certificate in database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const certificatId = certificateData.data.certificatId;
    const alias = certificateData.data.alias || certificatId;

    const { error: insertError } = await supabaseAdmin
      .from('digital_certificates')
      .insert({
        user_id: user.id,
        certificate_id: certificatId,
        certificate_data: certificateData,
        certificate_status: 'active',
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      // Certificate might already exist, update it
      await supabaseAdmin
        .from('digital_certificates')
        .update({
          certificate_id: certificatId,
          certificate_data: certificateData,
          certificate_status: 'active',
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }

    // 7. Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      type: 'certificate_generated',
      category: 'verification',
      title: 'Certificat numérique généré',
      message: 'Votre certificat numérique CryptoNeo a été généré avec succès.',
      link: '/leases'
    });

    // 8. Log in audit logs
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action_type: 'certificate_generated',
      target_type: 'digital_certificate',
      target_id: user.id,
      notes: `Certificat généré: ${certificatId}`
    });

    console.log('✅ Certificate generated successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        statusCode: 7000,
        statusMessage: 'Certificat généré avec succès',
        data: {
          certificatId: certificatId,
          alias: alias,
          expiresAt: expiresAt.toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-generate-certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
