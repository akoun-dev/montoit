import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldCheck, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const CertificationBanner = () => {
  const { profile, user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user needs certification
  const needsCertification = user && !profile?.oneci_verified && !profile?.cnam_verified;
  
  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem('certificationBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('certificationBannerDismissed', 'true');
  };

  if (!needsCertification || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border-2 border-primary/20 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full -ml-24 -mb-24" />
          
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-white/50 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                  <ShieldCheck className="h-10 w-10 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Obtenez votre certification ANSUT
                </h3>
                <p className="text-base text-muted-foreground mb-4 max-w-2xl">
                  Déverrouillez toutes les fonctionnalités de la plateforme et rassurez les propriétaires en seulement <span className="font-bold text-primary">5 minutes</span>. C'est <span className="font-bold text-secondary">100% gratuit</span> !
                </p>
                
                {/* Progress indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/30" />
                    <div className="w-2 h-2 rounded-full bg-primary/30" />
                    <div className="w-2 h-2 rounded-full bg-primary/30" />
                  </div>
                  <span>3 étapes simples</span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-secondary hover:shadow-xl transition-all duration-300 text-white font-bold rounded-full px-8"
                >
                  <Link to="/verification" className="flex items-center gap-2">
                    Commencer maintenant
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Gratuit • 5 min
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default CertificationBanner;
