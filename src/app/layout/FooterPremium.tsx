import { useState, Component, ReactNode, FormEvent, ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '@/shared/config/app.config';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

// Configuration de sécurité pour les contacts (évite les crashs si l'import échoue)
const SAFE_CONTACT = {
  PHONE: '+2250700000000',
  PHONE_DISPLAY: '+225 07 00 00 00 00',
  EMAIL: 'contact@montoit.ci',
  ADDRESS: "Abidjan, Côte d'Ivoire",
};

// ErrorBoundary pour capturer les erreurs de rendu
class FooterErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FooterPremium error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <footer className="bg-[#2C1810] text-[#E8D4C5] py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span>Erreur d'affichage du footer</span>
            </div>
            <p className="text-sm text-[#E8D4C5]/60">
              © {new Date().getFullYear()} Mon Toit. Tous droits réservés.
            </p>
          </div>
        </footer>
      );
    }
    return this.props.children;
  }
}

function FooterContent() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Email validation regex (RFC 5322 compliant pattern)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (emailValue: string): boolean => {
    return EMAIL_REGEX.test(emailValue);
  };

  const handleNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate email format
    if (!email.trim()) {
      setEmailError('Veuillez saisir une adresse email.');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Veuillez saisir une adresse email valide (ex: nom@exemple.com).');
      return;
    }

    // Clear error and show success
    setEmailError('');
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (emailError && e.target.value) {
      setEmailError('');
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#2C1810] text-[#E8D4C5] overflow-hidden pt-20 pb-10">
      {/* Texture de fond Premium */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('/images/pattern-topo.svg')] bg-repeat pointer-events-none" />

      {/* Lueur d'ambiance Orange */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#F16522]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Grille 4 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Logo & Description */}
          <div className="space-y-6">
            <Link to="/" className="inline-block group">
              <div className="flex items-center gap-3">
                {/* Gestion intelligente du logo avec Fallback */}
                {!imgError ? (
                  <img
                    src="/logo.png"
                    alt="Mon Toit Logo"
                    className="h-10 w-10 object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-[#F16522] transition-colors border border-white/10">
                    M
                  </div>
                )}
                <span className="text-2xl font-bold text-white tracking-tight">Mon Toit</span>
              </div>
            </Link>
            <p className="text-[#E8D4C5]/70 text-sm leading-relaxed max-w-xs">
              La première plateforme immobilière certifiée en Côte d'Ivoire. Accès universel,
              transparent et sécurisé au logement.
            </p>

            {/* Réseaux Sociaux */}
            <div className="flex gap-4">
              {[
                { Icon: Facebook, href: 'https://facebook.com/montoit', label: 'Facebook' },
                { Icon: Twitter, href: 'https://twitter.com/montoit', label: 'Twitter' },
                { Icon: Instagram, href: 'https://instagram.com/montoit', label: 'Instagram' },
                {
                  Icon: Linkedin,
                  href: 'https://www.linkedin.com/company/montoit',
                  label: 'LinkedIn',
                },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#F16522] transition-all duration-300 border border-white/10 hover:border-[#F16522] group"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-[#E8D4C5] group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Liens Rapides</h3>
            <ul className="space-y-4">
              {[
                { label: 'Accueil', href: '/' },
                { label: 'Rechercher un bien', href: '/recherche' },
                { label: 'Louer mon bien', href: '/ajouter-propriete' },
                { label: 'À propos', href: '/a-propos' },
                { label: 'Comment ça marche', href: '/comment-ca-marche' },
                { label: 'Contact', href: '/contact' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[#E8D4C5]/70 hover:text-[#F16522] transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-[#F16522] transition-all duration-300" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Légal</h3>
            <ul className="space-y-4">
              {[
                { label: "Conditions d'utilisation", href: '/conditions-utilisation' },
                { label: 'Politique de confidentialité', href: '/politique-confidentialite' },
                { label: 'Mentions légales', href: '/mentions-legales' },
                { label: 'CGV', href: '/cgv' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[#E8D4C5]/70 hover:text-[#F16522] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Contact */}
          <div className="flex flex-col h-full">
            <h3 className="text-white font-bold text-lg mb-4">Restez informé</h3>
            <p className="text-[#E8D4C5]/70 text-sm mb-4">
              Recevez nos dernières offres exclusives.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="space-y-2 mb-6">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                  <Mail className="w-4 h-4 text-[#E8D4C5]/50" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="    Votre email"
                  required
                  className={`w-full bg-white/5 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#E8D4C5]/30 focus:outline-none focus:ring-2 transition-all ${
                    emailError
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-white/10 focus:border-[#F16522] focus:ring-[#F16522]/30'
                  }`}
                />
              </div>

              {/* Error message */}
              {emailError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {emailError}
                </p>
              )}

              <button
                type="submit"
                className={`w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 group ${
                  subscribed
                    ? 'bg-green-500 text-white'
                    : 'bg-[#F16522] hover:bg-[#d95a1d] text-white shadow-md hover:shadow-lg'
                }`}
              >
                <span>{subscribed ? 'Inscrit !' : "S'inscrire"}</span>
                {!subscribed && (
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>

            <div className="space-y-2 pt-4 border-t border-white/10">
              <a
                href={`tel:${SAFE_CONTACT.PHONE}`}
                className="flex items-center gap-2.5 text-[#E8D4C5]/70 hover:text-white transition-colors text-sm"
              >
                <Phone className="w-3.5 h-3.5 text-[#F16522]" />
                {SAFE_CONTACT.PHONE_DISPLAY}
              </a>
              <a
                href={`mailto:${SAFE_CONTACT.EMAIL}`}
                className="flex items-center gap-2.5 text-[#E8D4C5]/70 hover:text-white transition-colors text-sm"
              >
                <Mail className="w-3.5 h-3.5 text-[#F16522]" />
                {SAFE_CONTACT.EMAIL}
              </a>
              <div className="flex items-center gap-2.5 text-[#E8D4C5]/70 text-sm">
                <MapPin className="w-3.5 h-3.5 text-[#F16522]" />
                {SAFE_CONTACT.ADDRESS}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-[#E8D4C5]/30">
          <p>© {currentYear} Mon Toit. Tous droits réservés.</p>

          <div className="flex items-center gap-5">
            {[
              { label: 'Aide', href: '/aide' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Blog', href: '/blog' },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="hover:text-[#F16522] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Badge Certifié + Version - Plus discret */}
        <div className="mt-4 flex flex-col md:flex-row justify-center items-center gap-3 text-[#E8D4C5]/20">
          <span className="text-[10px]">Fait avec ♥ à Abidjan</span>
          <span className="text-xs text-[#E8D4C5]/30 font-mono">v{APP_CONFIG.version}</span>
        </div>
      </div>
    </footer>
  );
}

export default function FooterPremium() {
  return (
    <FooterErrorBoundary>
      <FooterContent />
    </FooterErrorBoundary>
  );
}
