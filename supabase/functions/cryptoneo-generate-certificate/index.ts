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

    console.log('Step 3: Getting user profile');
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

    console.log('Step 4: Getting ONECI data (optional)');
    // 2. Try to get ONECI data (optional)
    const { data: verification } = await supabaseClient
      .from('user_verifications')
      .select('oneci_cni_number, oneci_data')
      .eq('user_id', user.id)
      .maybeSingle();

    let hashPiece: string;
    let base64Photo: string | undefined;

    if (verification?.oneci_data) {
      const oneciData = verification.oneci_data as any;
      base64Photo = oneciData.photo_base64;

      // Use CNI number if available
      const cniNumber = verification.oneci_cni_number || oneciData.cni_number || oneciData.oneci_cni_number;
      if (cniNumber) {
        const encoder = new TextEncoder();
        const data = encoder.encode(cniNumber);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('Using CNI hash for certificate');
      } else {
        // Fallback to email
        const encoder = new TextEncoder();
        const data = encoder.encode(user.email || '');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('Using email hash as fallback (no CNI number)');
      }
    } else {
      // No ONECI data: use email as identifier
      const encoder = new TextEncoder();
      const data = encoder.encode(user.email || '');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('No ONECI data, using email hash for certificate');
    }

    console.log('Step 5: Getting JWT token from auth function');
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

    console.log('Step 6: Preparing certificate data');

    // 4. Prepare certificate data
    const nameParts = profile.full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // 5. Call CryptoNeo API
    const requestBody: any = {
      firstName,
      lastName,
      email: user.email,
      phone: profile.phone,
      organisation: 'ANSUT',
      typePiece: 'CNI',
      hashPiece,
    };

    // Only include base64 if we have a photo
    if (base64Photo) {
      requestBody.base64 = base64Photo;
    }

    console.log('Step 7: Calling CryptoNeo API');
    console.log('Request body:', JSON.stringify({ ...requestBody, base64: base64Photo ? '[REDACTED]' : undefined }));
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

    // 6. Store certificate in database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error: insertError } = await supabaseAdmin
      .from('digital_certificates')
      .insert({
        user_id: user.id,
        certificate_id: certificateData.certificatId,
        certificate_data: certificateData,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      // Certificate might already exist, update it
      await supabaseAdmin
        .from('digital_certificates')
        .update({
          certificate_id: certificateData.certificatId,
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
      notes: `Certificat généré: ${certificateData.certificatId}`
    });

    console.log('Certificate generated successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        statusCode: 7000,
        statusMessage: 'Certificat généré avec succès',
        data: {
          certificatId: certificateData.certificatId,
          alias: certificateData.certificatId,
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
