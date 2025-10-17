import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Prompt d'installation PWA
 * - Détecte beforeinstallprompt
 * - Affiche un banner élégant
 * - Gère l'installation
 * - Se masque après installation ou refus
 */
export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    const checkInstalled = () => {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(standalone);
    };

    checkInstalled();

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Ne pas afficher si déjà refusé récemment
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Écouter l'installation réussie
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstall(false);
      localStorage.removeItem('pwa-install-dismissed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Afficher le prompt natif
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installée avec succès');
      setShowInstall(false);
    } else {
      console.log('Installation PWA refusée');
      handleDismiss();
    }

    // Réinitialiser le prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Ne pas afficher si déjà installé ou pas de prompt
  if (isInstalled || !showInstall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
      >
        <div className="bg-gradient-to-r from-primary via-primary/90 to-secondary text-white p-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm">
          {/* Bouton fermer */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Contenu */}
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">
                Installer Mon Toit
              </h3>
              <p className="text-sm text-white/90">
                Accédez rapidement à Mon Toit depuis votre écran d'accueil. 
                Expérience rapide et hors ligne.
              </p>
            </div>
          </div>

          {/* Avantages */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="font-semibold">⚡</div>
              <div className="opacity-90">Rapide</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="font-semibold">📱</div>
              <div className="opacity-90">Native</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="font-semibold">🔒</div>
              <div className="opacity-90">Sécurisé</div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-white text-primary hover:bg-white/90 font-bold shadow-lg"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Installer
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="text-white hover:bg-white/20"
              size="lg"
            >
              Plus tard
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

