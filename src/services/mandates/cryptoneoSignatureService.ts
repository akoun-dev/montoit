/**
 * Service de signature électronique CryptoNeo avec OTP InTouch
 * Permet la signature électronique des mandats de gestion immobilière
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface SignatureRequest {
  mandateId: string;
  signatoryRole: 'owner' | 'agency';
  signatoryName: string;
  signatoryEmail: string;
  signatoryPhone: string; // Pour l'OTP InTouch
}

export interface SignatureStatus {
  status: 'pending' | 'owner_signed' | 'agency_signed' | 'completed' | 'failed' | 'expired';
  operationId: string | null;
  signedDocumentUrl: string | null;
  ownerSignedAt: string | null;
  agencySignedAt: string | null;
  expiresAt: string | null;
}

export interface InTouchOTPResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export interface CryptoNeoSignatureResponse {
  success: boolean;
  operationId?: string;
  signatureUrl?: string;
  error?: string;
}

// Configuration
const CRYPTONEO_CONFIG = {
  apiUrl: import.meta.env.VITE_CRYPTONEO_API_URL || 'https://api.cryptoneo.com/v1',
  apiKey: import.meta.env.VITE_CRYPTONEO_API_KEY,
  intouchApiUrl: import.meta.env.VITE_INTOUCH_API_URL || 'https://api.intouch.ci/v1',
  intouchApiKey: import.meta.env.VITE_INTOUCH_API_KEY,
  signatureExpiryHours: 72, // 72 heures pour signer
};

/**
 * Service CryptoNeo Signature Service
 */
class CryptoNeoSignatureService {
  /**
   * Initier une signature de mandat
   * Crée une opération CryptoNeo et envoie l'OTP via InTouch
   */
  async initiateSignature(request: SignatureRequest): Promise<CryptoNeoSignatureResponse> {
    try {
      // 1. Récupérer les informations du mandat
      const { data: mandate, error: mandateError } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city),
          agency:agencies(agency_name, email, phone),
          owner:profiles(full_name, email, phone)
        `)
        .eq('id', request.mandateId)
        .single();

      if (mandateError || !mandate) {
        console.error('Mandate not found:', mandateError);
        return { success: false, error: 'Mandat introuvable' };
      }

      // 2. Préparer les données pour CryptoNeo
      const signatureData = {
        documentName: `Mandat de gestion - ${mandate.property?.title || 'Bien immobilier'}`,
        documentType: 'MANDATE',
        signatories: [
          {
            id: mandate.owner_id,
            name: mandate.owner?.full_name || 'Propriétaire',
            email: mandate.owner?.email,
            phone: mandate.owner?.phone,
            role: 'PROPRIETAIRE',
          },
          {
            id: mandate.agency_id,
            name: mandate.agency?.agency_name || 'Agence',
            email: mandate.agency?.email,
            phone: mandate.agency?.phone,
            role: 'AGENCE',
          },
        ],
        expiryDate: new Date(
          Date.now() + CRYPTONEO_CONFIG.signatureExpiryHours * 60 * 60 * 1000
        ).toISOString(),
        metadata: {
          mandateId: mandate.id,
          propertyId: mandate.property_id,
          agencyId: mandate.agency_id,
          commissionRate: mandate.commission_rate,
          startDate: mandate.start_date,
          endDate: mandate.end_date,
        },
      };

      // 3. Créer l'opération de signature chez CryptoNeo
      const cryptoNeoResponse = await this.createCryptoNeoOperation(signatureData);

      if (!cryptoNeoResponse.success || !cryptoNeoResponse.operationId) {
        return {
          success: false,
          error: cryptoNeoResponse.error || 'Erreur lors de la création de la signature',
        };
      }

      // 4. Envoyer l'OTP via InTouch
      const signatoryPhone =
        request.signatoryRole === 'owner'
          ? mandate.owner?.phone
          : mandate.agency?.phone;

      if (signatoryPhone) {
        const otpResponse = await this.sendInTouchOTP({
          phoneNumber: signatoryPhone,
          operationId: cryptoNeoResponse.operationId,
          signatoryName: request.signatoryName,
        });

        if (!otpResponse.success) {
          console.warn('Failed to send OTP via InTouch:', otpResponse.error);
          // On continue quand même, l'utilisateur peut demander un nouvel OTP
        }
      }

      // 5. Mettre à jour le mandat avec les informations de signature
      const updateData: any = {
        cryptoneo_operation_id: cryptoNeoResponse.operationId,
        cryptoneo_signature_status:
          request.signatoryRole === 'owner' ? 'owner_signed' : 'agency_signed',
      };

      if (request.signatoryRole === 'owner') {
        updateData.owner_signed_at = new Date().toISOString();
      } else {
        updateData.agency_signed_at = new Date().toISOString();
      }

      // Vérifier si les deux parties ont signé
      const bothSigned =
        (mandate.owner_signed_at || request.signatoryRole === 'owner') &&
        (mandate.agency_signed_at || request.signatoryRole === 'agency');

      if (bothSigned) {
        updateData.cryptoneo_signature_status = 'completed';
        updateData.signed_mandate_url = cryptoNeoResponse.signatureUrl || null;
      }

      const { error: updateError } = await supabase
        .from('agency_mandates')
        .update(updateData)
        .eq('id', request.mandateId);

      if (updateError) {
        console.error('Error updating mandate:', updateError);
      }

      return {
        success: true,
        operationId: cryptoNeoResponse.operationId,
        signatureUrl: cryptoNeoResponse.signatureUrl,
      };
    } catch (error) {
      console.error('Error in initiateSignature:', error);
      return { success: false, error: 'Erreur lors de l\'initialisation de la signature' };
    }
  }

  /**
   * Créer une opération de signature chez CryptoNeo
   */
  private async createCryptoNeoOperation(data: any): Promise<CryptoNeoSignatureResponse> {
    try {
      // Dans un environnement réel, cela appellerait l'API CryptoNeo
      // Pour l'instant, nous simulons la réponse

      if (!CRYPTONEO_CONFIG.apiKey) {
        // Mode simulation - retourner une fausse réponse pour développement
        const mockOperationId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('CryptoNeo API: Simulation mode', { mockOperationId, data });

        return {
          success: true,
          operationId: mockOperationId,
          signatureUrl: `https://cryptoneo.com/sign/${mockOperationId}`,
        };
      }

      // Appel API réel (à implémenter avec l'API CryptoNeo)
      const response = await fetch(`${CRYPTONEO_CONFIG.apiUrl}/signatures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRYPTONEO_CONFIG.apiKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'Erreur API CryptoNeo',
        };
      }

      return {
        success: true,
        operationId: result.operationId,
        signatureUrl: result.signatureUrl,
      };
    } catch (error) {
      console.error('CryptoNeo API error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec CryptoNeo',
      };
    }
  }

  /**
   * Envoyer un OTP via InTouch
   */
  private async sendInTouchOTP(params: {
    phoneNumber: string;
    operationId: string;
    signatoryName: string;
  }): Promise<InTouchOTPResponse> {
    try {
      if (!CRYPTONEO_CONFIG.intouchApiKey) {
        // Mode simulation
        console.log('InTouch API: Simulation mode - OTP sent to', params.phoneNumber);
        return {
          success: true,
          transactionId: `mock_${Date.now()}`,
          message: 'OTP envoyé avec succès',
        };
      }

      // Appel API réel InTouch
      const response = await fetch(`${CRYPTONEO_CONFIG.intouchApiUrl}/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRYPTONEO_CONFIG.intouchApiKey}`,
        },
        body: JSON.stringify({
          phoneNumber: this.formatPhoneNumber(params.phoneNumber),
          message: `Votre code de signature pour le mandat est: {OTP}. Valide pendant 10 minutes.`,
          transactionId: params.operationId,
          expiryMinutes: 10,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'Erreur API InTouch',
        };
      }

      return {
        success: true,
        transactionId: result.transactionId,
        message: result.message,
      };
    } catch (error) {
      console.error('InTouch API error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec InTouch',
      };
    }
  }

  /**
   * Vérifier un OTP et finaliser la signature
   */
  async verifyOTPAndSign(params: {
    mandateId: string;
    otp: string;
    signatoryRole: 'owner' | 'agency';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Récupérer le mandat
      const { data: mandate, error } = await supabase
        .from('agency_mandates')
        .select('*')
        .eq('id', params.mandateId)
        .single();

      if (error || !mandate) {
        return { success: false, error: 'Mandat introuvable' };
      }

      if (!mandate.cryptoneo_operation_id) {
        return { success: false, error: 'Aucune signature en cours' };
      }

      // 2. Vérifier l'OTP avec CryptoNeo/InTouch
      const verificationResult = await this.verifyOTPWithInTouch({
        operationId: mandate.cryptoneo_operation_id,
        otp: params.otp,
      });

      if (!verificationResult.success) {
        return { success: false, error: 'Code OTP invalide' };
      }

      // 3. Mettre à jour le statut de signature
      const updateData: any = {};

      if (params.signatoryRole === 'owner') {
        updateData.owner_signed_at = new Date().toISOString();
        if (mandate.agency_signed_at) {
          updateData.cryptoneo_signature_status = 'completed';
        } else {
          updateData.cryptoneo_signature_status = 'owner_signed';
        }
      } else {
        updateData.agency_signed_at = new Date().toISOString();
        if (mandate.owner_signed_at) {
          updateData.cryptoneo_signature_status = 'completed';
        } else {
          updateData.cryptoneo_signature_status = 'agency_signed';
        }
      }

      // Si signature complète, récupérer l'URL du document signé
      if (updateData.cryptoneo_signature_status === 'completed') {
        const signedDoc = await this.getSignedDocumentUrl(mandate.cryptoneo_operation_id);
        updateData.signed_mandate_url = signedDoc.url;
      }

      const { error: updateError } = await supabase
        .from('agency_mandates')
        .update(updateData)
        .eq('id', params.mandateId);

      if (updateError) {
        console.error('Error updating mandate:', updateError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: 'Erreur lors de la vérification' };
    }
  }

  /**
   * Vérifier un OTP avec InTouch
   */
  private async verifyOTPWithInTouch(params: {
    operationId: string;
    otp: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!CRYPTONEO_CONFIG.intouchApiKey) {
        // Mode simulation - accepter n'importe quel OTP de 6 chiffres
        const isValid = /^\d{6}$/.test(params.otp);
        return {
          success: isValid,
          error: isValid ? undefined : 'OTP invalide (doit contenir 6 chiffres)',
        };
      }

      // Appel API réel InTouch
      const response = await fetch(`${CRYPTONEO_CONFIG.intouchApiUrl}/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRYPTONEO_CONFIG.intouchApiKey}`,
        },
        body: JSON.stringify({
          transactionId: params.operationId,
          otp: params.otp,
        }),
      });

      const result = await response.json();

      return {
        success: result.valid || false,
        error: result.valid ? undefined : result.message,
      };
    } catch (error) {
      console.error('InTouch verification error:', error);
      return { success: false, error: 'Erreur de vérification' };
    }
  }

  /**
   * Récupérer l'URL du document signé
   */
  private async getSignedDocumentUrl(operationId: string): Promise<{ url: string | null }> {
    try {
      if (!CRYPTONEO_CONFIG.apiKey) {
        // Mode simulation
        return { url: `https://cryptoneo.com/documents/${operationId}/signed` };
      }

      const response = await fetch(`${CRYPTONEO_CONFIG.apiUrl}/signatures/${operationId}/document`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CRYPTONEO_CONFIG.apiKey}`,
        },
      });

      const result = await response.json();

      return { url: result.documentUrl || null };
    } catch (error) {
      console.error('Error getting signed document:', error);
      return { url: null };
    }
  }

  /**
   * Renvoyer un OTP
   */
  async resendOTP(mandateId: string, signatoryRole: 'owner' | 'agency'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: mandate, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          owner:profiles(full_name, phone),
          agency:agencies(agency_name, phone)
        `)
        .eq('id', mandateId)
        .single();

      if (error || !mandate) {
        return { success: false, error: 'Mandat introuvable' };
      }

      if (!mandate.cryptoneo_operation_id) {
        return { success: false, error: 'Aucune signature en cours' };
      }

      const signatoryPhone =
        signatoryRole === 'owner' ? mandate.owner?.phone : mandate.agency?.phone;
      const signatoryName =
        signatoryRole === 'owner'
          ? mandate.owner?.full_name
          : mandate.agency?.agency_name;

      if (!signatoryPhone) {
        return { success: false, error: 'Numéro de téléphone introuvable' };
      }

      const result = await this.sendInTouchOTP({
        phoneNumber: signatoryPhone,
        operationId: mandate.cryptoneo_operation_id,
        signatoryName: signatoryName || '',
      });

      return result;
    } catch (error) {
      console.error('Error resending OTP:', error);
      return { success: false, error: 'Erreur lors de l\'envoi de l\'OTP' };
    }
  }

  /**
   * Formatter un numéro de téléphone pour la Côte d'Ivoire
   */
  private formatPhoneNumber(phone: string): string {
    // Nettoyer le numéro
    let cleaned = phone.replace(/\D/g, '');

    // Ajouter le code pays si nécessaire
    if (!cleaned.startsWith('225')) {
      cleaned = '225' + cleaned;
    }

    return cleaned;
  }

  /**
   * Obtenir le statut de signature d'un mandat
   */
  async getSignatureStatus(mandateId: string): Promise<SignatureStatus | null> {
    try {
      const { data, error } = await supabase
        .from('agency_mandates')
        .select('cryptoneo_signature_status, cryptoneo_operation_id, signed_mandate_url, owner_signed_at, agency_signed_at, created_at')
        .eq('id', mandateId)
        .single();

      if (error || !data) {
        return null;
      }

      // Calculer la date d'expiration
      const expiresAt = data.created_at
        ? new Date(new Date(data.created_at).getTime() + CRYPTONEO_CONFIG.signatureExpiryHours * 60 * 60 * 1000).toISOString()
        : null;

      return {
        status: data.cryptoneo_signature_status || 'pending',
        operationId: data.cryptoneo_operation_id,
        signedDocumentUrl: data.signed_mandate_url,
        ownerSignedAt: data.owner_signed_at,
        agencySignedAt: data.agency_signed_at,
        expiresAt,
      };
    } catch (error) {
      console.error('Error getting signature status:', error);
      return null;
    }
  }
}

// Export singleton
export const cryptoneoSignatureService = new CryptoNeoSignatureService();
export default cryptoneoSignatureService;
