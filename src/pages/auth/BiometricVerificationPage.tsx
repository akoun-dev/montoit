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
  Sparkles,
  Shield,
  Smile,
  ArrowRight,
  Loader2,
  XCircle,
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
      isResetting.current = true;
      setVerificationResult(null);
      resetStepper();
      setCniPhotoUrl(null);
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
      const fallbackBucket = STORAGE_BUCKETS.AVATARS;

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
        const fallbackResult = await attemptUpload(fallbackBucket);
        bucketName = fallbackResult.bucketName;
        uploadError = fallbackResult.error;
      }

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, 60 * 60);

      let imageUrl: string;
      if (signedUrlError) {
        const publicUrl = getPublicUrl(bucketName, fileName);
        imageUrl = addCacheBuster(publicUrl);
      } else {
        imageUrl = signedUrlData.signedUrl;
      }

      setCniPhotoUrl(imageUrl);
      toast.success('Photo CNI téléchargée avec succès');
    } catch (err) {
      console.error('[BiometricVerification] Upload error:', err);
      const message =
        err instanceof Error && err.message.includes('Bucket not found')
          ? 'Bucket de vérification introuvable'
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
    setVerificationAttempt((prev) => prev + 1);
  };

  const handleStartVerification = () => {
    setVerificationResult(null);
    setVerificationAttempt((prev) => prev + 1);
    nextStep();
  };

  const handleChangePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCancel = () => {
    navigate('/locataire/profil?tab=verification');
  };

  const stepLabels = ['Bienvenue', 'Document', 'Vérification'];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FDF6E3] via-white to-[#FDF6E3] flex flex-col">
      {/* Header Premium Ivorian */}
      <div className="bg-gradient-to-r from-[#3C2A1E] to-[#5D4037] text-white">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-2 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F16522] to-[#d9571d] rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Shield className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Vérification d'Identité</h1>
              <p className="text-white/70 text-sm">Sécurisez votre compte avec reconnaissance faciale</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto px-4 lg:px-8 py-8 max-w-4xl">
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

        {/* Step 1: Welcome - Design amélioré avec couleurs originales */}
        <FormStepContent step={1} currentStep={step} slideDirection={slideDirection}>
          <div className="bg-white rounded-3xl shadow-xl border border-[#3C2A1E]/10 overflow-hidden">
            {/* Hero section */}
            <div className="relative bg-gradient-to-br from-[#F16522] to-[#d9571d] p-8 text-white">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYtNi02LTIuNjg2LTYtNnptMCAxMGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYtNi02LTIuNjg2LTYtNnoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Scan className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Commençons !</h2>
                    <p className="text-white/80 mt-1">Vérification simple et sécurisée</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    icon: Camera,
                    title: 'Photo CNI',
                    description: 'Téléchargez une photo claire de votre carte d\'identité',
                    color: 'from-[#F16522] to-[#d9571d]',
                    bgColor: 'bg-orange-50',
                  },
                  {
                    icon: Smile,
                    title: 'Selfie',
                    description: 'Une capture faciale avec détection de vivacité',
                    color: 'from-[#F16522] to-[#d9571d]',
                    bgColor: 'bg-orange-50',
                  },
                  {
                    icon: Shield,
                    title: 'IA sécurisée',
                    description: 'Comparaison automatique par intelligence artificielle',
                    color: 'from-green-600 to-emerald-600',
                    bgColor: 'bg-green-50',
                  },
                ].map((feature, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FDF6E3] to-[#FDF6E3] rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
                    <div className="relative p-4 text-center">
                      <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-[#3C2A1E] text-sm">{feature.title}</h3>
                      <p className="text-xs text-[#5D4037] mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900">Conseils pour réussir</p>
                    <ul className="text-amber-800 mt-2 text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Bonne luminosité, évitez le contre-jour
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Visage centré et bien visible
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        Autorisez les popups de votre navigateur
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={nextStep}
                className="group w-full py-4 bg-gradient-to-r from-[#F16522] to-[#d9571d] text-white rounded-2xl font-semibold hover:from-[#d9571d] hover:to-[#F16522] transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Commencer la vérification
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Trust badges */}
              <div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#5D4037]">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>100% Sécurisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scan className="h-4 w-4 text-[#F16522]" />
                  <span>IA Avancée</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#F16522]" />
                  <span>Gratuit</span>
                </div>
              </div>
            </div>
          </div>
        </FormStepContent>

        {/* Step 2: Document Upload - Design amélioré avec couleurs originales */}
        <FormStepContent step={2} currentStep={step} slideDirection={slideDirection}>
          <div className="bg-white rounded-3xl shadow-xl border border-[#3C2A1E]/10 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F16522] to-[#d9571d] p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <Camera className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Photo de votre CNI</h2>
                  <p className="text-white/80 text-sm">Téléchargez une photo claire de votre carte d'identité nationale</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {cniPhotoUrl ? (
                <div className="space-y-6">
                  {/* Image preview */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F16522]/20 to-[#d9571d]/20 rounded-3xl transform rotate-1"></div>
                    <div className="relative bg-gradient-to-br from-[#FDF6E3] to-gray-100 rounded-3xl p-8 flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#F16522]/20 to-[#d9571d]/20 rounded-2xl transform rotate-6 scale-110"></div>
                        <img
                          src={cniPhotoUrl}
                          alt="Photo CNI"
                          className="relative max-w-xs rounded-2xl shadow-2xl border-4 border-white"
                          onError={(e) => {
                            console.error("[BiometricVerification] Erreur de chargement de l'image:", e);
                            setCniPhotoUrl(null);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Success message */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-green-800 font-semibold">Photo prête pour la vérification</p>
                    </div>
                  </div>

                  {/* Change button */}
                  <button
                    type="button"
                    onClick={handleChangePhoto}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#F16522] hover:text-[#F16522] hover:bg-[#F16522]/10 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="h-5 w-5" />
                    Changer la photo
                  </button>

                  {/* Hidden file input */}
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
                <div className="space-y-6">
                  {/* Upload area */}
                  <label className="block cursor-pointer group">
                    <div className="border-3 border-dashed border-gray-300 rounded-3xl p-12 text-center hover:border-[#F16522] hover:bg-gradient-to-br hover:from-[#F16522]/5 hover:to-[#d9571d]/5 transition-all duration-300 group-hover:scale-[1.02]">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-[#F16522]/20 to-[#d9571d]/20 rounded-full animate-pulse"></div>
                        </div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-[#F16522] to-[#d9571d] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                          {isUploading ? (
                            <Loader2 className="h-10 w-10 text-white animate-spin" />
                          ) : (
                            <Upload className="h-10 w-10 text-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-gray-800 mb-2">
                        {isUploading ? 'Téléchargement en cours...' : 'Cliquez pour télécharger'}
                      </p>
                      <p className="text-gray-500">PNG, JPG jusqu'à 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>

                  {/* Document guide */}
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#F16522] rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-orange-900">Recommandations</p>
                        <ul className="text-orange-800 mt-2 text-sm space-y-1">
                          <li>• Photo claire et bien éclairée</li>
                          <li>• Tous les détails visibles</li>
                          <li>• Pas de reflets sur le document</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleStartVerification}
                  disabled={!cniPhotoUrl}
                  className="flex-1 py-4 bg-gradient-to-r from-[#F16522] to-[#d9571d] text-white rounded-2xl font-semibold hover:from-[#d9571d] hover:to-[#F16522] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  Continuer
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </FormStepContent>

        {/* Step 3: Verification - Design amélioré avec couleurs originales */}
        <FormStepContent step={3} currentStep={step} slideDirection={slideDirection}>
          <div className="space-y-6">
            {verificationResult?.success ? (
              <div className="bg-white rounded-3xl shadow-xl border-2 border-green-200 overflow-hidden">
                {/* Success Header */}
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-8 text-white text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                    <div className="relative w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <CheckCircle className="h-14 w-14 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Vérification Réussie !</h2>
                  <p className="text-white/90 text-lg">Votre identité a été confirmée</p>
                </div>

                {/* Score */}
                {verificationResult.score && (
                  <div className="p-8 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">Score de correspondance</p>
                      <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-8 py-4 shadow-lg">
                        <span className="text-5xl font-bold text-green-600">
                          {(verificationResult.score * 100).toFixed(0)}%
                        </span>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-8">
                  <button
                    onClick={() => navigate('/locataire/profil?tab=verification')}
                    className="w-full py-4 bg-gradient-to-r from-[#F16522] to-[#d9571d] text-white rounded-2xl font-semibold hover:from-[#d9571d] hover:to-[#F16522] transition-all shadow-lg"
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
                  className="w-full py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
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
