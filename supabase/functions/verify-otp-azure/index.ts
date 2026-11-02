/**
 * Edge Function: verify-otp-azure
 *
 * Vérification OTP pour authentification via Azure SMS
 * Utilise la table otp_codes (compatible avec otp-unified.service.ts)
 * Compatible avec send-sms-azure pour l'envoi des codes
 */

import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceRoleClient } from '../_shared/service-role.ts';

interface VerifyRequest {
  phoneNumber: string;
  code: string;
  fullName?: string;
  siteUrl?: string;
}

interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

function normalizeSessionUrl(sessionUrl: string, redirectTo: string): string {
  try {
    const url = new URL(sessionUrl);
    url.searchParams.set('redirect_to', redirectTo);
    let normalizedUrl = url.toString();
    if (normalizedUrl.includes('/auth/callback/auth/callback')) {
      normalizedUrl = normalizedUrl.replace('/auth/callback/auth/callback', '/auth/callback');
    }
    return normalizedUrl;
  } catch {
    if (sessionUrl.includes('/auth/callback/auth/callback')) {
      return sessionUrl.replace('/auth/callback/auth/callback', '/auth/callback');
    }
    return sessionUrl;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phoneNumber, code, fullName, siteUrl }: VerifyRequest = body;

    if (!phoneNumber || !code) {
      return new Response(JSON.stringify({ error: 'Numéro et code requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract origin for dynamic redirect URL
    const rawOrigin =
      siteUrl ||
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      Deno.env.get('SITE_URL') ||
      'http://localhost:8080';

    const cleanOrigin = (() => {
      try {
        const url = new URL(rawOrigin);
        return `${url.protocol}//${url.host}`;
      } catch {
        return 'http://localhost:8080';
      }
    })();

    const redirectTo = `${cleanOrigin}/auth/callback`;

    // Vérifier que les variables d'environnement sont disponibles
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[verify-otp-azure] ❌ Variables d\'environnement manquantes:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = getServiceRoleClient();
    console.log('[verify-otp-azure] ✅ Service role client créé');

    // Normaliser le numéro (format E.164: +2250XXXXXXXXX)
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('225')) {
      normalizedPhone = '225' + normalizedPhone;
    }
    const e164Phone = '+' + normalizedPhone;

    console.log('[verify-otp-azure] Numéro normalisé:', { original: phoneNumber, normalized: normalizedPhone, e164: e164Phone });
    console.log('[verify-otp-azure] Recherche OTP avec recipient:', e164Phone);

    // Vérifier le code OTP dans la table otp_codes
    // IMPORTANT: Utiliser e164Phone car l'OTP est stocké au format E.164
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('recipient', e164Phone)
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('[verify-otp-azure] Résultat recherche OTP:', { otpRecord, otpError });

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ error: 'Code invalide ou expiré' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Marquer l'OTP comme utilisé
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // Chercher le profil existant - essayer plusieurs formats
    // 1. D'abord avec le format sans + (ex: 2250556462404)
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    console.log('[verify-otp-azure] Recherche profil 1 (sans +):', {
      normalizedPhone,
      found: !!existingProfile,
      error: profileError?.message
    });

    // 2. Si pas trouvé, essayer avec le format E.164 (ex: +2250556462404)
    let finalProfile = existingProfile;
    if (!existingProfile && !profileError) {
      const { data: profileWithE164, error: e164Error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('phone', e164Phone)
        .maybeSingle();

      console.log('[verify-otp-azure] Recherche profil 2 (avec +):', {
        e164Phone,
        found: !!profileWithE164,
        error: e164Error?.message
      });

      if (profileWithE164) {
        finalProfile = profileWithE164;
      }
    }

    // 3. Si toujours pas trouvé, utiliser l'email dérivé du numéro
    if (!finalProfile && !profileError) {
      const derivedEmail = `${normalizedPhone}@phone.montoit.ci`;
      const { data: profileByEmail, error: emailError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('email', derivedEmail)
        .maybeSingle();

      console.log('[verify-otp-azure] Recherche profil 3 (par email):', {
        derivedEmail,
        found: !!profileByEmail,
        error: emailError?.message
      });

      if (profileByEmail) {
        finalProfile = profileByEmail;
      }
    }

    // ========== CAS 1: UTILISATEUR EXISTANT → CONNEXION ==========
    if (finalProfile) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(finalProfile.id);

      if (userData?.user?.email) {
        const { data: sessionData, error: sessionError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: userData.user.email,
            options: { redirectTo },
          });

        if (sessionError || !sessionData?.properties?.action_link) {
          return new Response(JSON.stringify({ error: 'Erreur de connexion' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const sessionUrl = normalizeSessionUrl(sessionData.properties.action_link, redirectTo);

        return new Response(
          JSON.stringify({
            success: true,
            action: 'login',
            userId: finalProfile.id,
            sessionUrl,
            isNewUser: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== CAS 2: NOUVEL UTILISATEUR, PAS DE NOM → DEMANDER NOM ==========
    if (!fullName?.trim()) {
      return new Response(
        JSON.stringify({
          success: true,
          action: 'needsName',
          message: 'Code vérifié ! Entrez votre nom pour créer votre compte.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== CAS 3: NOUVEL UTILISATEUR AVEC NOM → CRÉATION COMPTE ==========
    const generatedEmail = `${normalizedPhone}@phone.montoit.ci`;
    const generatedPassword = crypto.randomUUID();

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: generatedEmail,
      password: generatedPassword,
      email_confirm: true,
      phone: e164Phone,
      phone_confirm: true,
      user_metadata: {
        phone: e164Phone,
        full_name: fullName,
        auth_method: 'phone',
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du compte' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = createdUser.user.id;

    // Créer le profil
    const { error: insertProfileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      phone: normalizedPhone,
      email: generatedEmail,
      full_name: fullName,
      user_type: 'locataire',
      trust_score: 1.0,
      profile_setup_completed: false,
    });

    if (insertProfileError) {
      console.error('Error creating profile:', insertProfileError);
    }

    // Générer le magic link
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: generatedEmail,
      options: { redirectTo },
    });

    if (sessionError || !sessionData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: 'Compte créé mais erreur de connexion' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionUrl = normalizeSessionUrl(sessionData.properties.action_link, redirectTo);

    return new Response(
      JSON.stringify({
        success: true,
        action: 'register',
        userId,
        sessionUrl,
        isNewUser: true,
        needsProfileCompletion: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-otp-azure:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
