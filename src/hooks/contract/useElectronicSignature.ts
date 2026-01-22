/**
 * Hook personnalisé pour la signature électronique CryptoNeo
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/shared/useSafeToast';
import { supabase } from '@/integrations/supabase/client';
import cryptoNeoService, {
  type CertificateRequest,
  type SignDocumentRequest,
  type SignRequestItem,
  type SignatureResult,
} from '@/services/cryptonoe/cryptonoe.service';

export type SignatureStep = 'idle' | 'generating_cert' | 'waiting_otp' | 'signing' | 'completed' | 'error';

export interface SignatureDocument {
  id: string;
  url: string;
  title: string;
}

interface SignatureState {
  step: SignatureStep;
  certificateAlias: string | null;
  error: string | null;
  loading: boolean;
  operationId: number | null;
}

interface UseElectronicSignatureReturn {
  // State
  step: SignatureStep;
  loading: boolean;
  error: string | null;
  certificateAlias: string | null;
  operationId: number | null;

  // Actions
  startSignatureProcess: (documents: SignatureDocument[], contractId: string) => Promise<void>;
  sendOTP: (canal?: 'SMS' | 'MAIL') => Promise<void>;
  submitOTP: (otp: string, documents: SignatureDocument[]) => Promise<void>;
  verifyStatus: (operationId: number) => Promise<SignatureResult[] | null>;
  reset: () => void;
  cancel: () => void;
}

/**
 * Hook pour gérer le processus de signature électronique
 */
export const useElectronicSignature = (): UseElectronicSignatureReturn => {
  console.log('[useElectronicSignature] Hook initialized');

  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<SignatureState>({
    step: 'idle',
    certificateAlias: null,
    error: null,
    loading: false,
    operationId: null,
  });

  console.log('[useElectronicSignature] Initial state:', state);

  const updateState = (updates: Partial<SignatureState>) => {
    console.log('[useElectronicSignature] State update:', updates);
    setState((prev) => ({ ...prev, ...updates }));
  };

  const reset = useCallback(() => {
    console.log('[useElectronicSignature] Reset');
    setState({
      step: 'idle',
      certificateAlias: null,
      error: null,
      loading: false,
      operationId: null,
    });
  }, []);

  const cancel = useCallback(() => {
    console.log('[useElectronicSignature] Cancel');
    reset();
  }, [reset]);

  /**
   * Démarre le processus de signature - génère le certificat
   */
  const startSignatureProcess = useCallback(async (_documents: SignatureDocument[], _contractId: string) => {
    console.log('🚀 Starting signature process for user:', user?.id);

    if (!user) {
      toast.error('Vous devez être connecté pour signer un document');
      return;
    }

    // Vérifier si le service est configuré
    if (!cryptoNeoService.isConfigured()) {
      console.error('❌ CryptoNeo service not configured');
      toast.error('Le service de signature électronique n\'est pas configuré');
      updateState({
        error: 'Service non configuré',
        step: 'error',
        loading: false,
      });
      return;
    }

    console.log('✅ Service configured, starting certificate generation');
    updateState({ loading: true, step: 'generating_cert', error: null });

    // Timeout de sécurité (30 secondes)
    let completed = false;
    const timeoutId = setTimeout(() => {
      if (!completed) {
        console.error('⏰ Certificate generation timeout');
        updateState({
          error: 'La génération du certificat prend trop de temps. Veuillez réessayer.',
          step: 'error',
          loading: false,
        });
        toast.error('Délai dépassé. Veuillez réessayer.');
      }
    }, 30000);

    try {
      // 1. Vérifier le profil utilisateur
      console.log('📋 Fetching user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Profile query error:', profileError);
        throw new Error(`Erreur de chargement du profil: ${profileError.message}`);
      }

      if (!profile) {
        console.error('❌ Profile not found');
        throw new Error('Profil utilisateur non trouvé. Veuillez compléter votre profil.');
      }

      console.log('✅ Profile found');

      // 2. Récupérer les données ONECI depuis la table user_verifications (optionnel)
      console.log('📄 Fetching ONECI data...');
      const { data: verification, error: verificationError } = await supabase
        .from('user_verifications')
        .select('oneci_cni_number, oneci_data')
        .eq('user_id', user.id)
        .maybeSingle();

      let hashPiece: string;
      let base64Photo: string | undefined;

      if (!verificationError && verification?.oneci_data) {
        const oneciData = verification.oneci_data as any;
        base64Photo = oneciData.photo_base64;

        // Utiliser les données ONECI si disponibles
        const cniNumber = verification.oneci_cni_number || oneciData.cni_number || oneciData.oneci_cni_number;
        if (cniNumber) {
          const encoder = new TextEncoder();
          const data = encoder.encode(cniNumber);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hashPiece = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
          console.log('✅ ONECI hash calculated from CNI');
        } else {
          // Fallback: utiliser l'email comme identifiant
          const encoder = new TextEncoder();
          const data = encoder.encode(user.email || '');
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hashPiece = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
          console.log('⚠️ Using email hash as fallback (no CNI number)');
        }
      } else {
        // Pas de données ONECI: utiliser l'email comme identifiant
        const encoder = new TextEncoder();
        const data = encoder.encode(user.email || '');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hashPiece = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        console.log('⚠️ No ONECI data, using email hash for certificate');
      }

      // 3. Préparer les données du certificat
      const fullName = profile.full_name || user.email || 'Utilisateur';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const certRequest: CertificateRequest = {
        firstName,
        lastName,
        email: user.email || '',
        phone: profile.phone || '',
        organisation: 'ANSUT',
        typePiece: 'CNI',
        hashPiece,
        base64: base64Photo,
      };

      // 4. Générer le certificat
      console.log('🔐 Generating certificate...');
      const response = await cryptoNeoService.generateCertificate(certRequest);

      console.log('📩 Certificate generation response:', response);

      completed = true;
      clearTimeout(timeoutId);

      if (response.statusCode === 7000 || response.statusCode === 7001) {
        const alias = response.data?.alias || response.data?.certificatId;
        console.log('✅ Certificate generated successfully:', alias);
        updateState({
          certificateAlias: alias,
          step: 'waiting_otp',
          loading: false,
        });
        toast.success('Certificat numérique généré avec succès');
      } else if (response.statusCode === 7002) {
        // Certificat déjà généré, passer directement à l'étape OTP
        const alias = response.data?.certificatId;
        console.log('✅ Certificate already exists:', alias);
        updateState({
          certificateAlias: alias,
          step: 'waiting_otp',
          loading: false,
        });
        toast.success('Certificat numérique déjà existant');
      } else {
        console.error('❌ Certificate generation failed:', response);
        throw new Error(response.statusMessage || 'Erreur génération certificat');
      }
    } catch (err) {
      completed = true;
      clearTimeout(timeoutId);

      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la génération du certificat';
      console.error('❌ Certificate generation error:', err);
      updateState({
        error: errorMessage,
        step: 'error',
        loading: false,
      });
      toast.error(errorMessage);
    }
  }, [user, navigate]);

  /**
   * Envoie le code OTP (SMS ou email)
   */
  const sendOTP = useCallback(async (canal: 'SMS' | 'MAIL' = 'SMS') => {
    updateState({ loading: true, error: null });

    try {
      await cryptoNeoService.sendOTP({ canal });
      updateState({ loading: false });
      toast.success(`Code OTP envoyé par ${canal === 'SMS' ? 'SMS' : 'email'}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code OTP';
      console.error('OTP send error:', err);
      updateState({
        error: errorMessage,
        loading: false,
      });
      toast.error(errorMessage);
    }
  }, []);

  /**
   * Soumet le code OTP et signe les documents
   */
  const submitOTP = useCallback(
    async (otp: string, documents: SignatureDocument[]) => {
      if (!state.certificateAlias) {
        toast.error('Certificat non disponible');
        return;
      }

      updateState({ loading: true, step: 'signing', error: null });

      try {
        // Préparer les documents pour la signature
        const signRequestItems: SignRequestItem[] = await Promise.all(
          documents.map(async (doc) => {
            // Télécharger et calculer le hash du document
            const { hash } = await cryptoNeoService.downloadAndHashFile(doc.url);

            return {
              codeDoc: doc.id,
              urlDoc: doc.url,
              hashDoc: hash,
              visibiliteImage: true,
              urlImage: 'https://mon-toit.ansut.ci/assets/signature-cachet.png',
              hashImage: 'f639037b0d96a9d0aa8fb682985e88db52313047998434b82804297c7806562e',
              pageImage: 1,
              positionImage: '150,200',
              messageImage: true,
              lieuSignature: 'Abidjan, Côte d\'Ivoire',
              motifSignature: 'Signature électronique du contrat de location',
            };
          })
        );

        // URL de callback pour recevoir les résultats
        const callbackUrl = `${window.location.origin}/api/cryptoneo/callback`;

        const signRequest: SignDocumentRequest = {
          documents: signRequestItems,
          otp,
          callbackUrl,
        };

        // Signer les documents
        const response = await cryptoNeoService.signDocuments(signRequest);

        if (response.statusCode === 7003) {
          updateState({
            operationId: response.data.operationId,
            loading: false,
          });

          // Démarrer la vérification du statut
          pollSignatureStatus(response.data.operationId, documents);
        } else {
          throw new Error(response.statusMessage || 'Erreur lors de la signature');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la signature';
        console.error('Sign documents error:', err);
        updateState({
          error: errorMessage,
          step: 'waiting_otp',
          loading: false,
        });
        toast.error(errorMessage);
      }
    },
    [state.certificateAlias]
  );

  /**
   * Vérifie régulièrement le statut de la signature
   */
  const pollSignatureStatus = useCallback(
    async (operationId: number, documents: SignatureDocument[], attempts = 0) => {
      const maxAttempts = 20; // 20 tentatives maximum (10 minutes)
      const interval = 30000; // 30 secondes entre chaque vérification

      const checkStatus = async (): Promise<void> => {
        try {
          const results = await cryptoNeoService.verifySignature(operationId.toString());

          if (results.statusCode === 7004) {
            // Vérifier si tous les documents sont signés
            const completedDocs = results.data.results.filter(
              (r: SignatureResult) => r.statusCode === 7000
            );

            if (completedDocs.length === documents.length) {
              // Tous les documents sont signés
              updateState({
                step: 'completed',
                loading: false,
              });
              toast.success('Documents signés avec succès !');
              return;
            } else {
              // Certains documents ont échoué
              const failedDocs = results.data.results.filter(
                (r: SignatureResult) => r.statusCode !== 7000 && r.statusCode !== 7005
              );

              if (failedDocs.length > 0 && attempts >= 5) {
                // Après 5 tentatives (2.5 minutes), si certains documents ont échoué
                throw new Error(
                  `Échec de signature de ${failedDocs.length} document(s): ${failedDocs
                    .map((f: SignatureResult) => f.erreur)
                    .join(', ')}`
                );
              }
            }
          }

          // Continuer à vérifier
          if (attempts < maxAttempts) {
            setTimeout(() => checkStatus(), interval);
          } else {
            throw new Error('Délai de signature dépassé. Veuillez réessayer.');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification';
          console.error('Verify signature error:', err);
          updateState({
            error: errorMessage,
            step: 'error',
            loading: false,
          });
          toast.error(errorMessage);
        }
      };

      checkStatus();
    },
    []
  );

  /**
   * Vérifie le statut d'une signature (manuelle)
   */
  const verifyStatus = useCallback(async (operationId: number) => {
    try {
      const response = await cryptoNeoService.verifySignature(operationId.toString());

      if (response.statusCode === 7004) {
        return response.data.results;
      }
      return null;
    } catch (err) {
      console.error('Verify status error:', err);
      return null;
    }
  }, []);

  return {
    step: state.step,
    loading: state.loading,
    error: state.error,
    certificateAlias: state.certificateAlias,
    operationId: state.operationId,
    startSignatureProcess,
    sendOTP,
    submitOTP,
    verifyStatus,
    reset,
    cancel,
  };
};

export default useElectronicSignature;
