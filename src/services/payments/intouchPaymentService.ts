/**
 * Service de paiement Mobile Money via API InTouch
 * Utilise une Edge Function Supabase comme proxy pour éviter les problèmes CORS
 * Documentation: https://apidist.gutouch.net/apidist/sec
 */

import { supabase } from '@/integrations/supabase/client';

export type MobileMoneyOperator = 'OM' | 'MTN' | 'MOOV' | 'WAVE';

export interface PaymentRequest {
  amount: number;
  recipient_phone_number: string;
  partner_transaction_id?: string;
  callback_url?: string;
  operator: MobileMoneyOperator;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  message: string;
  data?: unknown;
}

class InTouchService {
  /**
   * Vérifie si le service InTouch est configuré
   */
  isConfigured(): boolean {
    return !!(
      import.meta.env.VITE_INTOUCH_USERNAME &&
      import.meta.env.VITE_INTOUCH_PASSWORD
    );
  }

  /**
   * Initie un paiement Mobile Money via l'Edge Function Supabase
   * Utilise fetch directement avec timeout pour éviter les problèmes de hang
   */
  async initiatePayment(data: PaymentRequest): Promise<PaymentResponse> {
    if (!this.isConfigured()) {
      throw new Error('Service InTouch non configuré');
    }

    console.log('[InTouch] Initiating payment via Edge Function:', data);

    // Récupérer les infos de session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Non authentifié');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/initiate-payment`;

    console.log('[InTouch] Calling Edge Function with fetch:', functionUrl);

    try {
      // Utiliser fetch avec un timeout de 30 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[InTouch] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[InTouch] Edge Function returned error:', errorData);
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const responseData = await response.json();
      console.log('[InTouch] Payment response:', responseData);

      if (!responseData.success) {
        throw new Error(responseData.error || 'Erreur lors de l\'initiation du paiement');
      }

      return responseData;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[InTouch] Request timeout after 30s');
        throw new Error('Délai d\'attente dépassé - Le serveur ne répond pas');
      }
      console.error('[InTouch] Payment exception:', err);
      throw err;
    }
  }

  /**
   * Formate un numéro de téléphone pour l'API InTouch
   * Nouveau format Côte d'Ivoire : 10 chiffres (depuis 31/01/2021)
   */
  formatPhoneNumber(phone: string): string {
    // Supprimer tous les caractères non numériques
    let formatted = phone.replace(/\D/g, '');

    // Supprimer l'indicatif pays 225 si présent
    if (formatted.startsWith('225')) {
      formatted = formatted.substring(3);
    }

    return formatted;
  }

  /**
   * Valide un numéro de téléphone ivoirien
   * Nouveau format : 10 chiffres (depuis le 31/01/2021)
   */
  validatePhoneNumber(phone: string): {
    valid: boolean;
    formatted: string;
    error?: string
  } {
    const cleaned = phone.replace(/\D/g, '');

    // Accepter 10 chiffres (nouveau format) ou 12 avec l'indicatif 225
    if (cleaned.length < 10) {
      return {
        valid: false,
        formatted: cleaned,
        error: `Numéro de téléphone invalide (doit contenir 10 chiffres, trouvé: ${cleaned.length})`
      };
    }

    if (cleaned.length > 12) {
      return {
        valid: false,
        formatted: cleaned,
        error: 'Numéro de téléphone invalide (trop long)'
      };
    }

    const formatted = this.formatPhoneNumber(phone);

    // Après formatage, on doit avoir 10 chiffres
    if (formatted.length !== 10) {
      return {
        valid: false,
        formatted,
        error: `Numéro de téléphone invalide (doit contenir 10 chiffres, trouvé: ${formatted.length})`
      };
    }

    // Préfixes opérateurs Mobile Money en Côte d'Ivoire (nouveau format 2021)
    const validMobilePrefixes = [
      '01', // Moov
      '05', // MTN
      '07', // Orange
      '04', // Wave
    ];

    // Vérifier le préfixe (2 premiers chiffres)
    const prefix = formatted.substring(0, 2);

    if (!validMobilePrefixes.includes(prefix)) {
      return {
        valid: false,
        formatted,
        error: `Préfixe de numéro invalide pour Mobile Money (${prefix}). Préfixes valides: 01 (Moov), 05 (MTN), 07 (Orange), 04 (Wave)`
      };
    }

    return { valid: true, formatted };
  }
}

// Export singleton instance
export const intouchService = new InTouchService();

// Export types
export type {
  PaymentRequest,
  PaymentResponse,
  MobileMoneyOperator,
};
