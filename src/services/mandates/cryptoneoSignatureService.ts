/**
 * Service de signature électronique CryptoNeo
 * Permet la signature électronique des mandats de gestion immobilière
 * Documentation: https://ansut.cryptoneoplatforms.com/esignaturedemo
 *
 * Flow:
 * 1. Authentication (POST /user/auth) → Token
 * 2. Generate Certificate (POST /generateCert/generateCertificat) → aliasCertificat
 * 3. Send OTP (POST /otp/send) → OTP envoyé par email/SMS
 * 4. Sign Batch (POST /sign/signFileBatch) → operationId
 * 5. Verify Signature (POST /sign/verifySignedBatch) → Polling jusqu'à statusCode 7000
 * 6. Download Signed File (GET /sign/getSignedFile/{fileName})
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface SignatureRequest {
  mandateId: string;
  signatoryRole: 'owner' | 'agency';
  signatoryName?: string;
  signatoryEmail?: string;
}

export interface SignatureStatus {
  status: 'pending' | 'owner_signed' | 'agency_signed' | 'completed' | 'failed' | 'expired';
  operationId: string | null;
  signedDocumentUrl: string | null;
  ownerSignedAt: string | null;
  agencySignedAt: string | null;
  expiresAt: string | null;
}

export interface CryptoNeoOTPResponse {
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
  baseUrl: import.meta.env.VITE_CRYPTONEO_BASE_URL || 'https://ansut.cryptoneoplatforms.com/esignaturedemo',
  appKey: import.meta.env.VITE_CRYPTONEO_APP_KEY,
  appSecret: import.meta.env.VITE_CRYPTONEO_APP_SECRET,
  signatureExpiryHours: 72, // 72 heures pour signer
};

// Token storage
let authToken: string | null = null;

/**
 * Récupère ou génère le token d'authentification
 */
async function getAuthToken(): Promise<string> {
  if (authToken) {
    return authToken;
  }

  if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
    throw new Error('Clés API CryptoNeo non configurées');
  }

  const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/user/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appKey: CRYPTONEO_CONFIG.appKey,
      appSecret: CRYPTONEO_CONFIG.appSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur d\'authentification CryptoNeo');
  }

  const result = await response.json();
  authToken = result.data?.token;

  if (!authToken) {
    throw new Error('Token non reçu de CryptoNeo');
  }

  return authToken;
}

/**
 * Service CryptoNeo Signature Service
 */
class CryptoNeoSignatureService {
  /**
   * Initier une signature de mandat
   * Crée un certificat CryptoNeo et envoie l'OTP
   */
  async initiateSignature(request: SignatureRequest): Promise<CryptoNeoSignatureResponse> {
    try {
      // 1. Récupérer les informations du mandat
      const { data: mandate, error: mandateError } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city),
          agency:profiles!agency_mandates_agency_id_fkey(agency_name, email, phone),
          owner:profiles!agency_mandates_owner_id_fkey(full_name, email, phone)
        `)
        .eq('id', request.mandateId)
        .single();

      if (mandateError || !mandate) {
        console.error('Mandate not found:', mandateError);
        return { success: false, error: 'Mandat introuvable' };
      }

      // 2. Déterminer le signataire actuel
      const signatory = request.signatoryRole === 'owner'
        ? {
            id: mandate.owner_id,
            name: mandate.owner?.full_name || 'Propriétaire',
            email: mandate.owner?.email,
            phone: mandate.owner?.phone,
            role: 'PROPRIETAIRE',
          }
        : {
            id: mandate.agency_id,
            name: mandate.agency?.agency_name || 'Agence',
            email: mandate.agency?.email,
            phone: mandate.agency?.phone,
            role: 'AGENCE',
          };

      // 3. Créer l'opération de signature chez CryptoNeo (génère certificat + envoie OTP)
      const cryptoNeoResponse = await this.createCryptoNeoOperation({
        signatoryRole: request.signatoryRole,
        signatories: [signatory],
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
      });

      if (!cryptoNeoResponse.success || !cryptoNeoResponse.operationId) {
        return {
          success: false,
          error: cryptoNeoResponse.error || 'Erreur lors de la création de la signature',
        };
      }

      // 4. Mettre à jour le mandat avec l'ID d'opération (alias du certificat)
      // Note: Le statut de signature sera mis à jour après vérification OTP
      const updateData: any = {
        cryptoneo_operation_id: cryptoNeoResponse.operationId,
      };

      // Si c'est une nouvelle signature, réinitialiser les dates
      if (!mandate.cryptoneo_operation_id || mandate.cryptoneo_operation_id !== cryptoNeoResponse.operationId) {
        if (request.signatoryRole === 'owner') {
          updateData.owner_signed_at = null;
        } else {
          updateData.agency_signed_at = null;
        }
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
      };
    } catch (error) {
      console.error('Error in initiateSignature:', error);
      return { success: false, error: 'Erreur lors de l\'initialisation de la signature' };
    }
  }

  /**
   * Générer un certificat chez CryptoNeo
   * Documentation: POST /generateCert/generateCertificat
   */
  private async generateCertificate(data: {
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
    phone: string;
    organisation: string;
    typePiece: string;
    hashPiece: string;
    base64: string;
    consent: boolean;
    consentDate: string;
  }): Promise<{ success: boolean; aliasCertificat?: string; error?: string }> {
    try {
      if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
        // Mode simulation
        const mockAlias = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('CryptoNeo API: Simulation mode - generateCertificate', { mockAlias, data });
        return { success: true, aliasCertificat: mockAlias };
      }

      const token = await getAuthToken();

      const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/generateCert/generateCertificat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.statusMessage || result.message || 'Erreur API CryptoNeo',
        };
      }

      return {
        success: true,
        aliasCertificat: result.data?.aliasCertificat,
      };
    } catch (error) {
      console.error('CryptoNeo generateCertificate error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec CryptoNeo',
      };
    }
  }

  /**
   * Envoyer un OTP via CryptoNeo
   * Documentation: POST /otp/send
   */
  private async sendOTP(params: {
    aliasCertificat: string;
    canal: 'MAIL' | 'SMS';
  }): Promise<CryptoNeoOTPResponse> {
    try {
      if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
        // Mode simulation
        console.log('CryptoNeo API: Simulation mode - sendOTP', params);
        return {
          success: true,
          transactionId: `mock_${Date.now()}`,
          message: 'OTP envoyé avec succès',
        };
      }

      const token = await getAuthToken();

      const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          aliasCertificat: params.aliasCertificat,
          typeOperation: 'SIGNATURE_ELECTRONIQUE',
          canal: params.canal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.statusMessage || result.message || 'Erreur API CryptoNeo',
        };
      }

      return {
        success: true,
        transactionId: result.data?.transactionId,
        message: result.statusMessage || 'OTP envoyé',
      };
    } catch (error) {
      console.error('CryptoNeo sendOTP error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec CryptoNeo',
      };
    }
  }

  /**
   * Signer des documents
   * Documentation: POST /sign/signFileBatch
   */
  private async signBatch(params: {
    aliasCertificat: string;
    otp: string;
    callBackUrl: string;
    signRequest: Array<{
      codeDoc: string;
      urlDoc: string;
      hashDoc: string;
      visibiliteImage: boolean;
      urlImage: string;
      hashImage: string;
      positionImage: string;
      pageImage: string;
      lieuSignature: string;
      motifSignature: string;
    }>;
  }): Promise<{ success: boolean; operationId?: string; error?: string }> {
    try {
      if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
        // Mode simulation
        const mockOperationId = `mock_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('CryptoNeo API: Simulation mode - signBatch', { mockOperationId, params });
        return { success: true, operationId: mockOperationId };
      }

      const token = await getAuthToken();

      const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/sign/signFileBatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.statusMessage || result.message || 'Erreur API CryptoNeo',
        };
      }

      return {
        success: true,
        operationId: result.data?.operationId,
      };
    } catch (error) {
      console.error('CryptoNeo signBatch error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec CryptoNeo',
      };
    }
  }

  /**
   * Vérifier une signature
   * Documentation: POST /sign/verifySignedBatch
   */
  private async verifySignedBatch(operationId: string): Promise<{
    success: boolean;
    results?: Array<{
      statusCode: number;
      statusMessage: string;
      data: {
        fileName: string;
        hashSignDoc?: string;
      };
    }>;
    error?: string;
  }> {
    try {
      if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
        // Mode simulation - retourne succès après quelques tentatives
        console.log('CryptoNeo API: Simulation mode - verifySignedBatch', { operationId });
        return {
          success: true,
          results: [{
            statusCode: 7000,
            statusMessage: 'Signature réussie',
            data: { fileName: 'mandat_signed.pdf' },
          }],
        };
      }

      const token = await getAuthToken();

      const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/sign/verifySignedBatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ operationId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.statusMessage || result.message || 'Erreur API CryptoNeo',
        };
      }

      return {
        success: true,
        results: result.data?.results,
      };
    } catch (error) {
      console.error('CryptoNeo verifySignedBatch error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec CryptoNeo',
      };
    }
  }

  /**
   * Télécharger un document signé
   * Documentation: GET /sign/getSignedFile/{fileName}
   */
  private async downloadSignedFile(fileName: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
        // Mode simulation
        console.log('CryptoNeo API: Simulation mode - downloadSignedFile', { fileName });
        return { success: true, blob: new Blob(['mock document']) };
      }

      const token = await getAuthToken();

      const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/sign/getSignedFile/${fileName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        return {
          success: false,
          error: result.statusMessage || result.message || 'Erreur API CryptoNeo',
        };
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      console.error('CryptoNeo downloadSignedFile error:', error);
      return {
        success: false,
        error: 'Erreur de connexion avec CryptoNeo',
      };
    }
  }

  /**
   * Créer une opération de signature chez CryptoNeo (méthode principale)
   */
  private async createCryptoNeoOperation(signatureData: any): Promise<CryptoNeoSignatureResponse> {
    try {
      // 1. Générer le certificat pour le signataire
      const signatory = signatureData.signatories.find((s: any) =>
        s.role === (signatureData.metadata?.signatoryRole || 'PROPRIETAIRE')
      ) || signatureData.signatories[0];

      const certResponse = await this.generateCertificate({
        firstName: signatory.name?.split(' ')[0] || '',
        lastName: signatory.name?.split(' ').slice(1).join(' ') || signatory.name || '',
        gender: 'Homme',
        email: signatory.email || '',
        phone: signatory.phone || '',
        organisation: signatory.role === 'AGENCE' ? 'Agence Immobilière' : 'Particulier',
        typePiece: 'CNI',
        hashPiece: '',
        base64: '',
        consent: true,
        consentDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      if (!certResponse.success || !certResponse.aliasCertificat) {
        return {
          success: false,
          error: certResponse.error || 'Erreur lors de la génération du certificat',
        };
      }

      // 2. Envoyer l'OTP
      const otpResponse = await this.sendOTP({
        aliasCertificat: certResponse.aliasCertificat,
        canal: 'MAIL', // Par défaut, email
      });

      if (!otpResponse.success) {
        console.warn('Failed to send OTP:', otpResponse.error);
      }

      return {
        success: true,
        operationId: certResponse.aliasCertificat, // Utiliser l'alias comme operationId
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

      // 2. Signer avec l'OTP via signBatch
      const signResponse = await this.signBatch({
        aliasCertificat: mandate.cryptoneo_operation_id,
        otp: params.otp,
        callBackUrl: `${window.location.origin}/api/cryptoneo/callback`,
        signRequest: [
          {
            codeDoc: `MANDATE_${mandate.id}`,
            urlDoc: mandate.mandate_url || '',
            hashDoc: mandate.mandate_hash || '',
            visibiliteImage: true,
            urlImage: '',
            hashImage: '',
            positionImage: '130,213',
            pageImage: '1',
            lieuSignature: 'Abidjan',
            motifSignature: 'Signature Electronique - Mandat de Gestion Immobilière',
          },
        ],
      });

      if (!signResponse.success || !signResponse.operationId) {
        return { success: false, error: signResponse.error || 'Erreur lors de la signature' };
      }

      // 3. Polling pour vérifier le statut
      const maxAttempts = 20; // 20 essais max
      const pollInterval = 3000; // 3 secondes entre chaque vérification

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const verifyResponse = await this.verifySignedBatch(signResponse.operationId);

        if (verifyResponse.success && verifyResponse.results) {
          const result = verifyResponse.results[0];

          // StatusCode 7000 = Signature réussie
          if (result.statusCode === 7000) {
            // 4. Mettre à jour le statut de signature
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

            // Si signature complète, stocker le nom du fichier
            if (updateData.cryptoneo_signature_status === 'completed') {
              updateData.signed_mandate_file_name = result.data.fileName;
            }

            const { error: updateError } = await supabase
              .from('agency_mandates')
              .update(updateData)
              .eq('id', params.mandateId);

            if (updateError) {
              console.error('Error updating mandate:', updateError);
            }

            return { success: true };
          }

          // StatusCode autre que 7000 = Erreur ou en attente
          if (result.statusCode < 7000) {
            return { success: false, error: result.statusMessage || 'Erreur lors de la signature' };
          }
        }
      }

      // Timeout après maxAttempts
      return { success: false, error: 'Délai d\'attente dépassé. Veuillez réessayer.' };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: 'Erreur lors de la vérification' };
    }
  }

  /**
   * Récupérer l'URL du document signé
   */
  private async getSignedDocumentUrl(fileName: string): Promise<{ url: string | null }> {
    try {
      if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
        // Mode simulation
        return { url: `https://cryptoneo.com/documents/${fileName}/signed` };
      }

      const token = await getAuthToken();

      const response = await fetch(`${CRYPTONEO_CONFIG.baseUrl}/sign/getSignedFile/${fileName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { url: null };
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      return { url };
    } catch (error) {
      console.error('Error getting signed document:', error);
      return { url: null };
    }
  }

  /**
   * Renvoyer un OTP via CryptoNeo
   */
  async resendOTP(mandateId: string, signatoryRole: 'owner' | 'agency', canal: 'MAIL' | 'SMS' = 'MAIL'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: mandate, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          owner:profiles!agency_mandates_owner_id_fkey(full_name, phone),
          agency:profiles!agency_mandates_agency_id_fkey(agency_name, phone)
        `)
        .eq('id', mandateId)
        .single();

      if (error || !mandate) {
        return { success: false, error: 'Mandat introuvable' };
      }

      if (!mandate.cryptoneo_operation_id) {
        return { success: false, error: 'Aucune signature en cours' };
      }

      const result = await this.sendOTP({
        aliasCertificat: mandate.cryptoneo_operation_id,
        canal,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Erreur lors de l\'envoi de l\'OTP' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error resending OTP:', error);
      return { success: false, error: 'Erreur lors de l\'envoi de l\'OTP' };
    }
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
