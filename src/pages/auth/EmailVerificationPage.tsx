import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/shared/useToast';
import { supabase } from '@/services/supabase/client';

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown pour renvoyer le code
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Email manquant. Veuillez recommencer l\'inscription.');
      navigate('/inscription');
      return;
    }

    if (code.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            code,
            purpose: 'email_verification',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la vérification');
      }

      toast.success('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
      navigate('/connexion?verified=true');

    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Code invalide ou expiré');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;

    setIsResending(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email,
            purpose: 'email_verification',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi du code');
      }

      toast.success('Un nouveau code a été envoyé');
      setCode('');
      setTimeLeft(60);
      setCanResend(false);

    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  // Formatage visuel du code (3 groupes de 2 chiffres)
  const displayCode = code.padEnd(6, '_').match(/.{1,2}/g)?.join(' ') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F4] to-[#EFEBE9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/connexion')}
          className="mb-6 flex items-center gap-2 text-[#6B5A4E] hover:text-[#2C1810] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#EFEBE9]">
          {/* Icon */}
          <div className="w-16 h-16 bg-[#F16522]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#F16522]" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-[#2C1810] mb-2">
            Vérifiez votre email
          </h1>
          <p className="text-center text-[#6B5A4E] mb-8">
            Nous avons envoyé un code de vérification à 6 chiffres à{' '}
            <span className="font-semibold text-[#2C1810]">{email}</span>
          </p>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-3">
                Code de vérification
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={displayCode}
                onChange={handleCodeChange}
                placeholder="_ _ _   _ _ _"
                className="w-full text-center text-2xl tracking-[0.5em] font-bold text-[#2C1810] bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl px-4 py-4 focus:outline-none focus:border-[#F16522] focus:ring-2 focus:ring-[#F16522]/20 transition-all"
                autoFocus
              />
              <p className="text-xs text-[#A69B95] mt-2 text-center">
                Entrez les 6 chiffres reçus par email
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={code.length !== 6 || isLoading}
              className="w-full bg-[#F16522] hover:bg-[#d9571d] disabled:bg-[#A69B95] disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Vérifier
                </>
              )}
            </button>

            {/* Resend */}
            <div className="text-center">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-[#F16522] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Envoi en cours...' : 'Renvoyer le code'}
                </button>
              ) : (
                <p className="text-sm text-[#A69B95]">
                  Renvoyer le code dans <span className="font-semibold">{timeLeft}s</span>
                </p>
              )}
            </div>
          </form>

          {/* Help */}
          <div className="mt-6 p-4 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
            <p className="text-sm text-[#6B5A4E] text-center">
              <strong>Vous n'avez pas reçu le code ?</strong> Vérifiez vos spams ou{' '}
              <button
                onClick={() => navigate('/inscription')}
                className="text-[#F16522] font-medium hover:underline"
              >
                réessayez
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
