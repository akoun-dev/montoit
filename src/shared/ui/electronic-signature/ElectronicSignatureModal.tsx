/**
 * ElectronicSignatureModal - Modal for electronic signature workflow using CryptoNeo
 *
 * This component manages the complete electronic signature process:
 * 1. Certificate generation (if needed)
 * 2. OTP verification
 * 3. Document signing
 * 4. Status tracking
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/Button';
import { useElectronicSignature, SignatureStep } from '@/hooks/contract/useElectronicSignature';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import OTPInput from '@/shared/components/modern/OTPInput';
import { toast } from '@/hooks/shared/useSafeToast';
import {
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  RefreshCw,
  FileText,
  Clock,
  X,
  Info,
  Upload,
  Camera,
  User,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface SignatureDocument {
  id: string;
  url: string;
  title: string;
}

interface ElectronicSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: SignatureDocument[];
  contractId: string;
  onSuccess?: (signedDocumentUrls: string[]) => void;
  onError?: (error: string) => void;
}

const stepConfig: Record<
  SignatureStep,
  { title: string; description: string; showProgress?: boolean }
> = {
  idle: {
    title: 'Signature Électronique',
    description: 'Signez vos documents électroniquement avec CryptoNeo',
  },
  collect_data: {
    title: 'Informations requises',
    description: 'Veuillez fournir les informations nécessaires pour générer votre certificat',
  },
  generating_cert: {
    title: 'Génération du Certificat',
    description: 'Création de votre certificat numérique en cours...',
    showProgress: true,
  },
  waiting_otp: {
    title: 'Vérification',
    description: 'Entrez le code de vérification reçu',
  },
  signing: {
    title: 'Signature en Cours',
    description: 'Signature de vos documents en cours...',
    showProgress: true,
  },
  completed: {
    title: 'Signature Réussie',
    description: 'Vos documents ont été signés avec succès',
  },
  error: {
    title: 'Erreur',
    description: 'Une erreur est survenue',
  },
};

export function ElectronicSignatureModal({
  isOpen,
  onClose,
  documents,
  contractId,
  onSuccess,
  onError,
}: ElectronicSignatureModalProps) {
  console.log('[ElectronicSignatureModal] Component called with props:', { isOpen, documents, contractId });

  const { user } = useAuth();
  const [otpCanal, setOtpCanal] = useState<'SMS' | 'MAIL'>('SMS');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Signature data collection state
  const [gender, setGender] = useState<'Homme' | 'Femme' | ''>('');
  const [signaturePhone, setSignaturePhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [consentement, setConsentement] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileData, setProfileData] = useState<{ gender?: string | null; phone?: string | null } | null>(null);

  // Récupérer le téléphone, email et genre du profil au chargement
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('phone, gender')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfileData(data);
          if (data.phone) {
            setUserPhone(data.phone);
            setSignaturePhone(data.phone);
          }
          if (data.gender) {
            setGender(data.gender);
          }
        }
        setUserEmail(user.email || '');
      }
    };
    fetchProfile();
  }, [user]);

  const {
    step,
    loading,
    error,
    certificateAlias,
    operationId,
    startSignatureProcess,
    setSignatureDataAndGenerate,
    sendOTP,
    submitOTP,
    reset,
    cancel,
  } = useElectronicSignature();

  console.log('[ElectronicSignatureModal] Hook state:', { step, loading, error, certificateAlias, operationId });

  // Countdown for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setOtpCode('');
      setCountdown(0);
      setGender('');
      setPhotoFile(null);
      setPhotoPreview('');
      setConsentement(false);
      setProfileData(null);
    }
  }, [isOpen, reset]);

  // Auto-start signature process when modal opens (move to collect_data step)
  useEffect(() => {
    console.log('[ElectronicSignatureModal] isOpen:', isOpen, 'step:', step);
    if (isOpen && step === 'idle') {
      console.log('[ElectronicSignatureModal] Starting signature process...');
      startSignatureProcess(documents, contractId);
    }
  }, [isOpen, step, documents, contractId, startSignatureProcess]);

  // Calculate hash from file and convert to base64
  // IMPORTANT: Hash must be calculated on the BINARY file first, then converted to base64
  const processPhotoFile = (file: File): Promise<{ base64: string; hash: string }> => {
    return new Promise((resolve, reject) => {
      // Step 1: Read file as ArrayBuffer to calculate hash
      const arrayBufferReader = new FileReader();
      arrayBufferReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;

          // Step 2: Calculate SHA-256 hash on the BINARY data (as per CryptoNeo documentation)
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
          console.log('🔐 Hash calculated from binary file:', hash.substring(0, 16) + '...');

          // Step 3: Convert to base64 for API
          const blob = new Blob([arrayBuffer], { type: file.type });
          const base64Reader = new FileReader();
          base64Reader.onload = (base64Event) => {
            const result = base64Event.target?.result as string;
            // Extract base64 without the data:image/...;base64, prefix
            const base64 = result.split(',')[1] || result;
            console.log('📸 Base64 length:', base64.length);
            resolve({ base64, hash });
          };
          base64Reader.onerror = reject;
          base64Reader.readAsDataURL(blob);
        } catch (err) {
          reject(err);
        }
      };
      arrayBufferReader.onerror = reject;
      arrayBufferReader.readAsArrayBuffer(file);
    });
  };

  // Handle photo file selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 5MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image');
        return;
      }
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission for data collection step
  const handleDataSubmit = async () => {
    // Use profile data for gender
    const profileGender = profileData?.gender;
    if (!profileGender || profileGender === 'Non spécifié') {
      toast.error('Genre non renseigné dans votre profil. Veuillez compléter votre profil.');
      return;
    }
    if (!photoFile && !photoPreview) {
      toast.error('Veuillez fournir une photo');
      return;
    }
    if (!consentement) {
      toast.error('Veuillez accepter les conditions générales');
      return;
    }
    // Use phone from profile
    const phoneDigits = profileData?.phone?.replace(/\D/g, '') || '';
    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 15) {
      toast.error('Numéro de téléphone invalide dans votre profil. Veuillez compléter votre profil.');
      return;
    }

    setUploadingPhoto(true);
    try {
      let photoBase64: string;
      let photoHash: string;

      if (photoFile) {
        // Process photo file: calculate hash from binary, then convert to base64
        const result = await processPhotoFile(photoFile);
        photoBase64 = result.base64;
        photoHash = result.hash;
      } else {
        // Use existing preview - need to decode base64 to binary, hash it, then re-encode
        const base64Data = photoPreview.split(',')[1] || photoPreview;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Calculate hash from binary
        const hashBuffer = await crypto.subtle.digest('SHA-256', bytes.buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        photoHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        // Keep the base64 as-is
        photoBase64 = base64Data;
      }

      await setSignatureDataAndGenerate(
        {
          gender: profileGender as 'Homme' | 'Femme',
          photoBase64,
          photoHash,
          phone: phoneDigits,
          consentement,
        },
        documents,
        contractId
      );
    } catch (err) {
      console.error('Error processing photo:', err);
      toast.error('Erreur lors du traitement de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle OTP send
  const handleSendOTP = async () => {
    const destination = otpCanal === 'SMS' ? userPhone : userEmail;
    if (otpCanal === 'SMS' && (!destination || !destination.match(/^\+[1-9]\d{7,14}$/))) {
      return;
    }
    try {
      await sendOTP(otpCanal, destination);
      // Succès : démarrer le countdown et afficher le champ OTP
      setCountdown(60);
    } catch (err) {
      // Erreur déjà gérée par le hook (toast affiché)
      console.error('Error sending OTP:', err);
    }
  };

  // Handle OTP submit
  const handleSubmitOTP = async () => {
    if (otpCode.length === 6) {
      await submitOTP(otpCode, documents);
    }
  };

  // Handle completion
  useEffect(() => {
    if (step === 'completed') {
      onSuccess?.([]);
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  }, [step, onSuccess, onClose]);

  // Handle error - NOTifier mais ne PAS fermer le modal automatiquement
  useEffect(() => {
    if (step === 'error' && error) {
      // Afficher l'erreur via toast mais garder le modal ouvert
      onError?.(error);
    }
  }, [step, error, onError]);

  const currentStepConfig = stepConfig[step];
  const isCloseDisabled = loading || step === 'signing' || step === 'generating_cert' || step === 'collect_data';

  console.log('[ElectronicSignatureModal] Render - isOpen:', isOpen, 'step:', step, 'loading:', loading);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('[ElectronicSignatureModal] Dialog onOpenChange - open:', open, 'isCloseDisabled:', isCloseDisabled);
      if (!isCloseDisabled) {
        onClose();
      }
    }}>
      <DialogContent
        className={cn(
          'sm:max-w-md w-full',
          step === 'completed' && 'sm:max-w-sm'
        )}
        onPointerDownOutside={(e) => isCloseDisabled && e.preventDefault()}
        onEscapeKeyDown={(e) => isCloseDisabled && e.preventDefault()}
      >
        {/* Close button */}
        {!isCloseDisabled && step !== 'completed' && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </button>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {currentStepConfig.title}
          </DialogTitle>
          <DialogDescription>{currentStepConfig.description}</DialogDescription>
        </DialogHeader>

        {/* Content based on step */}
        <div className="mt-4">
          {/* Step: Collect Data */}
          {step === 'collect_data' && (
            <div className="space-y-6">
              {/* Documents list */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Documents à signer :</p>
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{doc.title}</span>
                  </div>
                ))}
              </div>

              {/* Profile info display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations du profil
                </p>
                <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <p>Genre : <span className="font-medium">{profileData?.gender || 'Non renseigné'}</span></p>
                  <p>Téléphone : <span className="font-medium">{profileData?.phone || 'Non renseigné'}</span></p>
                </div>
              </div>

              {/* Photo upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Photo d'identité *
                </label>
                <p className="text-xs text-muted-foreground">
                  Une photo claire de votre visage pour le certificat numérique (max 5MB)
                </p>
                {photoPreview ? (
                  <div className="space-y-3">
                    <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden border-2 border-neutral-200">
                      <img
                        src={photoPreview}
                        alt="Photo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview('');
                        }}
                      >
                        Changer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary-500">Cliquez pour télécharger</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 5MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handlePhotoChange}
                    />
                  </label>
                )}
              </div>

              {/* CGU Consent */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentement}
                    onChange={(e) => setConsentement(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary-500 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Consentement *</p>
                    <p className="text-muted-foreground mt-1">
                      J'accepte les conditions générales d'utilisation de CryptoNeo et consens au traitement de mes données personnelles pour la signature électronique.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleDataSubmit}
                disabled={!photoPreview || !consentement || uploadingPhoto}
                className="w-full"
                size="medium"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2 shrink-0" />
                    <span>Générer le certificat</span>
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Ces informations sont requises par CryptoNeo pour générer votre certificat numérique de signature.
                </p>
              </div>
            </div>
          )}

          {/* Step: Generating Certificate */}
          {step === 'generating_cert' && (
            <div className="text-center py-8 space-y-4">
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <Loader2 className="w-full h-full text-primary-500 animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">Génération de votre certificat numérique</p>
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter pendant que nous créons votre certificat...
                </p>
              </div>
            </div>
          )}

          {/* Step: Waiting for OTP */}
          {step === 'waiting_otp' && (
            <div className="space-y-6">
              {/* Documents list */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Documents à signer :</p>
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{doc.title}</span>
                  </div>
                ))}
              </div>

              {/* Certificate info */}
              {certificateAlias && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Certificat prêt
                    </p>
                    <p className="text-green-600 dark:text-green-400">
                      Alias : {certificateAlias}
                    </p>
                  </div>
                </div>
              )}

              {/* OTP canal selection */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  Mode de réception du code :
                </label>

                {otpCanal === 'SMS' ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Numéro de téléphone (format +225XXXXXXXXX) :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="+2250700000000"
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="small"
                          onClick={() => setOtpCanal('MAIL')}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                      {userPhone && !userPhone.match(/^\+[1-9]\d{7,14}$/) && (
                        <p className="text-xs text-destructive">
                          Format invalide. Utilisez le format E.164 : +225XXXXXXXXX
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Adresse email :
                      </label>
                      <div className="flex gap-2 items-center p-3 bg-muted/50 rounded-md">
                        <span className="text-sm flex-1">{userEmail}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="small"
                          onClick={() => setOtpCanal('SMS')}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Send OTP button */}
              {countdown === 0 ? (
                <Button
                  onClick={handleSendOTP}
                  disabled={loading || (otpCanal === 'SMS' && (!userPhone || !userPhone.match(/^\+[1-9]\d{7,14}$/)))}
                  className="w-full"
                  size="medium"
                >
                  <Send className="w-4 h-4 mr-2 shrink-0" />
                  <span>Envoyer le code</span>
                </Button>
              ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  Renvoyer dans {countdown}s
                </div>
              )}

              {/* OTP Input */}
              {countdown > 0 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Entrez le code à 6 chiffres reçu par {otpCanal === 'SMS' ? 'SMS' : 'email'}
                    </p>
                  </div>

                  <OTPInput
                    length={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={handleSubmitOTP}
                    autoFocus
                  />

                  <Button
                    onClick={handleSubmitOTP}
                    disabled={otpCode.length !== 6 || loading}
                    className="w-full"
                    size="medium"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                        <span>Signature en cours...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2 shrink-0" />
                        <span>Signer les documents</span>
                      </>
                    )}
                  </Button>

                  {/* Resend */}
                  {countdown === 0 && (
                    <button
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="w-full text-sm text-primary-500 hover:underline flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 shrink-0" />
                      <span>Renvoyer le code</span>
                    </button>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Le code est valide pendant 5 minutes. La signature peut prendre quelques
                  secondes après validation.
                </p>
              </div>
            </div>
          )}

          {/* Step: Signing */}
          {step === 'signing' && (
            <div className="text-center py-8 space-y-4">
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <Loader2 className="w-full h-full text-primary-500 animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">Signature de vos documents...</p>
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter, cela peut prendre quelques secondes
                </p>
              </div>
              {operationId && (
                <p className="text-xs text-muted-foreground">
                  Opération n° {operationId}
                </p>
              )}
            </div>
          )}

          {/* Step: Completed */}
          {step === 'completed' && (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-green-700 dark:text-green-300">
                  Signature réussie !
                </h4>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Vos documents ont été signés électroniquement
                </p>
              </div>
              <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
                <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Certifié CryptoNeo
                </span>
              </div>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Erreur</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={cancel}
                  variant="outline"
                  className="flex-1"
                  size="medium"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    reset();
                    startSignatureProcess(documents, contractId);
                  }}
                  className="flex-1"
                  size="medium"
                >
                  <RefreshCw className="w-4 h-4 mr-2 shrink-0" />
                  <span>Réessayer</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(step === 'waiting_otp' || step === 'collect_data') && !loading && (
          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={cancel}
              variant="ghost"
              className="w-full"
              size="small"
            >
              Annuler la signature
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ElectronicSignatureModal;
