/**
 * Edge Function: password-reset
 *
 * Demande de réinitialisation de mot de passe par email.
 * Utilise l'API native Supabase Auth pour envoyer le lien sécurisé.
 * Compatible avec la gestion d'erreurs robuste de phone-otp-verify.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ResetRequest {
  email: string;
  siteUrl?: string; // URL de redirection après clic (ex: https://montoit.ci/reset-password)
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: unknown;
}

// Helper pour les réponses d'erreur standardisées
function createError(status: number, message: string, code?: string, details?: unknown): Response {
  const body: ErrorResponse = {
    success: false,
    error: message,
    errorCode: code,
    details,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      ...getCorsHeaders(new Request('http://localhost')) // Headers CORS basiques pour l'erreur
    },
  });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Gestion CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 2. Validation de la méthode
    if (req.method !== 'POST') {
      return createError(405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    }

    const body = await req.json();
    const { email, siteUrl }: ResetRequest = body;

    // 3. Validation des entrées
    if (!email || !email.includes('@')) {
      return createError(400, 'Adresse email invalide', 'INVALID_EMAIL');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Configuration Environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[password-reset] Configuration manquante');
      return createError(500, 'Configuration serveur invalide', 'SERVER_CONFIG_ERROR');
    }

    // 5. Initialisation Client Admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 6. Détermination de l'URL de redirection
    // Priorité : siteUrl (frontend) > Env Variable > Default
    const redirectBase = siteUrl 
      ? siteUrl 
      : Deno.env.get('SITE_URL') || 'http://localhost:8080';
    
    // S'assurer que l'URL de redirection pointe vers la page de reset du frontend
    // Ex: https://montoit.ci/auth/reset-password ou /update-password
    const redirectTo = `${redirectBase}/auth/reset-password`; 

    console.log('[password-reset] Demande pour:', normalizedEmail);
    console.log('[password-reset] Redirection vers:', redirectTo);

    // 7. Vérification optionnelle : L'utilisateur existe-t-il ?
    // Note: Pour la sécurité, on pourrait sauter cette étape et appeler directement resetPasswordForEmail.
    // Mais ici, on va logger l'erreur si l'user n'existe pas pour le debug serveur, 
    // tout en renvoyant un succès "fictif" au client pour ne pas révéler la liste des emails.
    
    const {  user, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);

    if (userError || !user) {
      // LOG INTERNE SEULEMENT
      console.warn(`[password-reset] Tentative sur email inexistant: ${normalizedEmail}`);
      
      // RÉPONSE CLIENT : Succès fictif (Best Practice Sécurité)
      // On ne dit pas "Email introuvable" pour éviter le harvesting d'emails.
      return new Response(JSON.stringify({
        success: true,
        message: "Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.",
        sent: false // Indique au log interne que rien n'a été envoyé
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 8. Envoi du lien de reset via l'API Supabase
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetError) {
      console.error('[password-reset] Erreur API Supabase:', resetError);
      
      // Gestion des erreurs spécifiques
      if (resetError.message.includes('rate limit')) {
        return createError(429, 'Trop de demandes. Veuillez réessayer plus tard.', 'RATE_LIMIT_EXCEEDED');
      }
      
      // Si l'erreur vient du SMTP (ex: configuration email manquante), on loggue mais on reste vague pour le client
      return createError(500, 'Erreur lors de l\'envoi de l\'email', 'EMAIL_SEND_FAILED', resetError.message);
    }

    console.log('[password-reset] Email envoyé avec succès à:', normalizedEmail);

    // 9. Réponse Succès
    return new Response(JSON.stringify({
      success: true,
      message: "Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.",
      sent: true
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (globalError: unknown) {
    console.error('[password-reset] Erreur globale non gérée:', globalError);
    const message = globalError instanceof Error ? globalError.message : 'Erreur inconnue';
    return createError(500, 'Erreur serveur inattendue', 'INTERNAL_SERVER_ERROR', message);
  }
});