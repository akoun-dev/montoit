/**
 * Service Brevo OTP
 *
 * Service pour l'envoi de codes OTP via Brevo (Email + SMS)
 * Optimisé pour le marché ivoirien avec support WhatsApp
 */

import { supabase } from '@/services/supabase/client';

export interface BrevoConfig {
  apiKey: string;
  baseUrl: string;
  sandboxMode?: boolean;
}

export interface OTPData {
  otp: string;
  expiresIn: number; // en minutes
  recipient: string; // email ou numéro de téléphone
  method: 'email' | 'sms' | 'whatsapp';
  userName?: string;
}

export interface BrevoEmailTemplate {
  templateId?: number;
  subject: string;
  htmlContent: string;
  sender: {
    name: string;
    email: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
}

export interface BrevoSMSData {
  recipient: string; // format international (+22507XXXXXXXX)
  sender: string; // max 11 caractères
  content: string;
  type: 'transactional' | 'marketing';
  unicodeEnabled?: boolean;
  // For WhatsApp
  whatsappEnabled?: boolean;
  whatsappTemplate?: {
    templateId?: string;
    params?: Record<string, any>;
  };
}

class BrevoOTPService {
  private config: BrevoConfig;

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY || '',
      baseUrl: 'https://api.brevo.com/v3',
      sandboxMode: import.meta.env.DEV || false,
    };
  }

  /**
   * Génère un code OTP sécurisé
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * En-têtes d'authentification pour les API Brevo
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': this.config.apiKey,
    };

    // Mode sandbox pour les tests
    if (this.config.sandboxMode) {
      headers['X-Sib-Sandbox'] = 'drop';
    }

    return headers;
  }

  /**
   * Envoyer un OTP par email
   */
  async sendOTPEmail(otpData: OTPData): Promise<{ success: boolean; error?: string }> {
    try {
      const template: BrevoEmailTemplate = {
        subject: '🔐 Mon Toit - Code de vérification',
        htmlContent: this.generateEmailTemplate(otpData),
        sender: {
          name: 'Mon Toit',
          email: 'no-reply@montoit.ci',
        },
        to: [
          {
            email: otpData.recipient,
            name: otpData.userName || '',
          },
        ],
      };

      const response = await fetch(`${this.config.baseUrl}/smtp/email`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur envoi OTP email Brevo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email",
      };
    }
  }

  /**
   * Envoyer un OTP par SMS (standard)
   */
  async sendOTPSMS(otpData: OTPData): Promise<{ success: boolean; error?: string }> {
    try {
      const smsData: BrevoSMSData = {
        recipient: this.formatPhoneNumberForBrevo(otpData.recipient),
        sender: 'MonToit', // max 11 caractères
        content: `MonToit: Votre code de verification est ${otpData.otp}. Valide ${otpData.expiresIn}min. Ne partagez jamais ce code.`,
        type: 'transactional',
        unicodeEnabled: true, // Support des caractères spéciaux
      };

      const response = await fetch(`${this.config.baseUrl}/transactionalSMS/sms`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(smsData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur envoi OTP SMS Brevo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'envoi du SMS",
      };
    }
  }

  /**
   * Envoyer un OTP par WhatsApp via SMS Gateway
   * Note: Brevo ne gère pas directement WhatsApp, on utilise une stratégie hybride
   */
  async sendOTPWhatsApp(otpData: OTPData): Promise<{ success: boolean; error?: string }> {
    try {
      // Stratégie 1: SMS avec préfixe WhatsApp-friendly
      const smsData: BrevoSMSData = {
        recipient: this.formatPhoneNumberForBrevo(otpData.recipient),
        sender: 'MonToitCI', // max 11 caractères
        content: `🏠 MonToit CI: Votre code est ${otpData.otp}. Valide ${otpData.expiresIn}min. WhatsApp: +22507XX00000 si besoin.`,
        type: 'transactional',
        unicodeEnabled: true,
      };

      const response = await fetch(`${this.config.baseUrl}/transactionalSMS/sms`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(smsData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }

      // Note: Pour une vraie intégration WhatsApp, il faudrait utiliser
      // l'API WhatsApp Business ou un service tiers comme Twilio

      return { success: true };
    } catch (error) {
      console.error('Erreur envoi OTP WhatsApp Brevo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'envoi WhatsApp",
      };
    }
  }

  /**
   * Formate le numéro de téléphone pour Brevo (format international)
   */
  private formatPhoneNumberForBrevo(phone: string): string {
    // Supprime tous les caractères non numériques sauf +
    let formatted = phone.replace(/[^\d+]/g, '');

    // Si le numéro commence par 0, ajouter l'indicatif du pays
    if (formatted.startsWith('07') || formatted.startsWith('05')) {
      formatted = '+225' + formatted;
    }

    // Si pas de + au début, l'ajouter
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    return formatted;
  }

  /**
   * Génère le template HTML pour l'email OTP
   */
  private generateEmailTemplate(otpData: OTPData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de vérification - Mon Toit</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #2C1810; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F16522;">
          <div style="width: 60px; height: 60px; background: #F16522; border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">🏠</span>
          </div>
          <h1 style="margin: 0; color: #2C1810; font-size: 32px;">Mon Toit</h1>
          <p style="margin: 5px 0 0; color: #6B5A4E;">Votre plateforme immobilière de confiance</p>
        </div>

        <!-- Contenu principal -->
        <div style="padding: 40px 20px; background: #FAF7F4; border-radius: 20px; margin: 30px 0;">
          <h2 style="color: #2C1810; text-align: center; margin-bottom: 30px;">🔐 Code de vérification</h2>

          <p style="font-size: 16px; margin-bottom: 30px;">
            ${otpData.userName ? `Bonjour ${otpData.userName},` : 'Bonjour,'}<br><br>
            Vous avez demandé un code de vérification pour accéder à votre compte Mon Toit.
          </p>

          <!-- Code OTP -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: white; padding: 20px 40px; border-radius: 15px; border: 2px solid #F16522; box-shadow: 0 4px 15px rgba(241, 101, 34, 0.1);">
              <span style="font-size: 36px; font-weight: bold; color: #F16522; letter-spacing: 8px;">${otpData.otp}</span>
            </div>
          </div>

          <p style="font-size: 16px; margin-bottom: 20px;">
            Ce code est valide pendant <strong>${otpData.expiresIn} minutes</strong>.
          </p>

          <div style="background: #FFF3E0; padding: 20px; border-radius: 10px; border-left: 4px solid #F16522;">
            <p style="margin: 0; color: #8B6914;">
              <strong>⚠️ Sécurité :</strong> Ne partagez jamais ce code avec qui que ce soit.
              L'équipe Mon Toit ne vous demandera jamais votre code par téléphone ou email.
            </p>
          </div>
        </div>

        <!-- Instructions -->
        <div style="background: #F8F8F8; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
          <h3 style="color: #2C1810; margin-top: 0;">Comment utiliser ce code ?</h3>
          <ol style="padding-left: 20px;">
            <li style="margin-bottom: 10px;">Retournez sur l'application Mon Toit</li>
            <li style="margin-bottom: 10px;">Saisissez le code à 6 chiffres ci-dessus</li>
            <li style="margin-bottom: 10px;">Votre compte sera vérifié et vous pourrez continuer</li>
          </ol>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #EFEBE9; color: #6B5A4E;">
          <p style="margin: 0 0 10px;">
            <strong>Mon Toit</strong> - Certifié ANSUT Côte d'Ivoire
          </p>
          <p style="margin: 0; font-size: 14px;">
            📞 Contact: +225 07 XX XX XX XX<br>
            🌐 www.montoit.ci<br>
            📍 Cocody, Abidjan, Côte d'Ivoire
          </p>
          <p style="margin: 20px 0 0; font-size: 12px; color: #A69B95;">
            Cet email a été généré automatiquement. Merci de ne pas y répondre.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envoyer un OTP via la méthode appropriée
   */
  async sendOTP(otpData: OTPData): Promise<{ success: boolean; error?: string }> {
    switch (otpData.method) {
      case 'email':
        return await this.sendOTPEmail(otpData);
      case 'sms':
        return await this.sendOTPSMS(otpData);
      case 'whatsapp':
        return await this.sendOTPWhatsApp(otpData);
      default:
        return {
          success: false,
          error: "Méthode d'envoi non supportée",
        };
    }
  }

  /**
   * Valider la configuration Brevo
   */
  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.apiKey) {
      return {
        valid: false,
        error: 'Clé API Brevo manquante. Configurez VITE_BREVO_API_KEY ou BREVO_API_KEY.',
      };
    }

    if (!this.config.apiKey.startsWith('xkeysib-')) {
      return {
        valid: false,
        error: 'Clé API Brevo invalide. Doit commencer par "xkeysib-".',
      };
    }

    return { valid: true };
  }
}

// Export du singleton
export const brevoOTPService = new BrevoOTPService();
export default brevoOTPService;
