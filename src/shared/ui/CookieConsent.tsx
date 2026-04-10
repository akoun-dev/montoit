import { useState, useEffect } from 'react';
import { X, Cookie, Shield } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'montoit-cookie-consent';
const COOKIE_CONSENT_EXPIRY_DAYS = 365; // 1 an

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

interface ConsentData {
  status: ConsentStatus;
  timestamp: number;
}

export interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si le consentement a déjà été donné et n'a pas expiré
    const consent = getCookieConsent();
    if (!consent) {
      // Afficher la bannière après un délai si pas de consentement valide
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setIsVisible(false);
    setCookieConsent('accepted');
    onAccept?.();
  };

  const handleDecline = () => {
    setIsVisible(false);
    setCookieConsent('declined');
    onDecline?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 animate-in slide-in-from-bottom duration-500"
      role="dialog"
      aria-label="Consentement aux cookies"
    >
      <div className="max-w-4xl mx-auto bg-background border border-border rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon - cachée sur mobile */}
          <div className="hidden sm:flex flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl items-center justify-center">
            <Cookie className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Cookie className="w-4 h-4 sm:hidden text-primary" />
              <h3 className="font-semibold text-foreground text-sm sm:text-base md:text-lg">
                Nous utilisons des cookies
              </h3>
            </div>

            <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed mb-3 sm:mb-4">
              Mon Toit utilise des cookies pour améliorer votre expérience, analyser le trafic et
              personnaliser le contenu. En continuant, vous acceptez notre{' '}
              <a
                href="/politique-confidentialite"
                className="text-primary hover:underline font-medium"
              >
                politique de confidentialité
              </a>
              .
            </p>

            {/* Features - responsive wrap */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                Données sécurisées
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                Conforme RGPD
              </span>
            </div>

            {/* Actions - responsive buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-xs sm:text-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Accepter tous les cookies"
              >
                Accepter tout
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-secondary text-secondary-foreground rounded-xl font-medium text-xs sm:text-sm hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                aria-label="Refuser les cookies non essentiels"
              >
                Refuser
              </button>
            </div>
          </div>

          {/* Close button - responsive sizing */}
          <button
            onClick={handleDecline}
            className="flex-shrink-0 p-1 sm:p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors -mt-1 sm:mt-0"
            aria-label="Fermer la bannière"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Récupère le consentement des cookies depuis localStorage
 * Retourne null si aucun consentement ou si expiré
 */
export function getCookieConsent(): ConsentStatus | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;

    const data: ConsentData = JSON.parse(stored);
    const now = Date.now();
    const expiryMs = COOKIE_CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    // Vérifier si le consentement a expiré
    if (now - data.timestamp > expiryMs) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }

    return data.status;
  } catch {
    return null;
  }
}

/**
 * Enregistre le consentement des cookies dans localStorage
 */
export function setCookieConsent(status: ConsentStatus): void {
  if (typeof window === 'undefined') return;

  try {
    const data: ConsentData = {
      status,
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Impossible de sauvegarder le consentement:', error);
  }
}

/**
 * Réinitialise le consentement des cookies
 */
export function resetCookieConsent(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch (error) {
    console.warn('Impossible de réinitialiser le consentement:', error);
  }
}

export default CookieConsent;