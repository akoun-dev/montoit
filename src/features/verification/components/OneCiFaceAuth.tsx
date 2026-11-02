/**
 * OneCiFaceAuth - Authentification faciale ONECI
 *
 * Composant complet pour l'authentification faciale via ONECI
 * Gère la saisie du NNI, la capture de photo, et l'appel à l'API ONECI
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { CreditCard, User, Loader, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';
import { useOneCIVerification } from '@/hooks/useOneCIVerification';
import { FaceCapture } from './FaceCapture';

type AuthStep = 'input' | 'capture' | 'captured' | 'verifying' | 'success' | 'error';

interface OneCiFaceAuthProps {
  userId: string;
  onAuthSuccess?: (result: any) => void;
  onAuthCancel?: () => void;
  initialNni?: string;
}

export function OneCiFaceAuth({ userId, onAuthSuccess, onAuthCancel, initialNni = '' }: OneCiFaceAuthProps) {
  const [step, setStep] = useState<AuthStep>('input');
  const [nni, setNni] = useState(initialNni);
  const [errorMessage, setErrorMessage] = useState('');
  const [faceImage, setFaceImage] = useState<string | null>(null);

  const { isFaceAuth, faceAuthResult, error, faceAuthentication, isConfigured } = useOneCIVerification();

  // Log step changes for debugging
  useEffect(() => {
    console.log('[OneCiFaceAuth] Step changed to:', step);
  }, [step]);

  const validateNni = () => {
    const cleaned = nni.trim().toUpperCase();
    if (!cleaned) {
      toast.error('Veuillez entrer votre numéro CNI');
      return false;
    }
    if (cleaned.length < 8) {
      toast.error('Le numéro CNI doit comporter au moins 8 caractères');
      return false;
    }
    return true;
  };

  const handleStartCapture = () => {
    if (!validateNni()) return;
    setStep('capture');
  };

  const handleImageCaptured = (imageData: string) => {
    console.log('[OneCiFaceAuth] handleImageCaptured called, image length:', imageData.length);
    setFaceImage(imageData);
    console.log('[OneCiFaceAuth] Setting step to captured');
    setStep('captured');
    console.log('[OneCiFaceAuth] Step should now be "captured"');
  };

  const handleConfirmCapture = async () => {
    if (faceImage) {
      await handleAuthentication(faceImage);
    }
  };

  const handleAuthentication = async (imageData: string) => {
    setStep('verifying');
    setErrorMessage('');

    try {
      if (!isConfigured) {
        throw new Error('Le service ONECI n\'est pas configuré');
      }

      // L'image est déjà au format dataURL complet (avec le préfixe data:image/...;base64,)
      // Le service ONECI va la traiter et retirer le préfixe lui-même
      const result = await faceAuthentication(nni.trim().toUpperCase(), imageData);

      if (result.isAuthenticated) {
        // Sauvegarder le résultat dans la base de données
        const { error: dbError } = await supabase
          .from('identity_verifications')
          .upsert({
            user_id: userId,
            verification_type: 'oneci_face_auth',
            verification_data: {
              oneci_number: nni.trim().toUpperCase(),
              confidence_score: result.confidenceScore,
              raw_response: result.details,
              verified_at: new Date().toISOString(),
            },
            is_verified: true,
            verification_date: new Date().toISOString(),
          });

        if (dbError) {
          console.error('Error saving face auth result:', dbError);
        }

        // Mettre à jour le profil avec la photo
        await supabase
          .from('profiles')
          .update({
            facial_verification_status: 'verified',
            facial_verification_date: new Date().toISOString(),
            // Note: la photo devrait être stockée dans le bucket Supabase Storage
            // et seule l'URL devrait être sauvegardée dans le profil
          })
          .eq('id', userId);

        setStep('success');
        toast.success('Authentification faciale réussie !');
        onAuthSuccess?.(result);
      } else {
        setStep('error');
        setErrorMessage(
          `L'authentification a échoué${result.confidenceScore ? ` (score: ${Math.round((result.confidenceScore || 0) * 100)}%)` : ''}. Veuillez réessayer.`
        );
      }
    } catch (err) {
      console.error('ONECI Face Auth error:', err);
      setStep('error');
      setErrorMessage(
        error || 'Service temporairement indisponible. Veuillez réessayer plus tard.'
      );
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    // Si on a déjà une image capturée, retourner à l'aperçu, sinon recommencer la capture
    setStep(faceImage ? 'captured' : 'capture');
  };

  const handleStartOver = () => {
    setNni('');
    setFaceImage(null);
    setErrorMessage('');
    setStep('input');
  };

  // Étape: Succès
  if (step === 'success') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-green-700 mb-2">Authentification réussie !</h3>
          <p className="text-green-600">
            Votre visage a été authentifié avec succès
            {faceAuthResult?.confidenceScore && (
              <span className="block mt-1 text-sm">
                (Score de confiance: {Math.round((faceAuthResult.confidenceScore || 0) * 100)}%)
              </span>
            )}
          </p>
        </div>
        {onAuthCancel && (
          <button
            type="button"
            onClick={onAuthCancel}
            className="mx-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            Fermer
          </button>
        )}
      </div>
    );
  }

  // Étape: Erreur
  if (step === 'error') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Échec de l'authentification</p>
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={handleStartOver}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors"
          >
            Recommencer
          </button>
        </div>

        {onAuthCancel && (
          <button
            type="button"
            onClick={onAuthCancel}
            className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Annuler
          </button>
        )}
      </div>
    );
  }

  // Étape: Vérification en cours
  if (step === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="text-center space-y-2">
          <p className="font-medium">Authentification en cours...</p>
          <p className="text-sm text-muted-foreground">
            Veuillez patienter pendant que nous vérifions votre visage
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Cela peut prendre quelques secondes</span>
        </div>
      </div>
    );
  }

  // Étape: Photo capturée - Aperçu avant envoi
  if (step === 'captured' && faceImage) {
    console.log('[OneCiFaceAuth] Rendering CAPTURED step, faceImage length:', faceImage.length);
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Photo capturée</h3>
          <p className="text-sm text-muted-foreground">
            Vérifiez que votre visage est bien visible et centré
          </p>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black aspect-square max-w-md mx-auto">
          <img
            src={faceImage}
            alt="Visage capturé"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Prêt à envoyer
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStep('capture')}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            Recapturer
          </button>
          <button
            type="button"
            onClick={handleConfirmCapture}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Confirmer et envoyer
          </button>
        </div>

        {onAuthCancel && (
          <button
            type="button"
            onClick={onAuthCancel}
            className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Annuler
          </button>
        )}
      </div>
    );
  }

  // Étape: Capture de photo
  if (step === 'capture') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Capture de votre visage</h3>
          <p className="text-sm text-muted-foreground">
            Positionnez votre visage dans le cercle et assurez-vous d'avoir un bon éclairage
          </p>
        </div>

        <FaceCapture
          onCapture={handleImageCaptured}
          onCancel={onAuthCancel}
        />

        {onAuthCancel && (
          <button
            type="button"
            onClick={() => setStep('input')}
            className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Retour
          </button>
        )}
      </div>
    );
  }

  // Étape: Saisie du NNI (étape initiale)
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Authentification faciale ONECI</h3>
          <p className="text-sm text-muted-foreground">
            Vérifiez votre identité avec votre visage
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">
          Cette méthode utilise la reconnaissance faciale pour vérifier votre identité.
          Assurez-vous d'avoir un bon éclairage.
        </p>
      </div>

      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Numéro CNI (NNI)
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={nni}
                onChange={(e) => setNni(e.target.value.toUpperCase())}
                className="pl-10 uppercase"
                placeholder="C0000000000"
                maxLength={15}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Numéro figurant sur votre carte nationale d'identité
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartCapture}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Continuer vers la capture
          </button>
        </div>
      )}

      {onAuthCancel && step !== 'capture' && step !== 'captured' && (
        <button
          type="button"
          onClick={onAuthCancel}
          className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Annuler
        </button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Vos données sont transmises de manière sécurisée à l'ONECI pour vérification et ne sont
        utilisées qu'à cette fin.
      </p>
    </div>
  );
}

export default OneCiFaceAuth;
