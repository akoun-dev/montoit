/**
 * Edge Function: phone-otp-verify
 * Version Robuste avec Gestion Complète des Erreurs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceRoleClient } from '../_shared/service-role.ts';

// Types
interface VerifyRequest {
  phoneNumber: string;
  code: string;
  fullName?: string;
  siteUrl?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: unknown;
}

function createError(status: number, message: string, code?: string, details?: unknown): Response {
  const body: ErrorResponse = {
    success: false,
    error: message,
    errorCode: code,
    details,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  // Gestion CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phoneNumber, code, fullName, siteUrl }: VerifyRequest = body;

    // 1. Validation des entrées
    if (!phoneNumber || !code) {
      return createError(400, 'Numéro de téléphone et code OTP requis', 'MISSING_INPUT');
    }

    // 2. Configuration & Environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL'); // Correction: Utiliser SUPABASE_URL, pas VITE_
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[phone-otp-verify] Configuration manquante');
      return createError(500, 'Configuration serveur invalide', 'SERVER_CONFIG_ERROR');
    }

    const supabaseAdmin = getServiceRoleClient();

    // 3. Normalisation du numéro (E.164)
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Gestion stricte pour la Côte d'Ivoire (225)
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '225' + normalizedPhone;
    } else if (!normalizedPhone.startsWith('225')) {
      // Si l'utilisateur entre un autre pays, on rejette ou on force 225 selon votre biz rule
      // Ici, on force 225 si ce n'est pas déjà fait, mais attention aux faux numéros
      if (normalizedPhone.length < 10) {
         normalizedPhone = '225' + normalizedPhone;
      }
    }
    
    const e164Phone = '+' + normalizedPhone;
    const derivedEmail = `${normalizedPhone}@phone.montoit.ci`;

    // 4. Vérification OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('recipient', e164Phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      console.warn('[phone-otp-verify] Échec vérification OTP:', otpError?.message || 'Aucun record');
      return createError(400, 'Code invalide ou expiré', 'INVALID_OTP');
    }

    // 5. Recherche Utilisateur Existant
    let existingProfile = null;
    let existingUserAuthId = null;

    // Tentative 1: Par téléphone (sans +)
    const { data: profile1 } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    
    if (profile1) existingProfile = profile1;

    // Tentative 2: Par téléphone (avec +)
    if (!existingProfile) {
      const { data: profile2 } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('phone', e164Phone)
        .maybeSingle();
      if (profile2) existingProfile = profile2;
    }

    // Tentative 3: Par email dérivé
    if (!existingProfile) {
      const { data: profile3 } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('email', derivedEmail)
        .maybeSingle();
      if (profile3) existingProfile = profile3;
    }

    // Récupérer l'ID Auth si profil trouvé
    if (existingProfile) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      if (userError) {
        console.warn('[phone-otp-verify] Profil trouvé mais getUserById a échoué, tentative de connexion directe:', userError.message);
        // On continue avec l'email dérivé pour la connexion
        existingUserAuthId = existingProfile.id; // Utiliser l'ID du profil comme fallback
      } else if (userData?.user) {
        existingUserAuthId = userData.user.id;
      }
    }

    // ========== CAS 1: UTILISATEUR EXISTANT (CONNEXION) ==========
    if (existingProfile) {
      const userEmail = existingProfile.email || derivedEmail; // Fallback si email manquant dans profil

      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: userEmail,
          options: { 
            redirectTo: siteUrl ? `${siteUrl}/auth/callback` : `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/auth/callback` 
          },
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error('[phone-otp-verify] Échec génération magic link (login):', linkError);
          return createError(500, 'Échec de la génération de session', 'SESSION_GENERATION_FAILED', linkError);
        }

        // Marquer OTP utilisé (seulement si tout va bien)
        await supabaseAdmin.from('otp_codes').update({ used: true, used_at: new Date().toISOString() }).eq('id', otpRecord.id);

        return new Response(JSON.stringify({
          success: true,
          action: 'login',
          userId: existingUserAuthId,
          sessionUrl: linkData.properties.action_link,
          isNewUser: false,
          message: 'Connexion réussie'
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } catch (err) {
        console.error('[phone-otp-verify] Exception lors du login:', err);
        return createError(500, 'Erreur interne lors de la connexion', 'INTERNAL_LOGIN_ERROR');
      }
    }

    // ========== CAS 2: NOUVEL UTILISATEUR SANS NOM ==========
    if (!fullName || !fullName.trim()) {
      // On ne marque PAS encore l'OTP comme utilisé, on attend la finalisation
      return new Response(JSON.stringify({
        success: true,
        action: 'needsName',
        message: 'Code valide. Veuillez entrer votre nom complet pour finaliser.',
        tempToken: otpRecord.id // Optionnel: passer l'ID OTP pour sécuriser la prochaine étape
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== CAS 3: CRÉATION NOUVEL UTILISATEUR ==========
    console.log('[phone-otp-verify] Création nouvel utilisateur:', derivedEmail);

    const generatedPassword = crypto.randomUUID();
    let newUserAuthId: string | null = null;

    try {
      // A. Création Auth User
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email: derivedEmail,
        password: generatedPassword,
        phone: e164Phone,
        options: {
          data: {
            full_name: fullName,
            phone: e164Phone,
            auth_method: 'phone_otp'
          },
          // Important: Ne pas envoyer d'email réel si le domaine est fictif
          emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined
        },
      });

      if (signUpError) {
        // Gestion spécifique erreur "User already registered" (409)
        if (signUpError.message.includes('User already registered') || signUpError.status === 409) {
           return createError(409, 'Un compte existe déjà avec ce numéro', 'USER_EXISTS_CONFLICT', signUpError);
        }
        throw new Error(`Signup failed: ${signUpError.message}`);
      }

      if (!signUpData?.user) {
        throw new Error('Aucun utilisateur retourné après inscription');
      }

      newUserAuthId = signUpData.user.id;

      // B. Création/Update Profil (Upsert)
      const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: newUserAuthId,
        phone: e164Phone,
        email: derivedEmail,
        full_name: fullName.trim(),
        user_type: 'tenant',
        trust_score: 1.0,
        profile_setup_completed: false,
      }, { onConflict: 'id' });

      if (upsertError) {
        console.error('[phone-otp-verify] Échec upsert profil:', upsertError);
        // Rollback partiel recommandé : supprimer l'user auth créé si le profil échoue
        await supabaseAdmin.auth.admin.deleteUser(newUserAuthId);
        throw new Error(`Échec création profil: ${upsertError.message}`);
      }

      // C. Connexion automatique pour obtenir la session (Plus fiable que generateLink pour emails fictifs)
      let sessionUrl = '';
      try {
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: derivedEmail,
          password: generatedPassword,
        });

        if (!signInError && signInData?.session) {
          // Construction manuelle de l'URL de callback avec les tokens
          const redirectBase = siteUrl ? `${siteUrl}/auth/callback` : `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/auth/callback`;
          sessionUrl = `${redirectBase}#access_token=${signInData.session.access_token}&refresh_token=${signInData.session.refresh_token}&expires_in=${signInData.session.expires_in}&token_type=bearer&type=recovery`;
        } else {
          console.warn('[phone-otp-verify] Auto-login échoué, fallback magic link');
          // Fallback si signIn échoue (rare)
          const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: derivedEmail,
            options: { redirectTo: redirectBase }
          });
          if (linkData?.properties?.action_link) sessionUrl = linkData.properties.action_link;
        }
      } catch (e) {
        console.warn('[phone-otp-verify] Erreur récupération session:', e);
        // On ne bloque pas, on retourne juste sans sessionUrl, le frontend devra peut-être demander un login manuel
      }

      // D. Marquer OTP utilisé
      await supabaseAdmin.from('otp_codes').update({ used: true, used_at: new Date().toISOString() }).eq('id', otpRecord.id);

      // E. Message de bienvenue (Fire & Forget)
      // Appel asynchrone sans await pour ne pas bloquer la réponse
      sendWelcomeMessage(newUserAuthId, e164Phone, fullName).catch(e => console.warn('Welcome msg failed', e));

      return new Response(JSON.stringify({
        success: true,
        action: 'register',
        userId: newUserAuthId,
        sessionUrl,
        isNewUser: true,
        needsProfileCompletion: true,
        message: 'Compte créé avec succès'
      }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: unknown) {
      console.error('[phone-otp-verify] Erreur critique création compte:', err);

      // Nettoyage : Si on a créé un user Auth mais échoué après, on le supprime pour éviter les orphelins
      if (newUserAuthId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(newUserAuthId);
          console.log('[phone-otp-verify] User orphan supprimé:', newUserAuthId);
        } catch (delErr: unknown) {
          console.error('[phone-otp-verify] Échec nettoyage user orphan:', delErr);
        }
      }

      return createError(500, 'Échec complet de la création du compte', 'REGISTRATION_FAILED', err instanceof Error ? err.message : String(err));
    }

  } catch (globalError: unknown) {
    console.error('[phone-otp-verify] Erreur globale non gérée:', globalError);
    return createError(500, 'Erreur serveur inattendue', 'INTERNAL_SERVER_ERROR', globalError instanceof Error ? globalError.message : String(globalError));
  }
});

/**
 * Helper pour le message de bienvenue (isolé pour ne pas casser le flux principal)
 */
async function sendWelcomeMessage(userId: string, phone: string, firstName?: string): Promise<void> {
  try {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/welcome-message`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, phone, first_name: firstName, registration_method: 'sms' }),
    });
  } catch (e) {
    console.error('[sendWelcomeMessage] Échec silencieux:', e);
  }
}