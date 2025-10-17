import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MfaNotificationRequest {
  email: string;
  fullName: string;
  notificationType: 'enabled' | 'disabled' | 'backup_code_used' | 'failed_attempts';
  metadata?: {
    remainingCodes?: number;
    failedAttempts?: number;
  };
}

const emailTemplates = {
  enabled: (fullName: string) => ({
    subject: '🔒 2FA activée sur votre compte Mon Toit',
    htmlContent: `
      <h1>Authentification à deux facteurs activée</h1>
      <p>Bonjour ${fullName},</p>
      <p>L'authentification à deux facteurs (2FA) a été activée sur votre compte Mon Toit.</p>
      <p>Votre compte bénéficie maintenant d'une sécurité renforcée.</p>
      <p><strong>Si vous n'êtes pas à l'origine de cette action, contactez immédiatement notre support.</strong></p>
      <p>Cordialement,<br>L'équipe Mon Toit</p>
    `
  }),
  disabled: (fullName: string) => ({
    subject: '⚠️ 2FA désactivée sur votre compte Mon Toit',
    htmlContent: `
      <h1>Authentification à deux facteurs désactivée</h1>
      <p>Bonjour ${fullName},</p>
      <p>L'authentification à deux facteurs (2FA) a été désactivée sur votre compte Mon Toit.</p>
      <p><strong style="color: red;">ATTENTION :</strong> Votre compte est maintenant moins sécurisé.</p>
      <p>Nous vous recommandons fortement de réactiver la 2FA.</p>
      <p><strong>Si vous n'êtes pas à l'origine de cette action, contactez immédiatement notre support.</strong></p>
      <p>Cordialement,<br>L'équipe Mon Toit</p>
    `
  }),
  backup_code_used: (fullName: string, remainingCodes: number = 0) => ({
    subject: '🔑 Code de récupération 2FA utilisé - Mon Toit',
    htmlContent: `
      <h1>Code de récupération utilisé</h1>
      <p>Bonjour ${fullName},</p>
      <p>Un code de récupération 2FA a été utilisé sur votre compte Mon Toit.</p>
      <p>Codes de récupération restants : <strong>${remainingCodes}</strong></p>
      ${remainingCodes < 3 ? `
        <p style="color: orange;"><strong>⚠️ Attention :</strong> Il vous reste peu de codes de récupération. 
        Pensez à en régénérer de nouveaux depuis votre profil.</p>
      ` : ''}
      <p><strong>Si vous n'êtes pas à l'origine de cette action, contactez immédiatement notre support.</strong></p>
      <p>Cordialement,<br>L'équipe Mon Toit</p>
    `
  }),
  failed_attempts: (fullName: string, failedAttempts: number = 0) => ({
    subject: '🚨 Tentatives de connexion 2FA échouées - Mon Toit',
    htmlContent: `
      <h1>Tentatives de connexion suspectes détectées</h1>
      <p>Bonjour ${fullName},</p>
      <p><strong style="color: red;">ALERTE SÉCURITÉ :</strong> Nous avons détecté ${failedAttempts} tentatives de connexion 2FA échouées sur votre compte Mon Toit.</p>
      <p>Votre compte a été temporairement verrouillé pendant 15 minutes.</p>
      <p><strong>Si vous n'êtes pas à l'origine de ces tentatives, nous vous recommandons de :</strong></p>
      <ul>
        <li>Changer immédiatement votre mot de passe</li>
        <li>Vérifier vos codes de récupération 2FA</li>
        <li>Contacter notre support pour un audit de sécurité</li>
      </ul>
      <p>Cordialement,<br>L'équipe Mon Toit</p>
    `
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, notificationType, metadata }: MfaNotificationRequest = await req.json();

    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured');
    }

    let template;
    switch (notificationType) {
      case 'enabled':
        template = emailTemplates.enabled(fullName);
        break;
      case 'disabled':
        template = emailTemplates.disabled(fullName);
        break;
      case 'backup_code_used':
        template = emailTemplates.backup_code_used(fullName, metadata?.remainingCodes);
        break;
      case 'failed_attempts':
        template = emailTemplates.failed_attempts(fullName, metadata?.failedAttempts);
        break;
      default:
        throw new Error('Invalid notification type');
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'Mon Toit', email: 'noreply@montoit.ci' },
        to: [{ email, name: fullName }],
        subject: template.subject,
        htmlContent: template.htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Brevo API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log(`MFA notification sent: ${notificationType} to ${email}`);

    return new Response(
      JSON.stringify({ success: true, type: notificationType }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-mfa-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
