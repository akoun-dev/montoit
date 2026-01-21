import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Camera,
  FileCheck,
  Scan,
  CheckCircle,
  ChevronLeft,
  Upload,
  AlertCircle,
  X,
} from 'lucide-react';
import { FormStepper, FormStepContent, useFormStepper } from '@/shared/ui/FormStepper';
import NeofaceVerification from '@/shared/ui/NeofaceVerification';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STORAGE_BUCKETS } from '@/services/upload/uploadService';
import { getPublicUrl, addCacheBuster } from '@/services/storage/storageService';

export default function BiometricVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { step, slideDirection, nextStep, prevStep, goToStep, resetStepper } = useFormStepper(1, 3);

  const [cniPhotoUrl, setCniPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    score?: number;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  const isResetting = useRef(false);
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  // Réinitialiser les états quand on arrive sur la page avec reset=true
  useEffect(() => {
    const hasResetParam = location.search.includes('reset=true');

    if (hasResetParam && !isResetting.current) {
      // Marquer le reset en cours pour éviter les boucles
      isResetting.current = true;
      // Réinitialiser tous les états
      setVerificationResult(null);
      resetStepper();
      setCniPhotoUrl(null);
      // Nettoyer le flag après un court délai
      setTimeout(() => {
        isResetting.current = false;
      }, 100);
    }
  }, [location.search, resetStepper]);

  // Pré-remplir avec l'avatar seulement à la première initialization
  useEffect(() => {
    if (!hasInitialized.current && profile?.avatar_url) {
      setCniPhotoUrl(profile.avatar_url);
      hasInitialized.current = true;
    } else if (!hasInitialized.current && !profile?.avatar_url) {
      hasInitialized.current = true;
    }
  }, [profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cni-${Date.now()}.${fileExt}`;
      const primaryBucket =
        import.meta.env.VITE_SUPABASE_VERIFICATION_BUCKET || STORAGE_BUCKETS.VERIFICATIONS;
      const fallbackBucket = STORAGE_BUCKETS.AVATARS; // pour éviter l'erreur si le bucket de vérif est absent en local

      const attemptUpload = async (bucketName: string) => {
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, { upsert: true });
        return { bucketName, error };
      };

      let { bucketName, error: uploadError } = await attemptUpload(primaryBucket);

      if (
        uploadError &&
        uploadError.message.toLowerCase().includes('bucket not found') &&
        fallbackBucket
      ) {
        console.warn(
          `[BiometricVerification] Bucket ${primaryBucket} absent, fallback sur ${fallbackBucket}`
        );
        const fallbackResult = await attemptUpload(fallbackBucket);
        bucketName = fallbackResult.bucketName;
        uploadError = fallbackResult.error;
      }

      if (uploadError) throw uploadError;

      // Créer une URL signée pour l'accès à l'image (fonctionne en local et production)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 60 * 60); // URL valide pour 1 heure

      let imageUrl: string;
      if (signedUrlError) {
        console.error('[BiometricVerification] Erreur création URL signée:', signedUrlError);
        // Fallback sur l'URL publique
        const publicUrl = getPublicUrl(bucketName, fileName);
        imageUrl = addCacheBuster(publicUrl);
        console.log('[BiometricVerification] Fallback sur URL publique:', imageUrl);
      } else {
        imageUrl = signedUrlData.signedUrl;
        console.log('[BiometricVerification] URL signée créée:', imageUrl);
      }

      console.log('[BiometricVerification] Bucket utilisé:', bucketName);
      console.log('[BiometricVerification] Fichier:', fileName);

      setCniPhotoUrl(imageUrl);
      toast.success('Photo CNI téléchargée');
    } catch (err) {
      console.error('[BiometricVerification] Upload error:', err);
      const message =
        err instanceof Error && err.message.includes('Bucket not found')
          ? 'Bucket de vérification introuvable. Créez-le (ex: "verifications") ou configurez VITE_SUPABASE_VERIFICATION_BUCKET. Fallback sur avatars si disponible.'
          : 'Erreur lors du téléchargement';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerified = async (data: unknown) => {
    const verificationData = data as { matching_score?: number };
    setVerificationResult({
      success: true,
      score: verificationData?.matching_score,
      message: 'Identité vérifiée avec succès !',
    });

    // Update profile
    try {
      await supabase
        .from('profiles')
        .update({
          facial_verification_status: 'verified',
          facial_verification_date: new Date().toISOString(),
          facial_verification_score: verificationData?.matching_score || null,
        })
        .eq('id', user?.id || '');
    } catch (err) {
      console.error('[BiometricVerification] Profile update error:', err);
    }

    goToStep(3);
  };

  const handleFailed = (error: string) => {
    setVerificationResult({
      success: false,
      message: error,
    });
    toast.error(`Vérification échouée: ${error}`);
    resetStepper();
    // Incrémenter pour forcer le remontage du composant au prochain essai
    setVerificationAttempt((prev) => prev + 1);
  };

  const handleStartVerification = () => {
    // Réinitialiser le résultat et incrémenter la tentative avant de passer à l'étape 3
    setVerificationResult(null);
    setVerificationAttempt((prev) => prev + 1);
    nextStep();
  };

  const handleChangePhoto = () => {
    // Ouvrir directement le sélecteur de fichier sans effacer l'URL actuelle
    // L'URL sera mise à jour seulement quand le nouveau fichier est uploadé avec succès
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCancel = () => {
    navigate('/locataire/profil?tab=verification');
  };

  const stepLabels = ['Instructions', 'Photo CNI', 'Vérification'];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FDF6E3] via-white to-[#FDF6E3] flex flex-col">
      {/* Header Premium Ivorian */}
      <div className="bg-gradient-to-r from-[#3C2A1E] to-[#5D4037] text-white py-8">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Scan className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Vérification Biométrique</h1>
              <p className="text-white/70 mt-1">Certifiez votre identité avec NeoFace</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto px-4 lg:px-8 py-10 max-w-5xl">
        {/* Stepper */}
        <div className="mb-8">
          <FormStepper
            currentStep={step}
            totalSteps={3}
            labels={stepLabels}
            allowClickNavigation={false}
            onStepChange={goToStep}
          />
        </div>

        {/* Step 1: Instructions */}
        <FormStepContent step={1} currentStep={step} slideDirection={slideDirection}>
          <div className="bg-white rounded-2xl shadow-lg border border-[#3C2A1E]/10 overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-[#F16522]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="h-10 w-10 text-[#F16522]" />
                </div>
                <h2 className="text-2xl font-bold text-[#3C2A1E]">Préparez-vous</h2>
                <p className="text-[#5D4037] mt-2">
                  Suivez ces étapes pour une vérification réussie
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-[#FDF6E3] rounded-xl">
                  <div className="w-8 h-8 bg-[#F16522] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3C2A1E]">Photo de votre CNI</h3>
                    <p className="text-sm text-[#5D4037]">
                      Prenez une photo claire de votre carte d'identité nationale
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#FDF6E3] rounded-xl">
                  <div className="w-8 h-8 bg-[#F16522] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3C2A1E]">Capture du selfie</h3>
                    <p className="text-sm text-[#5D4037]">
                      Une fenêtre s'ouvrira pour capturer votre visage avec détection de vivacité
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#FDF6E3] rounded-xl">
                  <div className="w-8 h-8 bg-[#F16522] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3C2A1E]">Vérification automatique</h3>
                    <p className="text-sm text-[#5D4037]">
                      Notre IA compare votre selfie avec la photo de votre CNI
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Conseils pour réussir</p>
                    <ul className="text-amber-700 mt-1 space-y-1">
                      <li>• Bonne luminosité (pas de contre-jour)</li>
                      <li>• Visage bien visible et centré</li>
                      <li>• Autorisez les popups dans votre navigateur</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={nextStep}
                className="w-full py-4 bg-[#F16522] text-white rounded-xl font-semibold hover:bg-[#D95318] transition-colors shadow-md"
              >
                Commencer
              </button>
            </div>
          </div>
        </FormStepContent>

        {/* Step 2: CNI Upload */}
        <FormStepContent step={2} currentStep={step} slideDirection={slideDirection}>
          <div className="bg-white rounded-2xl shadow-lg border border-[#3C2A1E]/10 overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-6">
                <Camera className="h-12 w-12 text-[#F16522] mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-[#3C2A1E]">Photo de votre CNI</h2>
                <p className="text-[#5D4037] mt-1">
                  Téléchargez une photo claire de votre carte d'identité
                </p>
              </div>

              {cniPhotoUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center relative">
                    <img
                      src={cniPhotoUrl}
                      alt="Photo CNI"
                      className="max-w-xs rounded-xl border-2 border-[#3C2A1E]/20 shadow-md"
                      onError={(e) => {
                        console.error(
                          "[BiometricVerification] Erreur de chargement de l'image CNI:",
                          e
                        );
                        console.error('[BiometricVerification] URL qui a échoué:', cniPhotoUrl);
                        setCniPhotoUrl(null);
                      }}
                      onLoad={(e) => {
                        console.log('[BiometricVerification] Image CNI chargée avec succès');
                      }}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Photo prête pour la vérification
                    </p>
                    <button
                      type="button"
                      onClick={handleChangePhoto}
                      className="text-sm text-[#F16522] hover:text-[#D95318] font-medium underline underline-offset-2"
                    >
                      Changer la photo
                    </button>
                  </div>
                  {/* Input file caché pour le changement de photo */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-[#3C2A1E]/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#F16522]/50 hover:bg-[#F16522]/5 transition-all">
                    <Upload className="h-12 w-12 text-[#5D4037] mx-auto mb-3" />
                    <p className="font-medium text-[#3C2A1E]">
                      {isUploading ? 'Téléchargement...' : 'Cliquez pour télécharger'}
                    </p>
                    <p className="text-sm text-[#5D4037] mt-1">PNG, JPG jusqu'à 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 border-2 border-[#3C2A1E]/20 text-[#3C2A1E] rounded-xl font-semibold hover:bg-[#3C2A1E]/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleStartVerification}
                  disabled={!cniPhotoUrl}
                  className="flex-1 py-3 bg-[#F16522] text-white rounded-xl font-semibold hover:bg-[#D95318] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          </div>
        </FormStepContent>

        {/* Step 3: Verification */}
        <FormStepContent step={3} currentStep={step} slideDirection={slideDirection}>
          <div className="space-y-6">
            {verificationResult?.success ? (
              <div className="bg-white rounded-2xl shadow-lg border border-green-200 overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-900">Vérification Réussie !</h2>
                  <p className="text-green-700 mt-2">{verificationResult.message}</p>
                  {verificationResult.score && (
                    <p className="text-green-600 font-medium mt-3">
                      Score de correspondance : {(verificationResult.score * 100).toFixed(1)}%
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/locataire/profil?tab=verification')}
                    className="mt-6 px-8 py-3 bg-[#F16522] text-white rounded-xl font-semibold hover:bg-[#D95318] transition-colors"
                  >
                    Retour au profil
                  </button>
                </div>
              </div>
            ) : (
              <>
                {cniPhotoUrl && user && (
                  <NeofaceVerification
                    key={`${cniPhotoUrl}-${verificationAttempt}`}
                    userId={user.id}
                    cniPhotoUrl={cniPhotoUrl}
                    onVerified={handleVerified}
                    onFailed={handleFailed}
                  />
                )}
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-full py-3 border-2 border-[#3C2A1E]/20 text-[#3C2A1E] rounded-xl font-semibold hover:bg-[#3C2A1E]/5 transition-colors"
                >
                  Retour
                </button>
              </>
            )}
          </div>
        </FormStepContent>
      </div>
    </div>
  );
}
