/**
 * ModernAuthPageBrevo - Intégration Brevo OTP
 *
 * Page d'authentification moderne utilisant le système Brevo OTP
 * Supporte Email, SMS et WhatsApp avec une expérience utilisateur optimisée
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Star,
  Home,
  Shield,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';
import { useBrevoAuth } from '@/hooks/useBrevoAuth';
import { PhoneInputWithCountry } from '@/shared/components/PhoneInputWithCountry';
import OTPInput from '@/shared/components/modern/OTPInput';
import { InputWithIcon } from '@/shared/ui';

type AuthMethod = 'phone' | 'email';

// Slides pour le côté gauche (témoignages)
const AUTH_SLIDES = [
  {
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80',
    quote: 'J\'ai trouvé mon appartement à Cocody en moins d\'une semaine. Vraiment efficace et sécurisé !',
    author: 'Sarah & Marc, Cocody',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
    quote: 'La signature numérique et le paiement par Mobile Money ont rendu ma location super simple.',
    author: 'Aïcha K., Plateau',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
    quote: 'Comme propriétaire, je peux gérer mes biens et mes locataires en toute confiance.',
    author: 'Konan D., Marcory',
  },
];

export default function ModernAuthPageBrevo() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hook Brevo Auth
  const {
    loading,
    error,
    success,
    otpSent,
    needsName,
    isNewUser,
    sendOTP,
    verifyOTP,
    submitName,
    selectRole,
    clearError,
    reset,
  } = useBrevoAuth();

  // États du formulaire
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    location.pathname.includes('/inscription') ? 'email' : 'phone'
  );
  const [recipient, setRecipient] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sendMethod, setSendMethod] = useState<'sms' | 'whatsapp'>('whatsapp');
  const [slideIndex, setSlideIndex] = useState(0);

  // Rotation automatique des slides
  useEffect(() => {
    const timer = setInterval(() => setSlideIndex((p) => (p + 1) % AUTH_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Sync URL avec la méthode
  useEffect(() => {
    const targetPath = authMethod === 'email' ? '/inscription' : '/connexion';
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [authMethod, location.pathname, navigate]);

  // Gestion du changement de méthode
  const handleMethodChange = (method: AuthMethod) => {
    setAuthMethod(method);
    reset();
    setRecipient('');
    setPhoneDisplay('');
    setPhoneNumber('');
    setEmail('');
    setOtpCode('');
    setFullName('');
  };

  // Gestion du téléphone
  const handlePhoneChange = (
    display: string,
    fullNumber: string,
    dialCode: string,
    isValid: boolean
  ) => {
    setPhoneDisplay(display);
    setPhoneNumber(fullNumber);
    setRecipient(fullNumber);
    setIsPhoneValid(isValid);
  };

  // Envoyer l'OTP
  const handleSendOTP = async () => {
    const success = await sendOTP({
      recipient: authMethod === 'phone' ? recipient : email,
      method: authMethod,
      fullName: authMethod === 'email' ? fullName : undefined,
    });

    if (success) {
      // L'OTP a été envoyé, l'état est géré par le hook
    }
  };

  // Vérifier l'OTP
  const handleVerifyOTP = async () => {
    const success = await verifyOTP(otpCode);

    if (success && !needsName) {
      // Redirection automatique gérée par le hook
    }
  };

  // Soumettre le nom (nouvel utilisateur)
  const handleSubmitName = async () => {
    const success = await submitName(fullName);

    if (success) {
      // Redirection automatique vers sélection du rôle
    }
  };

  // Sélectionner un rôle
  const handleSelectRole = async (role: 'locataire' | 'proprietaire' | 'agence') => {
    await selectRole(role);
  };

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
              {needsName ? 'Bienvenue !' : otpSent ? 'Vérification' : 'Bienvenue chez vous'}
            </h1>
            <p className="text-[#6B5A4E]">
              {needsName
                ? 'Entrez votre nom pour finaliser'
                : otpSent
                  ? `Entrez le code envoyé`
                  : 'Connectez-vous pour accéder à votre espace'}
            </p>
          </div>

          {/* Sélecteur de méthode */}
          {!otpSent && !needsName && (
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium animate-fade-in flex items-start gap-2">
              <button onClick={clearError} className="ml-auto text-red-500 hover:text-red-700">
                ×
              </button>
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium animate-fade-in flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          {/* === FORMULAIRE ENVOI OTP === */}
          {!otpSent && !needsName && (
            <div className="space-y-5 animate-fade-in">
              {authMethod === 'phone' ? (
                <>
                  <PhoneInputWithCountry
                    value={phoneDisplay}
                    onChange={handlePhoneChange}
                    placeholder="07 00 00 00 00"
                    autoFocus
                  />

                  {/* Sélecteur de méthode d'envoi */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSendMethod('whatsapp')}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                        sendMethod === 'whatsapp'
                          ? 'bg-green-50 border-2 border-green-500 text-green-700'
                          : 'bg-white border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#A69B95]'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMethod('sms')}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                        sendMethod === 'sms'
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                          : 'bg-white border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#A69B95]'
                      }`}
                    >
                      <Phone className="w-4 h-4" /> SMS
                    </button>
                  </div>

                  <div className="p-3 bg-[#F16522]/5 border border-[#F16522]/20 rounded-xl">
                    <p className="text-sm text-[#2C1810]">
                      💡 Un code à 6 chiffres sera envoyé à votre numéro MTN.
                      <span className="font-medium"> Nouveau ?</span> Votre compte sera créé
                      automatiquement.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <InputWithIcon
                    icon={User}
                    label="Nom complet"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Kouassi"
                    required
                  />

                  <InputWithIcon
                    icon={Mail}
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setRecipient(e.target.value);
                    }}
                    placeholder="exemple@email.com"
                    required
                  />

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-700">
                      📧 Un code de vérification sera envoyé à votre email. Vérifiez vos spams si
                      vous ne le recevez pas.
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading || (authMethod === 'phone' ? !isPhoneValid : !email)}
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

          {/* === FORMULAIRE VÉRIFICATION OTP === */}
          {otpSent && !needsName && (
            <div className="space-y-5 animate-fade-in">
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 text-[#6B5A4E] hover:text-[#2C1810] text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" /> Modifier mes informations
              </button>

              <OTPInput value={otpCode} onChange={setOtpCode} length={6} autoFocus />

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otpCode.length !== 6}
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

          {/* === FORMULAIRE NOM (NOUVEL UTILISATEUR) === */}
          {needsName && (
            <div className="space-y-5 animate-fade-in">
              <button
                type="button"
                onClick={reset}
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
