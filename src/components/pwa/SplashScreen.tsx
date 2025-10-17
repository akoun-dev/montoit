import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home } from 'lucide-react';

/**
 * Splash Screen affiché au démarrage de la PWA
 * - Logo animé
 * - Gradient ivoirien
 * - Disparaît après 2 secondes
 * - Uniquement en mode standalone (PWA installée)
 */
export const SplashScreen = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Vérifier si en mode standalone (PWA installée)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    // Vérifier si c'est le premier chargement de la session
    const hasShownSplash = sessionStorage.getItem('splash-shown');

    if (isStandalone && !hasShownSplash) {
      setShow(true);
      sessionStorage.setItem('splash-shown', 'true');

      // Masquer après 2 secondes
      const timer = setTimeout(() => {
        setShow(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-secondary"
        >
          <div className="flex flex-col items-center gap-6">
            {/* Logo animé */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                opacity: 1
              }}
              transition={{ 
                duration: 1,
                times: [0, 0.6, 1],
                ease: "easeOut"
              }}
              className="relative"
            >
              {/* Cercle de fond */}
              <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl scale-150" />
              
              {/* Logo */}
              <div className="relative bg-white rounded-3xl p-6 shadow-2xl">
                <Home className="h-20 w-20 text-primary" strokeWidth={2} />
              </div>

              {/* Pulse effect */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-white rounded-3xl"
              />
            </motion.div>

            {/* Nom de l'app */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-white mb-2">
                Mon Toit
              </h1>
              <p className="text-white/80 text-sm">
                Le logement, en toute confiance
              </p>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="w-32 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="h-full w-1/2 bg-white rounded-full"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

