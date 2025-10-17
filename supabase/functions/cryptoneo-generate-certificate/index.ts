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

    // 1. Verify ONECI verification
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, phone, oneci_verified')
      .eq('id', user.id)
      .single();

    if (!profile?.oneci_verified) {
      return new Response(
        JSON.stringify({ 
          error: 'Vérification ONECI requise',
          redirect: '/verification' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get ONECI data
    const { data: verification } = await supabaseClient
      .from('user_verifications')
      .select('oneci_cni_number, oneci_data')
      .eq('user_id', user.id)
      .single();

    if (!verification?.oneci_data) {
      return new Response(
        JSON.stringify({ error: 'Données ONECI manquantes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oneciData = verification.oneci_data as any;
    if (!oneciData.photo_base64) {
      return new Response(
        JSON.stringify({ error: 'Photo ONECI manquante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get JWT token from auth function
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

    // 4. Prepare certificate data
    const nameParts = profile.full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Hash CNI number
    const encoder = new TextEncoder();
    const data = encoder.encode(verification.oneci_cni_number);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashPiece = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 5. Call CryptoNeo API
    const cryptoneoResponse = await fetch(`${CRYPTONEO_BASE_URL}/generateCert/generateCertificat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email: user.email,
        phone: profile.phone,
        organisation: 'ANSUT',
        typePiece: 'CNI',
        hashPiece,
        base64: oneciData.photo_base64
      })
    });

    if (!cryptoneoResponse.ok) {
      const error = await cryptoneoResponse.text();
      console.error('CryptoNeo certificate generation failed:', error);
      return new Response(
        JSON.stringify({ error: 'Échec génération certificat CryptoNeo' }),
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
        success: true,
        certificateId: certificateData.certificatId,
        expiresAt: expiresAt.toISOString()
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
