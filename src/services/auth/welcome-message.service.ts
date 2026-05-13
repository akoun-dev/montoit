/**
 * Welcome Message Service
 *
 * Service pour envoyer des messages de bienvenue aux nouveaux utilisateurs
 * via SMS (Azure) ou Email (Brevo/Resend)
 */

import { supabase } from '@/services/supabase/client';

export interface WelcomeMessageRequest {
  user_id: string;
  email?: string;
  phone?: string; // Format E.164: +225...
  first_name?: string;
  registration_method: 'sms' | 'email';
}

export interface WelcomeMessageResponse {
  status: 'ok' | 'error';
  channel_used?: 'sms' | 'email';
  message_id?: string;
  reason?: string;
}

export interface WelcomeMessageResult {
  success: boolean;
  error?: string;
  channelId?: string;
  messageId?: string;
}

class WelcomeMessageService {
  /**
   * Envoie un message de bienvenue à un nouvel utilisateur
   */
  async sendWelcomeMessage(request: WelcomeMessageRequest): Promise<WelcomeMessageResult> {
    console.log('[welcome-message] 🚀 Envoi message de bienvenue:', request);

    const { user_id, email, phone, first_name, registration_method } = request;

    // Validation de base
    if (!user_id || !registration_method) {
      console.error('[welcome-message] ❌ user_id et registration_method sont requis');
      return {
        success: false,
        error: 'user_id et registration_method sont requis',
      };
    }

    if (registration_method === 'email' && !email) {
      console.error('[welcome-message] ❌ Email requis pour la méthode email');
      return {
        success: false,
        error: 'Email requis pour la méthode email',
      };
    }

    if (registration_method === 'sms' && !phone) {
      console.error('[welcome-message] ❌ Numéro de téléphone requis pour la méthode SMS');
      return {
        success: false,
        error: 'Numéro de téléphone requis pour la méthode SMS',
      };
    }

    try {
      console.log('[welcome-message] 📤 Appel Edge Function welcome-message...');

      const { data, error } = await supabase.functions.invoke<WelcomeMessageResponse>(
        'welcome-message',
        {
          body: {
            user_id,
            email,
            phone,
            first_name,
            registration_method,
          },
        },
      );

      console.log('[welcome-message] Réponse Edge Function:', { data, error });

      if (error) {
        console.error('[welcome-message] ❌ Erreur Edge Function:', error);
        return {
          success: false,
          error: error.message || "Erreur lors de l'envoi du message de bienvenue",
        };
      }

      if (data?.status === 'ok') {
        console.log('[welcome-message] ✅ Message de bienvenue envoyé avec succès:', {
          channel: data.channel_used,
          messageId: data.message_id,
        });

        return {
          success: true,
          channelId: data.channel_used,
          messageId: data.message_id,
        };
      }

      console.error('[welcome-message] ❌ Statut error dans la réponse:', data);
      return {
        success: false,
        error: data?.reason || "Erreur lors de l'envoi du message",
      };

    } catch (error) {
      console.error('[welcome-message] ❌ Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne inconnue',
      };
    }
  }

  /**
   * Envoie un message de bienvenue par email
   */
  async sendEmailWelcome(
    userId: string,
    email: string,
    firstName?: string,
  ): Promise<WelcomeMessageResult> {
    return this.sendWelcomeMessage({
      user_id: userId,
      email,
      first_name: firstName,
      registration_method: 'email',
    });
  }

  /**
   * Envoie un message de bienvenue par SMS
   */
  async sendSMSWelcome(
    userId: string,
    phone: string,
    firstName?: string,
  ): Promise<WelcomeMessageResult> {
    return this.sendWelcomeMessage({
      user_id: userId,
      phone,
      first_name: firstName,
      registration_method: 'sms',
    });
  }
}

// Export du singleton
export const welcomeMessageService = new WelcomeMessageService();
export default welcomeMessageService;
