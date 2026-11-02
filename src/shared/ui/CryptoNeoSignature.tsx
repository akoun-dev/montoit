import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Loader, CheckCircle, AlertCircle, Send, RefreshCw } from 'lucide-react';
import OTPInput from '@/shared/components/modern/OTPInput';
import { useConfetti } from '@/hooks/shared/useConfetti';

interface CryptoNeoSignatureProps {
  leaseId: string;
  userPhone?: string;
  userEmail?: string;
  onSuccess: (signedUrl: string) => void;
  onError: (error: string) => void;
  className?: string;
}

export default function CryptoNeoSignature({
  leaseId,
  userPhone,
  userEmail,
  onSuccess,
  onError,
  className = '',
}: CryptoNeoSignatureProps) {
  const [step, setStep] = useState<'idle' | 'sending' | 'otp' | 'signing' | 'success' | 'error'>(
    'idle'
  );
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300);
  const { triggerCertifiedSignatureConfetti } = useConfetti();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);

  // OTP expiry countdown
  useEffect(() => {
    if (step === 'otp' && expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, expiresIn]);

  const handleSendOTP = async () => {
    setStep('sending');
    setError('');

    try {
      const { data, error: sendError } = await supabase.functions.invoke('cryptoneo-send-otp', {
        body: {
          phone: userPhone,
          email: userEmail,
        },
      });

      if (sendError) throw sendError;

      if (data.success) {
        setStep('otp');
        setCountdown(60);
        setExpiresIn(data.expiresIn || 300);
      } else {
        throw new Error(data.error || "Échec de l'envoi du code");
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code");
      setStep('error');
      onError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code");
    }
  };

  const handleVerifyAndSign = async () => {
    if (otpCode.length !== 6) return;

    setStep('signing');
    setError('');

    try {
      const { data, error: signError } = await supabase.functions.invoke(
        'cryptoneo-sign-document',
        {
          body: {
            leaseId,
            otpCode,
          },
        }
      );

      if (signError) throw signError;

      if (data.success) {
        setStep('success');
        triggerCertifiedSignatureConfetti();
        onSuccess(data.signedDocumentUrl || '');
      } else {
        throw new Error(data.error || 'Échec de la signature');
      }
    } catch (err) {
      console.error('Error signing document:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la signature');
      setStep('error');
      onError(err instanceof Error ? err.message : 'Erreur lors de la signature');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`form-section-premium ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-[#F16522] to-[#E85A1B] rounded-xl shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#4A2C17]">Signature Certifiée CryptoNeo</h3>
          <p className="text-sm text-[#8B7355]">
            Valeur légale équivalente à une signature notariée
          </p>
        </div>
      </div>

      {/* Step: Idle - Request OTP */}
      {step === 'idle' && (
        <div className="space-y-4">
          <p className="text-[#5D4E37]">
            Pour procéder à la signature certifiée, un code de vérification sera envoyé à :
          </p>
          <div className="bg-[#F9F6F1] rounded-xl p-4 border border-[#E8DFD5]">
            {userPhone && <p className="text-[#4A2C17] font-medium">📱 {userPhone}</p>}
            {userEmail && <p className="text-[#4A2C17] font-medium">✉️ {userEmail}</p>}
          </div>
          <button
            onClick={handleSendOTP}
            className="form-button-primary w-full flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span>Envoyer le code de vérification</span>
          </button>
        </div>
      )}

      {/* Step: Sending OTP */}
      {step === 'sending' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-[#F16522] animate-spin mx-auto mb-4" />
          <p className="text-[#5D4E37]">Envoi du code en cours...</p>
        </div>
      )}

      {/* Step: OTP Input */}
      {step === 'otp' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-[#5D4E37] mb-2">
              Entrez le code reçu par {userPhone ? 'SMS' : 'email'}
            </p>
            <p className="text-sm text-[#8B7355]">
              Expire dans <span className="font-bold text-[#F16522]">{formatTime(expiresIn)}</span>
            </p>
          </div>

          <OTPInput
            length={6}
            value={otpCode}
            onChange={setOtpCode}
            onComplete={handleVerifyAndSign}
            autoFocus
          />

          <button
            onClick={handleVerifyAndSign}
            disabled={otpCode.length !== 6}
            className="form-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shield className="w-5 h-5" />
            <span>Signer le document</span>
          </button>

          {/* Resend button */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-[#8B7355]">Renvoyer dans {countdown}s</p>
            ) : (
              <button
                onClick={handleSendOTP}
                className="text-[#F16522] font-medium hover:underline flex items-center justify-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Renvoyer le code</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step: Signing */}
      {step === 'signing' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-[#F16522] animate-spin mx-auto mb-4" />
          <p className="text-[#5D4E37] font-medium">Signature en cours...</p>
          <p className="text-sm text-[#8B7355] mt-2">
            Veuillez patienter, cela peut prendre quelques secondes
          </p>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="text-center py-8 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-scale-in">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h4 className="text-2xl font-bold text-green-700 mb-2">🎉 Signature réussie!</h4>
          <p className="text-green-600 mb-4">Votre document a été signé et certifié avec succès.</p>
          <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Certifié CryptoNeo</span>
          </div>
        </div>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Erreur</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setStep('idle')}
            className="w-full py-3 border-2 border-[#4A2C17]/30 text-[#4A2C17] font-medium rounded-xl hover:bg-[#F9F6F1] transition"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
