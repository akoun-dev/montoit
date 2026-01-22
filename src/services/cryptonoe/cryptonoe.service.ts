/**
 * Service CryptoNeo pour la signature électronique
 * Ce service communique avec les Edge Functions Supabase pour sécuriser les clés API
 */

import { supabase } from '@/integrations/supabase/client';
import { apiKeysConfig } from '@/shared/config/api-keys.config';

// Types pour les réponses CryptoNeo
export interface CryptoNeoAuthResponse {
  token: string;
}

export interface CertificateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organisation: string;
  typePiece: string;
  hashPiece: string;
  base64?: string;
}

export interface CertificateResponse {
  statusCode: number;
  statusMessage: string;
  data: {
    certificatId: string;
    alias: string;
  };
}

export interface OTPSendRequest {
  phone?: string;
  email?: string;
  canal?: 'SMS' | 'MAIL';
  aliasCertificat?: string;
  typeOperation?: string;
}

export interface OTPSendResponse {
  statusCode: number;
  statusMessage: string;
  data: any;
}

export interface SignDocumentRequest {
  documents: SignRequestItem[];
  otp: string;
  callbackUrl?: string;
}

export interface SignRequestItem {
  codeDoc: string;
  urlDoc: string;
  hashDoc: string;
  visibiliteImage: boolean;
  urlImage?: string;
  hashImage: string;
  pageImage?: number | string;
  positionImage?: string;
  messageImage: boolean;
  lieuSignature: string;
  motifSignature: string;
}

export interface SignDocumentResponse {
  statusCode: number;
  statusMessage: string;
  data: {
    operationId: number;
  };
}

export interface SignatureVerifyResponse {
  statusCode: number;
  statusMessage: string;
  data: {
    operationId: number;
    results: SignatureResult[];
  };
}

export interface SignatureResult {
  statusCode: number;
  statusMessage: string;
  codeDoc: string;
  data?: {
    fileName: string;
    downloadUrl: string;
    hashSignDoc: string;
  };
  erreur?: string;
}

/**
 * Classe de service CryptoNeo
 */
export class CryptoNeoService {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    return apiKeysConfig.signature.cryptoneo.isConfigured;
  }

  /**
   * Récupère le token d'authentification (avec cache)
   */
  private async getAuthToken(): Promise<string> {
    // Vérifier le cache
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const { data, error } = await supabase.functions.invoke('cryptoneo-auth');

    if (error) {
      console.error('CryptoNeo auth error:', error);
      throw new Error(`Erreur d'authentification CryptoNeo: ${error.message}`);
    }

    if (!data?.token) {
      throw new Error('Token non reçu de CryptoNeo');
    }

    // Mettre en cache pour 55 minutes
    this.tokenCache = {
      token: data.token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };

    return data.token;
  }

  /**
   * Génère un certificat numérique pour l'utilisateur
   */
  async generateCertificate(request: CertificateRequest): Promise<CertificateResponse> {
    // Use fetch directly to get better error handling
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${supabase.functions.url}/cryptoneo-generate-certificate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const responseText = await response.text();

    console.log('CryptoNeo generateCertificate response:', {
      status: response.status,
      ok: response.ok,
      body: responseText.substring(0, 500),
    });

    if (!response.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        throw new Error(errorJson.error || errorJson.message || responseText);
      } catch {
        throw new Error(`Erreur de génération de certificat (${response.status}): ${responseText}`);
      }
    }

    const data = JSON.parse(responseText);
    return data as CertificateResponse;
  }

  /**
   * Envoie un code OTP par SMS ou email
   */
  async sendOTP(request: OTPSendRequest): Promise<OTPSendResponse> {
    const { data, error } = await supabase.functions.invoke('cryptoneo-send-otp', {
      body: {
        phone: request.phone,
        email: request.email,
      },
    });

    if (error) {
      console.error('CryptoNeo OTP send error:', error);
      throw new Error(`Erreur d'envoi OTP: ${error.message}`);
    }

    return data as OTPSendResponse;
  }

  /**
   * Signe des documents électroniquement
   */
  async signDocuments(request: SignDocumentRequest): Promise<SignDocumentResponse> {
    const { data, error } = await supabase.functions.invoke('cryptoneo-sign-document', {
      body: request,
    });

    if (error) {
      console.error('CryptoNeo sign documents error:', error);
      throw new Error(`Erreur de signature: ${error.message}`);
    }

    return data as SignDocumentResponse;
  }

  /**
   * Vérifie le statut d'une signature
   */
  async verifySignature(operationId: string): Promise<SignatureVerifyResponse> {
    const { data, error } = await supabase.functions.invoke('cryptoneo-verify-signature', {
      body: { operationId },
    });

    if (error) {
      console.error('CryptoNeo verify signature error:', error);
      throw new Error(`Erreur de vérification: ${error.message}`);
    }

    return data as SignatureVerifyResponse;
  }

  /**
   * Calcule le hash SHA-256 d'un fichier
   */
  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Télécharge un fichier et calcule son hash
   */
  async downloadAndHashFile(url: string): Promise<{ buffer: ArrayBuffer; hash: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur téléchargement fichier: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return { buffer, hash };
  }

  /**
   * Convertit un fichier en base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extraire seulement la partie base64 (sans le préfixe data:application/pdf;base64,)
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Crée un blob depuis une URL de données
   */
  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'application/pdf';
    const bstr = atob(arr[1] || '');
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

// Instance singleton du service
export const cryptoNeoService = new CryptoNeoService();

export default cryptoNeoService;
