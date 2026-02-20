/**
 * Page de vérification ONECI
 *
 * Cette page permet à l'utilisateur de vérifier son identité
 * en utilisant le service ONECI (Carte Nationale d'Identité)
 *
 * Deux méthodes sont disponibles :
 * 1. Vérification par attributs (nom, prénom, date de naissance, numéro CNI)
 * 2. Authentification faciale (reconnaissance biométrique)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import {
  OneciVerificationForm,
  OneciFaceAuth,
  OneciVerificationProgress,
  type OneciVerificationSuccessData,
  type OneciFaceAuthResponse,
} from '@/shared/components/oneci';

type VerificationStep = 'attributes' | 'face' | 'complete';

export default function ONECIVerificationPage() {
  const { user, profile: authProfile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<VerificationStep>('attributes');
  const [verificationData, setVerificationData] = useState<{
    nni: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: 'M' | 'F';
  } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà vérifié
    const checkVerificationStatus = async () => {
      if (!user) return;

      try {
        const { supabase } = await import('@/services/supabase/client');
        const { data } = await supabase
          .from('profiles')
          .select('oneci_verified')
          .eq('id', user.id)
          .single();

        if (data?.oneci_verified) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkVerificationStatus();
  }, [user]);

  const handleAttributesSuccess = (data: OneciVerificationSuccessData) => {
    if (data.result.success && data.result.match) {
      // Stocker les données de vérification pour l'étape d'authentification faciale
      setVerificationData(data.formData);
      // Passer à l'étape d'authentification faciale
      setStep('face');
    }
  };

  const handleFaceAuthSuccess = (result: OneciFaceAuthResponse) => {
    if (result.success && result.authenticated) {
      // Mettre à jour le profil
      handleVerificationComplete();
    }
  };

  const handleVerificationComplete = async () => {
    if (!user) return;

    try {
      const { supabase } = await import('@/services/supabase/client');

      // Mettre à jour le profil avec le statut de vérification
      await supabase
        .from('profiles')
        .update({
          oneci_verified: true,
          oneci_verified_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      setIsVerified(true);

      // Recharger le profil pour mettre à jour le statut
      if (refetchProfile) {
        await refetchProfile();
      }

      // Rediriger vers le profil après un court délai
      setTimeout(() => {
        navigate('/locataire/profil?tab=verification');
      }, 2000);
    } catch (error) {
      console.error('Error updating verification status:', error);
      setError('Erreur lors de la mise à jour de votre profil');
    }
  };

  const handleBack = () => {
    if (step === 'face') {
      setStep('attributes');
    } else {
      navigate('/locataire/profil?tab=verification');
    }
  };

  const handleSkipFace = async () => {
    // Permettre à l'utilisateur de sauter l'authentification faciale
    // et marquer la vérification comme complète
    await handleVerificationComplete();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F16522]" />
      </div>
    );
  }

  // Message de succès
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-3">
            Identité vérifiée avec succès !
          </h1>
          <p className="text-green-700 text-lg mb-8">
            Votre CNI a été vérifiée via ONECI. Vous allez être redirigé vers votre profil...
          </p>
          <Button onClick={() => navigate('/locataire/profil?tab=verification')} size="lg">
            Retourner à mon profil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF6E3] to-white">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>
              {step === 'face' ? 'Retour aux informations' : 'Retour au profil'}
            </span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F16522]/20 to-[#F16522]/5 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#F16522]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2C1810]">
                Vérification d'identité ONECI
              </h1>
              <p className="text-sm text-neutral-600">
                Sécurisez votre compte avec votre Carte Nationale d'Identité
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Indicator */}
        <div className="mb-8 flex justify-center">
          <OneciVerificationProgress currentStep={step} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-center">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="ml-4"
            >
              Fermer
            </Button>
          </div>
        )}

        {/* Step 1: Attributes Verification */}
        {step === 'attributes' && (
          <OneciVerificationForm
            onSuccess={handleAttributesSuccess}
            onError={setError}
            initialData={authProfile ? {
              firstName: authProfile.full_name?.split(' ')[0] || '',
              lastName: authProfile.full_name?.split(' ').slice(1).join(' ') || '',
              birthDate: authProfile.birth_date || '',
            } : undefined}
          />
        )}

        {/* Step 2: Face Authentication */}
        {step === 'face' && verificationData && (
          <div className="space-y-6">
            <OneciFaceAuth
              nni={verificationData.nni}
              onSuccess={handleFaceAuthSuccess}
              onError={setError}
            />

            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleSkipFace}
                className="text-neutral-600 border-neutral-300 hover:bg-neutral-50"
              >
                Passer cette étape
              </Button>
              <p className="text-sm text-neutral-500 mt-2">
                L'authentification faciale augmente votre niveau de confiance
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
