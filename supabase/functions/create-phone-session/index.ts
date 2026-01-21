/**
 * Edge Function: create-phone-session
 *
 * Crée un utilisateur et une session pour téléphone après vérification OTP
 * Cette fonction est appelée après que l'OTP a été vérifié mais que l'utilisateur n'avait pas fourni son nom
 *
 * Ne revérifie pas l'OTP (supposé déjà vérifié)
 */

import { getCorsHeaders } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/service-role.ts";

interface CreateSessionRequest {
  phoneNumber: string;
  fullName: string;
  siteUrl?: string;
}

function normalizeSessionUrl(sessionUrl: string, redirectTo: string): string {
  try {
    const url = new URL(sessionUrl);
    url.searchParams.set("redirect_to", redirectTo);
    let normalizedUrl = url.toString();
    if (normalizedUrl.includes("/auth/callback/auth/callback")) {
      normalizedUrl = normalizedUrl.replace(
        "/auth/callback/auth/callback",
        "/auth/callback",
      );
    }
    return normalizedUrl;
  } catch {
    if (sessionUrl.includes("/auth/callback/auth/callback")) {
      return sessionUrl.replace(
        "/auth/callback/auth/callback",
        "/auth/callback",
      );
    }
    return sessionUrl;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phoneNumber, fullName, siteUrl }: CreateSessionRequest = body;

    if (!phoneNumber || !fullName?.trim()) {
      return new Response(JSON.stringify({ error: "Numéro et nom requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract origin for dynamic redirect URL
    const rawOrigin = siteUrl ||
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      Deno.env.get("SITE_URL") ||
      "http://localhost:8080";

    const cleanOrigin = (() => {
      try {
        const url = new URL(rawOrigin);
        return `${url.protocol}//${url.host}`;
      } catch {
        return "http://localhost:8080";
      }
    })();

    const redirectTo = `${cleanOrigin}/auth/callback`;

    const supabaseAdmin = getServiceRoleClient();
    console.log("[create-phone-session] ✅ Service role client créé");

    // Normaliser le numéro
    let normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("225")) {
      normalizedPhone = "225" + normalizedPhone;
    }
    const dbPhone = normalizedPhone;
    const e164Phone = "+" + normalizedPhone;
    const generatedEmail = `${normalizedPhone}@temp.mon-toit.ansut.ci`;

    console.log("[create-phone-session] Création utilisateur pour:", {
      dbPhone,
      fullName,
      generatedEmail
    });

    // Créer l'utilisateur dans Supabase Auth
    const generatedPassword = crypto.randomUUID();

    const { data: createdUser, error: createError } = await supabaseAdmin.auth
      .admin.createUser({
        email: generatedEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          phone: e164Phone,
          full_name: fullName,
          auth_method: "phone",
          signup_method: "phone",
        },
      });

    if (createError) {
      console.error("[create-phone-session] Erreur création utilisateur:", createError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du compte" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = createdUser.user.id;

    // Créer le profil dans la table profiles
    const { error: profileError } = await supabaseAdmin.from("profiles").insert(
      {
        id: userId,
        phone: dbPhone,
        email: null, // Email null pour inscription par téléphone
        full_name: fullName,
        user_type: null, // Sera défini plus tard
        created_at: new Date().toISOString(),
      },
    );

    if (profileError) {
      console.error("[create-phone-session] Erreur création profil:", profileError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du profil" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Générer le magic link pour la session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth
      .admin.generateLink({
        type: "magiclink",
        email: generatedEmail,
        options: { redirectTo },
      });

    if (sessionError || !sessionData?.properties?.action_link) {
      console.error("[create-phone-session] Erreur génération session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Compte créé mais erreur de connexion" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sessionUrl = normalizeSessionUrl(
      sessionData.properties.action_link,
      redirectTo,
    );

    console.log("[create-phone-session] ✅ Utilisateur créé avec succès:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        action: "register",
        userId,
        sessionUrl,
        isNewUser: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[create-phone-session] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
