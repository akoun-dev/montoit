/**
 * ModernAuthPage - Split Screen Premium Ivorian
 *
 * FLUX TÉLÉPHONE UNIFIÉ:
 * 1. Entrer numéro → 2. Vérifier OTP → 3. Auto-détection:
 *    - Si compte existe → Connexion directe
 *    - Si nouveau → Demander nom → Créer compte
 *
 * EMAIL: Garde les tabs Connexion/Inscription classiques
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Star,
  Home,
  Shield,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { InputWithIcon } from '@/shared/ui';
import { PhoneInputWithCountry } from '@/shared/components/PhoneInputWithCountry';
import { otpService } from '@/services/auth/otp.service';

// Regex de validation email conforme RFC 5322
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Regex de validation nom complet (minimum 5 caractères, lettres avec accents, espaces, tirets, apostrophes)
const FULL_NAME_REGEX = /^[\p{L}\s'-]{5,}$/u;
import OTPInput from '@/shared/components/modern/OTPInput';
import { getDashboardRoute } from '@/shared/utils/roleRoutes';

type AuthMethod = 'phone' | 'email';
type PhoneStep = 'enter' | 'verify' | 'name';
type EmailMode = 'login' | 'register';
type EmailStep = 'form' | 'otp' | 'role';

const deriveEmailModeFromPath = (path: string): EmailMode =>
  path.includes('/inscription') ? 'register' : 'login';

const shouldDefaultToEmail = (path: string): boolean =>
  path.includes('/connexion') || path.includes('/inscription');

// Slides pour le côté gauche (témoignages)
const AUTH_SLIDES = [
  {
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80',
    quote:
      "J'ai trouvé mon appartement à Cocody en moins d'une semaine. Vraiment efficace et sécurisé !",
    author: 'Sarah & Marc, Cocody',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
    quote:
      'La signature numérique et le paiement par Mobile Money ont rendu ma location super simple.',
    author: 'Aïcha K., Plateau',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
    quote: 'Comme propriétaire, je peux gérer mes biens et mes locataires en toute confiance.',
    author: 'Konan D., Marcory',
  },
];

export default function ModernAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    shouldDefaultToEmail(location.pathname) ? 'email' : 'phone'
  );
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
  const [emailMode, setEmailMode] = useState<EmailMode>(deriveEmailModeFromPath(location.pathname));
  const [emailStep, setEmailStep] = useState<EmailStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileType, setProfileType] = useState<'tenant' | 'owner' | 'agency'>('tenant');
  const [emailOtp, setEmailOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Consentement légal
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // Phone fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [, setCountryDialCode] = useState('+225');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [otp, setOtp] = useState('');
  // WhatsApp désactivé - SMS uniquement
  const [sendMethod] = useState<'sms'>('sms');
  const [resendTimer, setResendTimer] = useState(0);

  // Rotation automatique des slides
  useEffect(() => {
    const timer = setInterval(() => setSlideIndex((p) => (p + 1) % AUTH_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendTimer]);

  // Sync URL with email mode
  useEffect(() => {
    const expectedMode = deriveEmailModeFromPath(location.pathname);
    if (emailMode !== expectedMode) {
      setEmailMode(expectedMode);
    }
  }, [location.pathname, emailMode]);

  const handleEmailModeChange = (mode: EmailMode) => {
    const targetPath = mode === 'register' ? '/inscription' : '/connexion';
    navigate(targetPath, { replace: true });
    setEmailMode(mode);
    setEmailStep('form');
    setError('');
    setSuccess('');
  };

  const handleMethodChange = (method: AuthMethod) => {
    setAuthMethod(method);
    setPhoneStep('enter');
    setError('');
    setSuccess('');
    setOtp('');
    setEmailStep('form');
    setEmailOtp('');
    setPendingEmail('');
    setPendingPassword('');
    setPendingUserId(null);

    if (method === 'email') {
      setEmailMode(deriveEmailModeFromPath(location.pathname));
    }
  };

  const buildSafeSessionUrl = (sessionUrl: string) => {
    const expectedRedirect = `${window.location.origin}/auth/callback`;

    try {
      const url = new URL(sessionUrl);
      const redirectParam = url.searchParams.get('redirect_to');
      const decodedRedirect = redirectParam ? decodeURIComponent(redirectParam) : null;

      const sanitizedRedirect =
        decodedRedirect && decodedRedirect.includes('/auth/callback/auth/callback')
          ? decodedRedirect.replace('/auth/callback/auth/callback', '/auth/callback')
          : decodedRedirect;

      if (!sanitizedRedirect || sanitizedRedirect !== expectedRedirect) {
        url.searchParams.set('redirect_to', expectedRedirect);
      } else {
        url.searchParams.set('redirect_to', sanitizedRedirect);
      }

      let normalizedUrl = url.toString();

      if (normalizedUrl.includes('/auth/callback/auth/callback')) {
        normalizedUrl = normalizedUrl.replace('/auth/callback/auth/callback', '/auth/callback');
      }

      return normalizedUrl;
    } catch (err) {
      console.error('Failed to normalize sessionUrl', err, { sessionUrl });
      return sessionUrl.includes('/auth/callback/auth/callback')
        ? sessionUrl.replace('/auth/callback/auth/callback', '/auth/callback')
        : sessionUrl;
    }
  };

  const resetPhoneFlow = () => {
    setPhoneStep('enter');
    setOtp('');
    setFullName('');
    setError('');
    setSuccess('');
  };

  const sendResendOtp = async (
    targetEmail: string
  ): Promise<{ code: string; viaFallback: boolean }> => {
    try {
      // Appeler notre edge function email-otp-send qui utilise Azure Gateway
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration Supabase manquante');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/email-otp-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          email: targetEmail,
          purpose: 'email_verification',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[sendResendOtp] Error sending OTP:', result);
        throw new Error(result.error || 'Envoi du code impossible');
      }

      // Afficher l'OTP dans la console navigateur
      if (result.devOtp) {
        console.log(
          '%c========================================',
          'color: #f97316; font-weight: bold'
        );
        console.log(
          '%c📧 OTP EMAIL VÉRIFICATION',
          'color: #f97316; font-weight: bold; font-size: 14px'
        );
        console.log(
          '%c========================================',
          'color: #f97316; font-weight: bold'
        );
        console.log(`Email:   %c${targetEmail}`, 'color: #2C1810; font-weight: bold');
        console.log(
          `OTP:    %c${result.devOtp}`,
          'color: #f97316; font-size: 18px; font-weight: bold; font-size: 24px;'
        );
        console.log(`Valide:  %c10 minutes`, 'color: #6B7280');
        console.log(
          '%c========================================\n',
          'color: #f97316; font-weight: bold'
        );
      }

      const code = result.devOtp || '(voir email)';
      console.log('[sendResendOtp] OTP envoyé avec succès via Resend');
      return { code, viaFallback: false };
    } catch (err: unknown) {
      console.error('Failed to send OTP email via edge function:', err);
      throw new Error(err instanceof Error ? err.message : 'Envoi du code impossible');
    }
  };

  // ===================== EMAIL LOGIN =====================
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation email
      if (!EMAIL_REGEX.test(email)) {
        throw new Error("Format d'email invalide. Ex: exemple@domaine.com");
      }

      console.log('Attempting login with email:', email);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      console.log('Login successful, redirecting to /dashboard');
      // Use window.location for immediate redirect
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Email ou mot de passe incorrect';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===================== EMAIL REGISTER =====================
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation email
      if (!EMAIL_REGEX.test(email)) {
        throw new Error("Format d'email invalide. Ex: exemple@domaine.com");
      }
      // Validation nom complet (minimum 5 caractères, lettres uniquement)
      if (!FULL_NAME_REGEX.test(fullName.trim())) {
        throw new Error('Le nom complet doit contenir au moins 5 lettres');
      }
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      if (password.length < 6) {
        throw new Error('Mot de passe trop court (minimum 6 caractères)');
      }

      // Validation du consentement légal
      if (!acceptTerms || !acceptPrivacy) {
        throw new Error(
          'Vous devez accepter les Conditions Générales d\'Utilisation et la Politique de Confidentialité pour continuer'
        );
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (signUpError) throw signUpError;

      // Empêcher l'auto-connexion si confirmations email désactivées.
      // L'utilisateur ne doit être connecté qu'après vérification OTP.
      if (authData.session) {
        await supabase.auth.signOut();
      }

      setPendingEmail(email);
      setPendingPassword(password);
      setPendingUserId(authData.user?.id ?? null);

      // Envoyer OTP via Resend
      const { viaFallback, code } = await sendResendOtp(email);
      setSuccess(
        viaFallback
          ? `Code de test (local) : ${code}`
          : 'Code envoyé à votre email. Saisissez-le pour continuer.'
      );
      setEmailStep('otp');
      setEmailOtp('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===================== PHONE - SEND OTP =====================
  const handleSendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      // Vérifier le rate limiting
      const rateLimitCheck = await otpService.checkRateLimit(phoneNumber, 'otp-send', 5, 3);
      if (!rateLimitCheck.allowed && rateLimitCheck.remainingTime) {
        setResendTimer(rateLimitCheck.remainingTime);
        setError(`Patientez ${rateLimitCheck.remainingTime} secondes avant de réessayer`);
        setLoading(false);
        return;
      }

      // Envoyer l'OTP via le service unifié (utilise send-sms-azure pour SMS/WhatsApp)
      const method = sendMethod === 'whatsapp' ? 'whatsapp' : 'sms';
      const result = await otpService.sendOTP({
        recipient: phoneNumber,
        method,
        purpose: 'auth',
        expiresIn: 10,
      });

      if (!result.success) {
        setError(result.error || "Erreur lors de l'envoi du SMS");
        return;
      }

      const channelLabel = sendMethod === 'whatsapp' ? 'WhatsApp' : 'SMS';
      setSuccess(`Code envoyé par ${channelLabel} !`);

      setPhoneStep('verify');
      setResendTimer(60);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===================== PHONE - VERIFY OTP =====================
  const handleVerifyOTP = async (withName = false) => {
    setError('');
    setLoading(true);

    try {
      const siteUrl = window.location.origin;
      const response = await supabase.functions.invoke('phone-otp-verify', {
        body: {
          phoneNumber,
          code: otp,
          fullName: withName ? fullName : undefined,
          siteUrl,
          termsAcceptedAt: acceptTerms ? new Date().toISOString() : undefined,
          privacyAcceptedAt: acceptPrivacy ? new Date().toISOString() : undefined,
        },
      });

      const data = response.data;
      const invokeError = response.error;

      if (invokeError) {
        throw new Error(invokeError.message || 'Erreur de communication');
      }

      if (!data.success) {
        // Handle specific error codes
        switch (data.errorCode) {
          case 'INVALID_OTP':
            throw new Error('Le code est incorrect ou expiré.');
          case 'USER_EXISTS_CONFLICT':
            // Cas rare : proposer plutôt une connexion directe
            throw new Error('Ce numéro est déjà associé à un compte. Veuillez réessayer.');
          case 'REGISTRATION_FAILED':
            console.error('[handleVerifyOTP] Registration failed details:', data.details);
            throw new Error('Une erreur est survenue lors de la création. Réessayez.');
          case 'SESSION_GENERATION_FAILED':
            console.error('[handleVerifyOTP] Session generation failed details:', data.details);
            throw new Error('Impossible de générer le lien de connexion. Veuillez réessayer.');
          case 'INTERNAL_LOGIN_ERROR':
            console.error('[handleVerifyOTP] Internal login error details:', data.details);
            throw new Error('Erreur interne lors de la connexion. Veuillez réessayer.');
          case 'INTERNAL_SERVER_ERROR':
            console.error('[handleVerifyOTP] Internal server error details:', data.details);
            throw new Error('Erreur serveur inattendue. Veuillez réessayer.');
          case 'SERVER_CONFIG_ERROR':
            console.error('[handleVerifyOTP] Server config error details:', data.details);
            throw new Error('Erreur de configuration serveur. Contactez le support.');
          case 'MISSING_INPUT':
            throw new Error('Numéro de téléphone et code OTP requis.');
          default:
            throw new Error(data.error || 'Erreur inconnue');
        }
      }

      // Handle success responses with different actions
      if (data.action === 'needsName') {
        setSuccess('Code vérifié ! Entrez votre nom pour continuer.');
        setPhoneStep('name');
        setLoading(false);
        return;
      }

      if (data.action === 'register' || data.action === 'login') {
        setSuccess(
          data.action === 'register' ? 'Compte créé ! Connexion...' : 'Connexion en cours...'
        );
        if (data.needsProfileCompletion) {
          sessionStorage.setItem('needsProfileCompletion', 'true');
        }
        console.log('Redirecting to sessionUrl:', data.sessionUrl);
        const safeSessionUrl = buildSafeSessionUrl(data.sessionUrl);
        window.location.href = safeSessionUrl;
        return;
      }

      // Fallback for old API response format
      if (data?.sessionUrl) {
        setSuccess(data.isNewUser ? 'Compte créé ! Connexion...' : 'Connexion en cours...');
        if (data.needsProfileCompletion) {
          sessionStorage.setItem('needsProfileCompletion', 'true');
        }
        console.log('Redirecting to sessionUrl:', data.sessionUrl);
        const safeSessionUrl = buildSafeSessionUrl(data.sessionUrl);
        window.location.href = safeSessionUrl;
      } else if (data?.success && !data?.sessionUrl) {
        throw new Error('Erreur de génération du lien. Veuillez réessayer.');
      } else {
        throw new Error(data?.error || 'Erreur de connexion inattendue');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Code invalide ou expiré';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = async () => {
    if (!FULL_NAME_REGEX.test(fullName.trim())) {
      setError('Le nom complet doit contenir au moins 5 lettres');
      return;
    }

    // Validation du consentement légal
    if (!acceptTerms || !acceptPrivacy) {
      setError('Vous devez accepter les Conditions Générales d\'Utilisation et la Politique de Confidentialité pour continuer');
      return;
    }

    // Appeler handleVerifyOTP avec withName = true pour créer le compte avec le nom
    // Cela va authentifier l'utilisateur et rediriger vers sessionUrl
    await handleVerifyOTP(true);
  };

  // ===================== EMAIL OTP FLOW =====================
  const handleVerifyEmailOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const targetEmail = pendingEmail || email;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration Supabase manquante');
      }

      // Vérifier l'OTP via l'edge function
      const response = await fetch(
        `${supabaseUrl}/functions/v1/email-otp-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            email: targetEmail,
            code: emailOtp,
            purpose: 'email_verification',
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        // Handle specific error codes
        switch (result.errorCode) {
          case 'INVALID_OTP':
            throw new Error('Le code est incorrect ou expiré.');
          case 'USER_EXISTS_CONFLICT':
            throw new Error('Ce numéro est déjà associé à un compte. Veuillez réessayer.');
          case 'REGISTRATION_FAILED':
            console.error('[handleVerifyEmailOtp] Registration failed details:', result.details);
            throw new Error('Une erreur est survenue lors de la création. Réessayez.');
          default:
            throw new Error(result.error || 'Code invalide ou expiré');
        }
      }

      if (!response.ok) {
        throw new Error(result.error || 'Code invalide ou expiré');
      }

      // Se connecter pour créer la session
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: pendingPassword || password,
      });
      if (loginError) throw loginError;

      // Créer le profil si absent
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', pendingUserId || (await supabase.auth.getUser()).data.user?.id || '')
        .maybeSingle();
      const userId = pendingUserId || (await supabase.auth.getUser()).data.user?.id;
      if (userId && !profile) {
        await supabase.from('profiles').insert({
          id: userId,
          email: targetEmail,
          full_name: fullName || targetEmail,
          user_type: null,
        });
      }

      // Sauvegarder le nom complet dans sessionStorage pour la page de choix de profil
      if (fullName) {
        sessionStorage.setItem('pending_full_name', fullName.trim());
      }

      // Rediriger vers la page de choix de profil
      navigate('/choix-profil');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Code invalide ou expiré';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleEmailResendOtp = async () => {
    if (!pendingEmail && !email) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { viaFallback, code } = await sendResendOtp(pendingEmail || email);
      setSuccess(viaFallback ? `Code de test (local) : ${code}` : 'Nouveau code envoyé.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Impossible de renvoyer le code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role: 'tenant' | 'owner' | 'agency') => {
    setProfileType(role);
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id || pendingUserId;
      if (!userId) throw new Error('Utilisateur non trouvé après vérification');

      await supabase.from('profiles').update({ user_type: role }).eq('id', userId);

      // Redirection selon le rôle sélectionné
      navigate(getDashboardRoute(role));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors de la sélection du rôle';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-[#F16522] selection:text-white">
      {/* --- COLONNE GAUCHE : VISUEL IMMERSIF (Hidden on Mobile) --- */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#2C1810]">
        {AUTH_SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === slideIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={slide.image}
              alt="Lifestyle"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2C1810] via-[#2C1810]/50 to-transparent" />
          </div>
        ))}

        {/* Logo Flottant */}
        <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
          <img src="/logo.png" alt="Mon Toit" className="w-11 h-11 object-contain" />
          <span className="text-2xl font-extrabold text-white tracking-tight">Mon Toit</span>
        </div>

        {/* Indicateurs de slide */}
        <div className="absolute top-1/2 right-8 z-10 flex flex-col gap-2">
          {AUTH_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSlideIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === slideIndex ? 'bg-[#F16522] h-6' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Témoignage */}
        <div className="absolute bottom-16 left-12 right-12 z-10">
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 text-[#F16522] fill-current" />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            "{AUTH_SLIDES[slideIndex]?.quote}"
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 rounded-full bg-[#F16522]" />
            <p className="text-[#E8D4C5] font-medium">{AUTH_SLIDES[slideIndex]?.author}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute bottom-16 right-12 z-10 flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">1000+</p>
            <p className="text-sm text-[#E8D4C5]">Propriétés</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">Certifié</p>
            <p className="text-sm text-[#E8D4C5]">ANSUT</p>
          </div>
        </div>
      </div>

      {/* --- COLONNE DROITE : FORMULAIRE --- */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 bg-[#FAF7F4] relative">
        {/* Déco de fond */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F16522]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#2C1810]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Header Mobile Only */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <img src="/logo.png" alt="Mon Toit" className="w-9 h-9 object-contain" />
            <span className="text-2xl font-bold text-[#2C1810]">Mon Toit</span>
          </div>

          {/* Titre */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-[#2C1810]">
              {phoneStep === 'name'
                ? 'Bienvenue !'
                : phoneStep === 'verify'
                  ? 'Vérification'
                  : 'Bienvenue chez vous'}
            </h1>
            <p className="text-[#6B5A4E]">
              {phoneStep === 'name'
                ? 'Entrez votre nom pour finaliser'
                : phoneStep === 'verify'
                  ? `Entrez le code envoyé au ${phoneNumber}`
                  : 'Connectez-vous pour accéder à votre espace'}
            </p>
          </div>

          {/* Sélecteur de méthode - Style Toggle Premium */}
          {phoneStep === 'enter' && (
            <div className="bg-white p-1.5 rounded-2xl border border-[#EFEBE9] flex shadow-sm">
              <button
                onClick={() => handleMethodChange('phone')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  authMethod === 'phone'
                    ? 'bg-[#2C1810] text-white shadow-md'
                    : 'text-[#A69B95] hover:bg-[#FAF7F4]'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" /> Téléphone
                {authMethod === 'phone' && (
                  <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                    Rapide
                  </span>
                )}
              </button>
              <button
                onClick={() => handleMethodChange('email')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  authMethod === 'email'
                    ? 'bg-[#2C1810] text-white shadow-md'
                    : 'text-[#A69B95] hover:bg-[#FAF7F4]'
                }`}
              >
                <Mail className="w-4 h-4 shrink-0" /> Email
              </button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium animate-fade-in">
              {success}
            </div>
          )}

          {/* ==================== PHONE AUTH ==================== */}
          {authMethod === 'phone' && (
            <div className="space-y-5">
              {/* STEP 1: Enter Phone */}
              {phoneStep === 'enter' && (
                <div className="space-y-4 animate-fade-in">
                  <PhoneInputWithCountry
                    value={phoneDisplay}
                    onChange={(display, fullNumber, dialCode, isValid) => {
                      setPhoneDisplay(display);
                      setPhoneNumber(fullNumber);
                      setCountryDialCode(dialCode);
                      setIsPhoneValid(isValid);
                    }}
                    placeholder="   07 00 00 00 00"
                    autoFocus
                  />

                  {/* Info */}
                  <div className="p-3 bg-[#F16522]/5 border border-[#F16522]/20 rounded-xl">
                    <p className="text-sm text-[#2C1810]">
                      💡 Un code à 6 chiffres sera envoyé par{' '}
                      <span className="font-semibold">SMS</span> à votre numéro MTN.
                      <span className="font-medium"> Nouveau ?</span> Votre compte sera créé
                      automatiquement.
                    </p>
                  </div>

                  <button
                    onClick={handleSendOTP}
                    disabled={loading || !isPhoneValid}
                    className="w-full py-4 bg-[#F16522] hover:bg-[#D95318] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#F16522]/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Recevoir mon code <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Verify OTP */}
              {phoneStep === 'verify' && (
                <div className="space-y-5 animate-fade-in">
                  <button
                    type="button"
                    onClick={resetPhoneFlow}
                    className="flex items-center gap-1 text-[#6B5A4E] hover:text-[#2C1810] text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" /> Modifier le numéro
                  </button>

                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={otp[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newOtp = otp.split('');
                          newOtp[idx] = val;
                          setOtp(newOtp.join('').slice(0, 6));
                          if (val && idx < 5) {
                            const next = e.target.nextElementSibling as HTMLInputElement | null;
                            next?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                            const prev = (e.target as HTMLElement)
                              .previousElementSibling as HTMLInputElement | null;
                            prev?.focus();
                          }
                        }}
                        className="w-12 h-14 border-2 border-[#EFEBE9] rounded-xl bg-white flex items-center justify-center text-xl font-bold text-[#2C1810] text-center focus:border-[#F16522] focus:ring-4 focus:ring-[#F16522]/10 transition-all outline-none"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={resendTimer > 0}
                      className="text-sm text-[#F16522] font-semibold hover:underline disabled:text-[#A69B95] disabled:no-underline"
                    >
                      {resendTimer > 0 ? `Renvoyer le code (${resendTimer}s)` : 'Renvoyer le code'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleVerifyOTP(false)}
                    disabled={loading || otp.length !== 6}
                    className="w-full py-4 bg-[#F16522] hover:bg-[#D95318] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#F16522]/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Confirmer <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 3: Enter Name */}
              {phoneStep === 'name' && (
                <div className="space-y-5 animate-fade-in">
                  <button
                    type="button"
                    onClick={resetPhoneFlow}
                    className="flex items-center gap-1 text-[#6B5A4E] hover:text-[#2C1810] text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" /> Recommencer
                  </button>

                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <span className="text-3xl">🎉</span>
                    </div>
                    <p className="text-[#6B5A4E] text-sm">
                      Votre numéro est vérifié.{' '}
                      <span className="font-medium">Comment vous appelez-vous ?</span>
                    </p>
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-4 text-[#A69B95] group-focus-within:text-[#F16522] transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: Jean Kouassi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full py-4 pl-12 pr-4 rounded-xl bg-white border border-[#EFEBE9] text-[#2C1810] font-medium placeholder:text-[#A69B95] focus:border-[#F16522] focus:ring-4 focus:ring-[#F16522]/10 outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  {/* Consentement légal */}
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        required
                      />
                      <span className="text-sm text-gray-600">
                        J'accepte les{' '}
                        <Link
                          to="/conditions-generales"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 underline font-medium"
                        >
                          Conditions Générales d'Utilisation
                        </Link>
                        {' '}*
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        required
                      />
                      <span className="text-sm text-gray-600">
                        J'ai lu et j'accepte la{' '}
                        <Link
                          to="/politique-confidentialite"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 underline font-medium"
                        >
                          Politique de Confidentialité
                        </Link>
                        {' '}*
                      </span>
                    </label>

                    <p className="text-xs text-gray-500 pl-7">
                      * En cochant ces cases, vous acceptez nos conditions et notre politique de confidentialité.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitName}
                    disabled={loading || !fullName.trim()}
                    className="w-full py-4 bg-[#F16522] hover:bg-[#D95318] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#F16522]/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Créer mon compte <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================== EMAIL AUTH ==================== */}
          {authMethod === 'email' && phoneStep === 'enter' && (
            <div className="space-y-5 animate-fade-in">
              {/* Email Mode Tabs - Affiché uniquement en mode connexion */}
              {emailMode === 'login' && (
                <div className="bg-white p-4 rounded-xl border border-[#EFEBE9] text-center">
                  <p className="text-[#6B5A4E] text-sm">
                    Pas encore de compte ?{' '}
                    <button
                      onClick={() => handleEmailModeChange('register')}
                      className="text-[#F16522] hover:text-[#D95318] font-semibold hover:underline transition-colors"
                    >
                      Créer un compte
                    </button>
                  </p>
                </div>
              )}

              {/* EMAIL REGISTER STEPS */}
              {emailMode === 'register' && emailStep === 'otp' && (
                <div className="space-y-5">
                  <button
                    type="button"
                    onClick={() => setEmailStep('form')}
                    className="flex items-center gap-1 text-[#6B5A4E] hover:text-[#2C1810] text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" /> Modifier les informations
                  </button>

                  <p className="text-center text-[#2C1810] font-semibold">
                    Entrez le code reçu sur {pendingEmail || email}
                  </p>

                  <OTPInput value={emailOtp} onChange={setEmailOtp} length={6} autoFocus />

                  <div className="flex items-center justify-between text-sm text-[#6B5A4E]">
                    <button
                      type="button"
                      onClick={handleEmailResendOtp}
                      className="text-[#F16522] hover:text-[#D95318] font-semibold"
                    >
                      Renvoyer le code
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    disabled={loading || emailOtp.length < 6}
                    className="w-full py-4 bg-[#F16522] hover:bg-[#D95318] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#F16522]/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Valider le code'}
                  </button>
                </div>
              )}

              {emailMode === 'register' && emailStep === 'role' && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-[#2C1810] font-semibold text-lg">
                      Profil activé — choisissez votre rôle
                    </p>
                    <p className="text-xs text-[#6B5A4E]">
                      Vous pourrez le modifier plus tard depuis votre compte.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        value: 'tenant',
                        label: 'Locataire',
                        icon: Home,
                        bullets: ['Recherche & alertes', 'Candidature en 1 clic'],
                      },
                      {
                        value: 'owner',
                        label: 'Propriétaire',
                        icon: Star,
                        bullets: ['Publier un bien', 'Contrats digitaux'],
                      },
                      {
                        value: 'agency',
                        label: 'Agence',
                        icon: Shield,
                        bullets: ['Mandats & équipe', 'Reporting & commissions'],
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectRole(opt.value as 'tenant' | 'owner' | 'agency')}
                        className={`flex items-start gap-3 px-4 py-4 rounded-2xl border transition text-left ${
                          profileType === opt.value
                            ? 'border-[#F16522] bg-[#F16522]/10 text-[#F16522] shadow-lg'
                            : 'border-gray-200 text-[#2C1810] hover:border-[#F16522]/60 hover:bg-[#F16522]/5'
                        }`}
                      >
                        <opt.icon className="h-5 w-5 mt-0.5" />
                        <div className="space-y-1">
                          <span className="text-sm font-semibold block">{opt.label}</span>
                          <ul className="text-xs text-[#6B5A4E] space-y-1">
                            {opt.bullets.map((b, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#F16522]" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-center text-[#6B5A4E]">
                    Redirection automatique vers votre tableau de bord après sélection.
                  </p>
                </div>
              )}

              {/* EMAIL FORM (login or register form step) */}
              {(emailMode === 'login' || emailStep === 'form') && (
                <form
                  onSubmit={emailMode === 'login' ? handleEmailLogin : handleEmailRegister}
                  className="space-y-4"
                >
                  {emailMode === 'register' && (
                    <InputWithIcon
                      icon={User}
                      label="Nom complet"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean Kouassi"
                      required
                    />
                  )}

                  <InputWithIcon
                    icon={Mail}
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    required
                  />

                  <InputWithIcon
                    icon={Lock}
                    label="Mot de passe"
                    type="password"
                    isPassword
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />

                  {emailMode === 'login' && (
                    <div className="text-right">
                      <Link
                        to="/mot-de-passe-oublie"
                        className="text-sm text-[#F16522] hover:text-[#D95318] font-medium hover:underline transition-colors"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                  )}

                  {emailMode === 'register' && (
                    <InputWithIcon
                      icon={Lock}
                      label="Confirmer le mot de passe"
                      type="password"
                      isPassword
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  )}

                  {emailMode === 'register' && (
                    <div className="space-y-3 pt-2 border-t border-gray-200">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          required
                        />
                        <span className="text-sm text-gray-600">
                          J'accepte les{' '}
                          <Link
                            to="/conditions-generales"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 underline font-medium"
                          >
                            Conditions Générales d'Utilisation
                          </Link>
                          {' '}*
                        </span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={acceptPrivacy}
                          onChange={(e) => setAcceptPrivacy(e.target.checked)}
                          className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          required
                        />
                        <span className="text-sm text-gray-600">
                          J'ai lu et j'accepte la{' '}
                          <Link
                            to="/politique-confidentialite"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 underline font-medium"
                          >
                            Politique de Confidentialité
                          </Link>
                          {' '}*
                        </span>
                      </label>

                      <p className="text-xs text-gray-500 pl-7">
                        * En cochant ces cases, vous acceptez nos conditions et notre politique de confidentialité.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#F16522] hover:bg-[#D95318] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#F16522]/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        {emailMode === 'login' ? 'Se connecter' : 'Créer mon compte'}{' '}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer Légal */}
          <div className="text-center text-xs text-[#A69B95] space-y-2 pt-4">
            <p className="flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Vos données sont chiffrées et sécurisées.
            </p>
            <p>
              En continuant, vous acceptez nos{' '}
              <a href="#" className="underline hover:text-[#2C1810]">
                Conditions
              </a>{' '}
              et notre{' '}
              <a href="#" className="underline hover:text-[#2C1810]">
                Politique de confidentialité
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
