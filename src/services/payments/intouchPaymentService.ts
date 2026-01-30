/**
 * Service de paiement Mobile Money via API InTouch
 * Documentation: https://apidist.gutouch.net/apidist/sec
 */

export type MobileMoneyOperator = 'OM' | 'MTN' | 'MOOV' | 'WAVE';

export interface PaymentRequest {
  amount: number;
  recipient_phone_number: string;
  partner_transaction_id: string;
  callback_url: string;
  operator: MobileMoneyOperator;
}

export interface PaymentResponse {
  transaction_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  message: string;
}

// Service IDs pour chaque opérateur Mobile Money
const SERVICE_IDS: Record<MobileMoneyOperator, string> = {
  'OM': 'CASHINOMCIPART2',
  'MTN': 'CASHINMTNPART2',
  'MOOV': 'CASHINMOOVPART2',
  'WAVE': 'CI_CASHIN_WAVE_PART',
};

class InTouchService {
  private baseUrl = import.meta.env.VITE_INTOUCH_BASE_URL || import.meta.env.VITE_INTOUCH_API_URL || 'https://apidist.gutouch.net/apidist/sec';
  private username = import.meta.env.VITE_INTOUCH_USERNAME || '';
  private password = import.meta.env.VITE_INTOUCH_PASSWORD || '';
  private partnerId = import.meta.env.VITE_INTOUCH_PARTNER_ID || 'CI300373';
  private loginApi = import.meta.env.VITE_INTOUCH_LOGIN_API || '07084598370';
  private passwordApi = import.meta.env.VITE_INTOUCH_PASSWORD_API || '';

  /**
   * Vérifie si le service InTouch est configuré
   */
  isConfigured(): boolean {
    return !!(
      this.baseUrl &&
      this.username &&
      this.password &&
      this.partnerId
    );
  }

  /**
   * Initie un paiement Mobile Money
   */
  async initiatePayment(data: PaymentRequest): Promise<PaymentResponse> {
    if (!this.isConfigured()) {
      throw new Error('Service InTouch non configuré');
    }

    const { operator, ...paymentData } = data;

    const serviceId = SERVICE_IDS[operator];
    const endpoint = operator === 'WAVE'
      ? `${this.baseUrl}/touchpayapi/ANSUT13287/transaction`
      : `${this.baseUrl}/ANSUT13287/cashin`;

    const payload = this.buildPaymentPayload(serviceId, paymentData, operator);

    console.log('[InTouch] Initiating payment:', { endpoint, operator, payload });

    const response = await fetch(endpoint, {
      method: operator === 'WAVE' ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[InTouch] Payment failed:', response.status, errorText);
      throw new Error(`Payment initiation failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[InTouch] Payment response:', result);

    return result;
  }

  /**
   * Construit le payload selon l'opérateur
   */
  private buildPaymentPayload(
    serviceId: string,
    data: Omit<PaymentRequest, 'operator'>,
    operator: MobileMoneyOperator
  ): Record<string, unknown> {
    if (operator === 'WAVE') {
      return {
        idFromClient: data.partner_transaction_id,
        additionnalInfos: {
          recipientEmail: '',
          recipientFirstName: '',
          recipientLastName: '',
          destinataire: data.recipient_phone_number,
          partner_name: 'MonToit',
          return_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`,
        },
        amount: data.amount,
        callback: data.callback_url,
        recipientNumber: data.recipient_phone_number,
        serviceCode: 'CI_PAIEMENTWAVE_TP',
      };
    }

    return {
      service_id: serviceId,
      recipient_phone_number: data.recipient_phone_number,
      amount: data.amount,
      partner_id: this.partnerId,
      partner_transaction_id: data.partner_transaction_id,
      login_api: this.loginApi,
      password_api: this.passwordApi,
      call_back_url: data.callback_url,
    };
  }

  /**
   * Vérifie le statut d'un paiement
   */
  async checkPaymentStatus(transactionId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Service InTouch non configuré');
    }

    const response = await fetch(
      `${this.baseUrl}/ANSUT13287/status/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check payment status: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Récupère le solde du compte InTouch
   */
  async getBalance(): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Service InTouch non configuré');
    }

    const response = await fetch(
      `${this.baseUrl}/ANSUT13287/get_balance`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
        },
        body: JSON.stringify({
          partner_id: this.partnerId,
          login_api: this.loginApi,
          password_api: this.passwordApi,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get balance: ${response.statusText}`);
    }

    return await response.json();
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

    // NE PAS supprimer le 0 au début (c'est le préfixe opérateur)
    // Les nouveaux numéros font 10 chiffres avec le 0 inclus

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
      '04', // Wave (aussi disponible)
    ];

    // Préfixes fixes (non mobiles mais valides)
    const validFixedPrefixes = [
      '02', '03', '08', '09', '20', '21', '22', '23', '24', '25',
      '26', '27', '28', '29', '30', '31', '32', '33', '34', '35',
      '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
      '46', '47', '48', '49', '50', '51', '52', '53', '54', '55',
      '56', '57', '58', '59', '60', '61', '62', '63', '64', '65',
      '66', '67', '68', '69', '70', '71', '72', '73', '74', '75',
      '76', '77', '78', '79', '80', '81', '82', '83', '84', '85',
      '86', '87', '88', '89'
    ];

    // Vérifier le préfixe (2 premiers chiffres)
    const prefix = formatted.substring(0, 2);
    const allValidPrefixes = [...validMobilePrefixes, ...validFixedPrefixes];

    if (!allValidPrefixes.includes(prefix)) {
      return {
        valid: false,
        formatted,
        error: `Préfixe de numéro invalide pour la Côte d'Ivoire (${prefix}). Préfixes Mobile Money: 01 (Moov), 05 (MTN), 07 (Orange), 04 (Wave)`
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
