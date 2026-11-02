/**
 * Service ONECI - Vérification d'identité nationale
 * API documentation: https://api-rnpp.verif.ci/api/v1
 *
 * Ce service gère les appels vers l'API ONECI pour :
 * - L'authentification et récupération du token
 * - La vérification d'identité par numéro CNI
 * - L'authentification faciale
 * - La vérification du quota de requêtes
 */

import { apiKeysConfig } from '@/shared/config/api-keys.config';
import { processImageForOneCI } from '@/features/verification/services/image-processing';

// ============ Types ONECI ============

export interface OneCITokenResponse {
  bearerToken: string;
  expiresIn: number;
}

export interface OneCIIdentityVerification {
  nni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: string;
  matchScore?: number;
  isVerified: boolean;
  rawResponse?: any;
  birthTown?: string;
  birthCountry?: string;
  nationality?: string;
  residenceAdr1?: string;
  residenceAdr2?: string;
  residenceTown?: string;
}

export interface OneCIFaceAuthRequest {
  nni: string;
  biometricData: string; // base64 image
}

export interface OneCIAuthResponse {
  isAuthenticated: boolean;
  confidenceScore?: number;
  details?: any;
}

export interface OneCIRequestCount {
  remainingRequests: number;
  totalQuota?: number;
}

// ============ Service Class ============

class OneCiService {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    const config = apiKeysConfig.verification.oneci;

    // Debug logs pour vérifier les valeurs lues
    console.log('ONECI Config:', {
      apiKey: config.key,
      secretKey: config.secretKey,
      secretKeyLength: config.secretKey?.length,
      endpoint: config.endpoint,
    });

    if (!config.isConfigured) {
      console.warn('ONECI API is not configured properly');
    }

    this.baseUrl = config.endpoint || config.apiBase;
    this.apiKey = config.key;
    this.secretKey = config.secretKey;
  }

  /**
   * Valide et nettoie le format du NNI
   * Le NNI doit contenir exactement 11 chiffres (sans préfixe CI ou autre)
   */
  private validateAndCleanNni(nni: string): string {
    console.log('[OneCiService] NNI original:', nni);

    // Supprimer tous les caractères non numériques
    const cleanedNni = nni.replace(/[^0-9]/g, '');
    console.log('[OneCiService] NNI nettoyé:', cleanedNni);

    // Vérifier la longueur (11 chiffres selon le format RNPP)
    if (cleanedNni.length !== 11) {
      throw new Error(
        `Format NNI invalide: Le numéro doit contenir exactement 11 chiffres. ` +
        `Nombre actuel: ${cleanedNni.length}. NNI fourni: ${nni}`
      );
    }

    return cleanedNni;
  }

  /**
   * Vérifie si le service ONECI est configuré
   */
  isConfigured(): boolean {
    return apiKeysConfig.verification.oneci.isConfigured;
  }

  /**
   * Authentifie auprès de l'API ONECI et récupère un bearer token
   * Le token est mis en cache jusqu'à son expiration
   */
  private async authenticate(): Promise<string> {
    // Vérifier si le token existe et n'est pas expiré
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      // L'API ONECI attend le format camelCase (apiKey, secretKey)
      const response = await fetch(`${this.baseUrl}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          secretKey: this.secretKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ONECI API Error Response:', errorText);
        console.error('Config values:', {
          apiKeyLength: this.apiKey?.length,
          secretKeyLength: this.secretKey?.length,
          apiKeyPrefix: this.apiKey?.substring(0, 8) + '...',
          secretKeyPrefix: this.secretKey?.substring(0, 4) + '...',
        });
        throw new Error(`ONECI Authentication failed: ${response.statusText} (${response.status})`);
      }

      const data: OneCITokenResponse = await response.json();
      this.token = data.bearerToken;
      // Convertir expiresIn en milliseconds et soustraire 1 minute de marge
      this.tokenExpiry = Date.now() + data.expiresIn * 1000 - 60000;

      return this.token;
    } catch (error) {
      console.error('ONECI Authentication Error:', error);
      throw new Error(
        "Impossible d'authentifier auprès du service ONECI. Veuillez réessayer plus tard."
      );
    }
  }

  /**
   * Vérifie l'identité d'une personne avec son numéro CNI (NNI)
   *
   * @param nni - Numéro National d'Identification (CNI)
   * @param userData - Données personnelles pour la vérification
   * @returns Résultat de la vérification avec score de correspondance
   */
  async verifyIdentity(
    nni: string,
    userData: {
      firstName: string;
      lastName: string;
      birthDate: string;
      gender?: string;
      // Champs optionnels pour améliorer la correspondance
      birthTown?: string;
      birthCountry?: string;
      nationality?: string;
      residenceAdr1?: string;
      residenceAdr2?: string;
      residenceTown?: string;
    }
  ): Promise<OneCIIdentityVerification> {
    console.log('[OneCiService] 📋 Début vérification par attributs');

    // Valider et nettoyer le NNI (doit être 11 chiffres)
    const validNni = this.validateAndCleanNni(nni);

    console.log('[OneCiService] userData:', {
      firstName: userData.firstName,
      lastName: userData.lastName,
      birthDate: userData.birthDate,
      gender: userData.gender,
      birthTown: userData.birthTown,
      birthCountry: userData.birthCountry,
      nationality: userData.nationality,
      residenceAdr1: userData.residenceAdr1,
      residenceTown: userData.residenceTown,
    });

    if (!this.isConfigured()) {
      console.error('[OneCiService] ❌ Service ONECI non configuré');
      throw new Error('Le service ONECI n\'est pas configuré');
    }

    const token = await this.authenticate();
    console.log('[OneCiService] ✅ Authentification réussie, token obtenu');

    // Format RNPP: BIRTH_DATE doit être YYYY-MM-DD
    const birthDate = userData.birthDate; // Déjà au format YYYY-MM-DD depuis l'input date

    // Créer le FormData pour la requête
    const formData = new FormData();
    formData.append('FIRST_NAME', userData.firstName.trim().toUpperCase());
    formData.append('LAST_NAME', userData.lastName.trim().toUpperCase());
    formData.append('BIRTH_DATE', birthDate);
    if (userData.gender) {
      formData.append('GENDER', userData.gender.toUpperCase());
    }
    // Champs optionnels
    if (userData.birthTown) {
      formData.append('BIRTH_TOWN', userData.birthTown.trim().toUpperCase());
    }
    if (userData.birthCountry) {
      formData.append('BIRTH_COUNTRY', userData.birthCountry.trim().toUpperCase());
    }
    if (userData.nationality) {
      formData.append('NATIONALITY', userData.nationality.trim().toUpperCase());
    }
    if (userData.residenceAdr1) {
      formData.append('RESIDENCE_ADR_1', userData.residenceAdr1.trim().toUpperCase());
    }
    if (userData.residenceAdr2) {
      formData.append('RESIDENCE_ADR_2', userData.residenceAdr2.trim().toUpperCase());
    }
    if (userData.residenceTown) {
      formData.append('RESIDENCE_TOWN', userData.residenceTown.trim().toUpperCase());
    }

    const endpoint = `${this.baseUrl}/oneci/persons/${validNni}/match`;
    console.log('[OneCiService] 📤 Envoi requête vers:', endpoint);
    console.log('[OneCiService] FormData envoyé:', {
      NNI: validNni,
      FIRST_NAME: userData.firstName.trim().toUpperCase(),
      LAST_NAME: userData.lastName.trim().toUpperCase(),
      BIRTH_DATE: birthDate,
      GENDER: userData.gender?.toUpperCase() || 'Non spécifié',
      BIRTH_TOWN: userData.birthTown || 'Non renseigné',
      BIRTH_COUNTRY: userData.birthCountry || 'Non renseigné',
      NATIONALITY: userData.nationality || 'Non renseigné',
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('[OneCiService] 📥 Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OneCiService] ❌ Erreur réponse API:', errorData);
        throw new Error(
          `ONECI Verification failed: ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const result = await response.json();
      console.log('[OneCiService] 📄 Données brutes reçues:', JSON.stringify(result, null, 2));
      console.log('[OneCiService] 📄 Type de réponse:', typeof result);
      console.log('[OneCiService] 📄 Est un tableau:', Array.isArray(result));

      // Vérifier si la réponse est un tableau d'erreurs de correspondance
      if (Array.isArray(result) && result.length > 0) {
        console.log('[OneCiService] 📄 Réponse est un tableau de', result.length, 'éléments');

        // Vérifier si tous les éléments ont ErrorCode
        const hasErrors = result.some((item: any) => item.ErrorCode || item.errorCode);
        if (hasErrors) {
          const errorFields = result
            .filter((item: any) => item.ErrorCode || item.errorCode)
            .map((item: any) => ({
              field: item.AttributeName || item.attributeName,
              code: item.ErrorCode || item.errorCode,
            }));

          console.error('[OneCiService] ❌ Champs avec erreurs de correspondance:', errorFields);

          // Message d'erreur pour l'utilisateur
          const fieldNames = errorFields.map((e: any) => {
            const labels: Record<string, string> = {
              'FIRST_NAME': 'Prénom(s)',
              'LAST_NAME': 'Nom',
              'BIRTH_DATE': 'Date de naissance',
              'GENDER': 'Sexe',
            };
            return labels[e.field] || e.field;
          }).join(', ');

          throw new Error(
            `Les informations ne correspondent pas à ce numéro CNI. Veuillez vérifier : ${fieldNames}`
          );
        }
      }

      // Vérifier si la réponse est vide
      if (typeof result === 'object' && Object.keys(result).length === 0) {
        console.warn('[OneCiService] ⚠️ Réponse vide de l\'API ONECI');
        console.warn('[OneCiService] ⚠️ Cela peut indiquer:');
        console.warn('   - Le NNI n\'existe pas dans la base');
        console.warn('   - Les informations (nom/prénom/date) ne correspondent pas');
        console.warn('   - Le format des données est incorrect');
      }

      // Vérifier si l'API a retourné une erreur (format de réponse ONECI avec Code/Message)
      if (result.code || result.Code || result.message || result.Message) {
        const errorCode = result.code || result.Code || 'UNKNOWN';
        const errorMessage = result.message || result.Message || 'Erreur inconnue';

        // Codes d'erreur ONECI courants
        const errorMessages: Record<string, string> = {
          '1': 'Numéro CNI invalide ou introuvable',
          '2': 'Données biométriques non trouvées',
          '3': 'Visage non détecté dans l\'image',
          '4': 'Qualité d\'image insuffisante',
          '5': 'Erreur technique du service ONECI',
          '99': 'Données invalides - Vérifiez le format de vos informations (date, nom, prénom)',
        };

        const userMessage = errorMessages[errorCode] || errorMessage;

        console.error('[OneCiService] ❌ Erreur API ONECI:', {
          code: errorCode,
          message: errorMessage,
          userMessage: userMessage,
        });

        throw new Error(`ONECI Error ${errorCode}: ${userMessage}`);
      }

      // Extraire le score de correspondance de la réponse
      const matchScore = result.matchScore || result.score || result.confidence || result.MATCH_SCORE || 0;

      const verificationResult = {
        nni: validNni,
        firstName: userData.firstName,
        lastName: userData.lastName,
        birthDate: userData.birthDate,
        gender: userData.gender,
        matchScore,
        isVerified: matchScore >= 80, // Seuil de 80% pour considérer comme vérifié
        rawResponse: result,
        birthTown: userData.birthTown,
        birthCountry: userData.birthCountry,
        nationality: userData.nationality,
        residenceAdr1: userData.residenceAdr1,
        residenceAdr2: userData.residenceAdr2,
        residenceTown: userData.residenceTown,
      };

      console.log('[OneCiService] ✅ Résultat vérification:', {
        matchScore: Math.round(matchScore * 100) + '%',
        isVerified: verificationResult.isVerified,
        threshold: '80%',
      });

      return verificationResult;
    } catch (error) {
      console.error('[OneCiService] ❌ Erreur vérification identité:', error);
      throw error;
    }
  }

  /**
   * Authentification faciale avec comparaison biométrique
   *
   * Endpoint: /api/v1/oneci/face-auth
   * Méthode: POST avec données JSON
   *
   * @param nni - Numéro National d'Identification
   * @param faceImage - Image du visage en base64
   * @returns Résultat de l'authentification faciale
   */
  async faceAuthentication(
    nni: string,
    faceImage: string
  ): Promise<OneCIAuthResponse> {
    if (!this.isConfigured()) {
      throw new Error('Le service ONECI n\'est pas configuré');
    }

    const token = await this.authenticate();

    // Prétraiter l'image (compression et redimensionnement)
    console.log('[OneCiService] Compression de l\'image en cours...');
    const processedImage = await processImageForOneCI(faceImage);
    console.log('[OneCiService] Image compressée, taille:', Math.round(processedImage.length / 1024) + ' KB');

    // Debug: vérifier les données avant envoi
    const requestData = {
      NNI: parseInt(nni.trim(), 10), // L'API attend un nombre, pas une string
      BIOMETRIC_TYPE: 'AUTH_FACE',
      BIOMETRIC_DATA: processedImage, // Image compressée
    };

    console.log('ONECI Face Auth Request:', {
      endpoint: `${this.baseUrl}/oneci/face-auth`,
      nni: requestData.NNI,
      nniType: typeof requestData.NNI,
      biometricType: requestData.BIOMETRIC_TYPE,
      originalSize: Math.round(faceImage.length / 1024) + ' KB',
      compressedSize: Math.round(processedImage.length / 1024) + ' KB',
      dataPrefix: processedImage.substring(0, 20) + '...',
    });

    try {
      const response = await fetch(`${this.baseUrl}/oneci/face-auth`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ONECI Face Auth Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            `ONECI Face Auth failed: ${response.statusText} - ${JSON.stringify(errorData)}`
          );
        } catch {
          throw new Error(`ONECI Face Auth failed: ${response.statusText} - ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('ONECI Face Auth Response:', result);

      // Vérifier si l'API a retourné une erreur (format de réponse ONECI avec Code/Message)
      if (result.Code || result.Message) {
        const errorCode = result.Code || 'UNKNOWN';
        const errorMessage = result.Message || 'Erreur inconnue';

        // Codes d'erreur ONECI courants
        const errorMessages: Record<string, string> = {
          '1': 'Numéro CNI invalide ou introuvable',
          '2': 'Données biométriques non trouvées',
          '3': 'Visage non détecté dans l\'image',
          '4': 'Qualité d\'image insuffisante',
          '5': 'Erreur technique du service ONECI',
        };

        const userMessage = errorMessages[errorCode] || errorMessage;

        throw new Error(`ONECI Error ${errorCode}: ${userMessage}`);
      }

      // Succès - extraire les informations de correspondance
      const isAuthenticated = result.isAuthenticated || result.verified || result.isMatch || result.matched || false;
      const confidenceScore = result.confidenceScore || result.score || result.matchScore || 0;

      console.log('ONECI Face Auth Result:', { isAuthenticated, confidenceScore });

      return {
        isAuthenticated,
        confidenceScore,
        details: result,
      };
    } catch (error) {
      console.error('ONECI Face Authentication Error:', error);
      throw error;
    }
  }

  /**
   * Récupère le nombre de requêtes restantes pour le quota
   *
   * @returns Nombre de requêtes restantes
   * @note L'endpoint /subscription/remaining-requests n'existe pas sur l'API ONECI
   */
  async checkRemainingRequests(): Promise<number> {
    // L'endpoint n'existe pas sur l'API ONECI - retourner une valeur par défaut
    // pour ne pas bloquer l'expérience utilisateur
    return 100;
  }

  /**
   * Invalide le token cache (force la ré-authentification)
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Récupère les infos de configuration du service
   */
  getConfigInfo() {
    return {
      baseUrl: this.baseUrl,
      isConfigured: this.isConfigured(),
      hasCredentials: !!(this.apiKey && this.secretKey),
    };
  }
}

// ============ Singleton Export ============

export const oneCiService = new OneCiService();

export default oneCiService;
