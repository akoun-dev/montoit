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
import OTPInput from '@/shared/components/modern/OTPInput';
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

  const [otpCanal, setOtpCanal] = useState<'SMS' | 'MAIL'>('SMS');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const {
    step,
    loading,
    error,
    certificateAlias,
    operationId,
    startSignatureProcess,
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
    }
  }, [isOpen, reset]);

  // Auto-start signature process when modal opens
  useEffect(() => {
    console.log('[ElectronicSignatureModal] isOpen:', isOpen, 'step:', step);
    if (isOpen && step === 'idle') {
      console.log('[ElectronicSignatureModal] Starting signature process...');
      startSignatureProcess(documents, contractId);
    }
  }, [isOpen, step, documents, contractId, startSignatureProcess]);

  // Handle OTP send
  const handleSendOTP = async () => {
    await sendOTP(otpCanal);
    setCountdown(60);
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
  const isCloseDisabled = loading || step === 'signing' || step === 'generating_cert';

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
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Mode de réception du code :
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={otpCanal === 'SMS' ? 'primary' : 'outline'}
                    size="small"
                    onClick={() => setOtpCanal('SMS')}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2 shrink-0" />
                    <span>SMS</span>
                  </Button>
                  <Button
                    type="button"
                    variant={otpCanal === 'MAIL' ? 'primary' : 'outline'}
                    size="small"
                    onClick={() => setOtpCanal('MAIL')}
                    className="w-full"
                  >
                    <Info className="w-4 h-4 mr-2 shrink-0" />
                    <span>Email</span>
                  </Button>
                </div>
              </div>

              {/* Send OTP button */}
              {countdown === 0 ? (
                <Button
                  onClick={handleSendOTP}
                  disabled={loading}
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
              {countdown < 60 && countdown > 0 && (
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
        {step === 'waiting_otp' && !loading && (
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
