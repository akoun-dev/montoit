/**
 * Service de paiement via API InTouch
 * Documentation: https://developers.intouchgroup.net/documentation
 *
 * Méthodes disponibles:
 * - Payment Link: Envoie un lien de paiement par SMS/email/WhatsApp
 * - Direct API: Intègre le flux de paiement directement
 */

interface InTouchPaymentLinkRequest {
  email: string;
  destinataire: string; // Numéro de téléphone du client
  motif: string; // Description du paiement
  montant: number; // Montant en FCFA
  langue?: 'fr' | 'en'; // Langue du message (défaut: fr)
}

interface InTouchPaymentLinkResponse {
  service_id: string;
  destinataire: string;
  motif: string;
  email: string;
  link: string; // Lien de paiement
  montant: number;
  statut: string; // "202" pour succès
  message: string;
}

// Note: Les codes de service ne sont plus nécessaires pour Payment Link API
// Ils étaient utilisés pour l'ancienne API Direct paiement

class InTouchPaymentService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor() {
    // Récupérer l'URL Supabase et la clé anon
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  /**
   * Vérifie si le service InTouch est configuré
   */
  isConfigured(): boolean {
    return !!(this.supabaseUrl && this.supabaseAnonKey);
  }

  /**
   * Envoie un lien de paiement par SMS/email/WhatsApp (Payment Link)
   * C'est la méthode recommandée pour les paiements de loyer
   */
  async sendPaymentLink(params: InTouchPaymentLinkRequest): Promise<{
    success: boolean;
    data?: InTouchPaymentLinkResponse;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Service InTouch non configuré. Veuillez contacter l\'administrateur.',
      };
    }

    try {
      // Appeler l'Edge Function Supabase pour éviter les problèmes CORS
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/intouch-send-link`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: params.email,
            destinataire: params.destinataire,
            motif: params.motif,
            montant: params.montant,
            langue: params.langue || 'fr',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Erreur lors de l\'envoi du lien de paiement',
        };
      }

      const data = await response.json();

      if (data.success && data.data) {
        return {
          success: true,
          data: data.data as InTouchPaymentLinkResponse,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Erreur lors de la création du lien de paiement',
        };
      }
    } catch (error) {
      console.error('InTouch Payment Link Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion au service de paiement',
      };
    }
  }

  /**
   * Initie un paiement direct via l'API Direct
   * NOTE: Cette méthode nécessite une Edge Function séparée
   * Pour les paiements de loyer, préférez sendPaymentLink()
   */
  async initiateDirectPayment(params: {
    idFromClient: string;
    recipientEmail: string;
    recipientFirstName: string;
    recipientLastName: string;
    recipientNumber: string;
    amount: number;
    callback: string;
    serviceCode?: keyof typeof SERVICE_CODES;
  }): Promise<{
    success: boolean;
    data?: InTouchDirectPaymentResponse;
    paymentUrl?: string;
    error?: string;
  }> {
    // Cette méthode n'est pas encore implémentée
    // Utilisez sendPaymentLink() pour les paiements de loyer
    return {
      success: false,
      error: 'Le paiement direct n\'est pas encore disponible. Utilisez le lien de paiement SMS.',
    };
  }

  /**
   * Vérifie le statut d'une transaction
   * NOTE: Cette fonctionnalité sera ajoutée ultérieurement
   * Pour l'instant, utilisez les webhooks InTouch pour les notifications de statut
   */
  async checkTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    return {
      success: false,
      error: 'La vérification de statut sera disponible prochainement. Utilisez les webhooks pour les notifications.',
    };
  }
}

// Export singleton instance
export const intouchPaymentService = new InTouchPaymentService();

// Export types
export type {
  InTouchPaymentLinkRequest,
  InTouchPaymentLinkResponse,
};
