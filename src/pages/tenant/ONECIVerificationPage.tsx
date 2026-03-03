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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ArrowLeft, Shield, CheckCircle, Fingerprint } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { SimpleInput } from '@/shared/components/oneci/SimpleInput';
import {
  OneciVerificationForm,
  OneciFaceAuth,
  OneciVerificationProgress,
  type OneciVerificationSuccessData,
  type OneciFaceAuthResponse,
} from '@/shared/components/oneci';
import { updateProfileOneciVerified } from '@/services/oneci';

type VerificationStep = 'attributes' | 'face' | 'complete';
type VerificationMethod = Extract<VerificationStep, 'attributes' | 'face'>;

const METHOD_CARD_DATA: {
  id: VerificationMethod;
  title: string;
  description: string;
  highlights: string[];
  gradient: string;
  iconColor: string;
}[] = [
  {
    id: 'attributes',
    title: 'Informations personnelles',
    description: 'Renseignez vos données et votre NNI pour valider votre identité sans selfie.',
    highlights: [
      'Nom, prénom et date de naissance',
      'NNI (8 à 12 chiffres) issu de la CNI',
      'Validation automatique via OCR',
    ],
    gradient: 'from-[#F16522]/10 to-[#F16522]/5',
    iconColor: '#F16522',
  },
  {
    id: 'face',
    title: 'Authentification faciale',
    description: 'Capturez un selfie pour confirmer votre identité biométrique auprès de l’ONECI.',
    highlights: [
      'Selfie récent sans masque',
      'NNI pré-rempli ou saisi manuellement',
      'Sécurisé et rapide',
    ],
    gradient: 'from-[#2C1810]/10 to-[#2C1810]/5',
    iconColor: '#2C1810',
  },
];

const PRECHECK_ITEMS = [
  'Carte Nationale d’Identité lisible (recto verso).',
  'NNI (entre 8 et 12 chiffres) prêt à être saisi.',
  'Connexion internet stable et caméra fonctionnelle.',
  'N’oubliez pas votre selfie si vous choisissez la biométrie.',
];

export default function ONECIVerificationPage() {
  const { user, profile: authProfile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<VerificationStep>('attributes');
  const [showMethodSelector, setShowMethodSelector] = useState(true);
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
  const [faceNni, setFaceNni] = useState('');
  const headerDescription = showMethodSelector
    ? 'Suivez les étapes ci-dessous : choisissez la méthode la plus adaptée, remplissez vos informations, puis lancez la validation sécurisée avec l’ONECI.'
    : 'Continuez la vérification guidée : remplissez vos informations et validez votre identité auprès de l’ONECI.';

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

  const selectMethod = (method: VerificationMethod) => {
    setStep(method);

    if (method === 'face' && verificationData?.nni) {
      setFaceNni(verificationData.nni);
    }
  };

  const sourceParam = searchParams.get('source');
  const methodParam = searchParams.get('method') as VerificationMethod | null;

  useEffect(() => {
    setShowMethodSelector(sourceParam !== 'modal');

    if (methodParam === 'attributes' || methodParam === 'face') {
      setStep(methodParam);
      if (methodParam === 'face') {
        const nniToUse = verificationData?.nni || authProfile?.oneci_number;
        if (nniToUse) {
          setFaceNni(nniToUse);
        }
      }
    }
  }, [sourceParam, methodParam, verificationData?.nni, authProfile?.oneci_number]);

  useEffect(() => {
    if (!faceNni && authProfile?.oneci_number) {
      setFaceNni(authProfile.oneci_number);
    }
  }, [authProfile?.oneci_number, faceNni]);

  const handleAttributesSuccess = async (data: OneciVerificationSuccessData) => {
    if (data.result.success && data.result.match) {
      setVerificationData(data.formData);
      setFaceNni(data.formData.nni);
      setError(null);

      // Mettre à jour le profil après vérification ONECI réussie
      if (user) {
        const updateResult = await updateProfileOneciVerified(
          user.id,
          data.formData.nni,
          data.result
        );

        if (!updateResult.success) {
          console.error('Erreur mise à jour profil ONECI:', updateResult.error);
          setError(updateResult.error || 'Erreur lors de la mise à jour du profil');
          return;
        }

        // Marquer comme vérifié et passer à l'étape suivante
        setStep('face');
      }
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      setStep('complete');
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

  const trimmedFaceNni = faceNni.trim();
  const isFaceNniValid = trimmedFaceNni.length >= 8 && trimmedFaceNni.length <= 12;

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
      <header className="sticky top-0 z-20 border-b border-[#F16522]/15 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-[#F16522] hover:text-[#2C1810]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{step === 'face' ? 'Retour aux informations' : 'Retour au profil'}</span>
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-500">
                  Vérification ONECI
                </p>
                <h1 className="text-2xl font-bold text-[#2C1810]">Identité sécurisée</h1>
                <p className="text-sm text-neutral-500 max-w-2xl">{headerDescription}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#F16522]/30 bg-[#FFF6F0] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#F16522]">
                {step === 'attributes' ? 'Méthode guidée' : 'Biométrie validée'}
              </span>
              <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                {step === 'attributes' ? 'Étape 1 sur 2' : 'Étape 2 sur 2'}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-xs">
              <OneciVerificationProgress currentStep={step} className="w-full" />
            </div>
            <p className="text-xs text-neutral-500 lg:max-w-2xl">
              Les données sont vérifiées instantanément et protégées par chiffrement. Vous pouvez
              continuer le processus à tout moment sans perdre votre progression.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] bg-white/90 px-6 py-6 shadow-lg shadow-orange-100 ring-1 ring-orange-50">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Vue simplifiée
                  </p>
                  <h2 className="text-2xl font-bold text-[#2C1810]">Vérification ONECI guidée</h2>
                  <p className="mt-2 text-sm text-neutral-500 max-w-2xl">{headerDescription}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-[#F16522]/60 bg-[#FFF6F0] px-4 py-2 text-sm font-semibold text-[#F16522]">
                  {step === 'attributes' ? 'Étape 1 sur 2' : 'Étape 2 sur 2'}
                </div>
              </div>
              {showMethodSelector && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {METHOD_CARD_DATA.map((method) => {
                    const isActive = step === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => selectMethod(method.id)}
                        aria-pressed={isActive}
                        className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition duration-150 ${
                          isActive
                            ? 'bg-[#FFF6F0] shadow-lg hover:shadow-xl'
                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                        } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F16522]`}
                        style={isActive ? { borderColor: method.iconColor } : undefined}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${method.gradient}`}
                            style={{ color: method.iconColor }}
                          >
                            {method.id === 'attributes' ? (
                              <Fingerprint className="h-5 w-5" />
                            ) : (
                              <Shield className="h-5 w-5" />
                            )}
                          </div>
                          {isActive && (
                            <span className="rounded-full bg-[#F16522]/10 px-3 py-1 text-xs font-semibold text-[#F16522]">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-[#2C1810]">{method.title}</p>
                          <p className="text-sm text-neutral-500">{method.description}</p>
                        </div>
                        <ul className="space-y-1 text-sm text-neutral-500">
                          {method.highlights.map((highlight) => (
                            <li key={highlight} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {error && (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-red-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">{error}</span>
                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                  Fermer
                </Button>
              </div>
            )}

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

            {step === 'face' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <SimpleInput
                    label="Numéro National d'Identification (NNI)"
                    placeholder="Ex: 12345678901"
                    value={faceNni}
                    onChange={(e) => setFaceNni(e.target.value.replace(/\D/g, ''))}
                    maxLength={12}
                  />
                  <p className="text-xs text-neutral-500">
                    {faceNni
                      ? isFaceNniValid
                        ? 'NNI prêt pour l’authentification faciale.'
                        : 'Le NNI doit contenir entre 8 et 12 chiffres.'
                      : 'Saisissez votre NNI pour démarrer l’authentification faciale.'}
                  </p>
                </div>

                {isFaceNniValid ? (
                  <OneciFaceAuth
                    nni={trimmedFaceNni}
                    onSuccess={handleFaceAuthSuccess}
                    onError={setError}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                    {faceNni
                      ? 'Le NNI doit contenir entre 8 et 12 chiffres pour lancer l’authentification.'
                      : 'Le NNI est requis pour démarrer l’authentification faciale.'}
                  </div>
                )}

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

          <aside className="space-y-6">
            <section className="rounded-3xl border border-neutral-100 bg-white/95 px-5 py-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Préparation
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[#2C1810]">Ce qu’il faut prévoir</h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-600">
                {PRECHECK_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#F16522]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-neutral-500">
                Les documents sont transmis via une connexion chiffrée et ne sont utilisés que pour
                l’identification.
              </p>
            </section>

            <section className="rounded-3xl bg-gradient-to-br from-emerald-50/80 to-white/80 px-5 py-6 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-100 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#2C1810]">Confiance et suivi</h4>
                  <p className="text-sm text-neutral-600">
                    Une fois vérifié, vous voyez tout de suite le statut sur votre profil et pouvez
                    partager le certificat avec les propriétaires.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm text-neutral-600">
                <p>Vous pouvez revenir au processus à tout moment.</p>
                <p>Notre équipe est disponible si vous avez besoin d’assistance.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
