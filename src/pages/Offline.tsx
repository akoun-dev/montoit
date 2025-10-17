import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Page affichée quand l'utilisateur est hors ligne
 * - Design élégant et rassurant
 * - Bouton pour réessayer
 * - Bouton pour retourner à l'accueil
 * - Informations sur le mode hors ligne
 */
export const Offline = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-muted/30 to-muted/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Icône */}
        <motion.div
          animate={{ 
            rotate: [0, -10, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
          className="inline-block mb-6"
        >
          <div className="bg-muted/50 p-6 rounded-full">
            <WifiOff className="h-24 w-24 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Titre */}
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Pas de connexion
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Vous êtes actuellement hors ligne. Certaines fonctionnalités sont limitées, 
          mais vous pouvez toujours consulter les pages récemment visitées.
        </p>

        {/* Fonctionnalités disponibles hors ligne */}
        <div className="bg-white dark:bg-card rounded-xl p-4 mb-6 text-left shadow-lg border border-border">
          <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
            Disponible hors ligne
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Pages récemment visitées</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Biens mis en favoris</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Profil utilisateur</span>
            </li>
          </ul>
        </div>

        {/* Fonctionnalités non disponibles */}
        <div className="bg-muted/30 rounded-xl p-4 mb-6 text-left border border-border/50">
          <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
            Nécessite une connexion
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span>Recherche de biens</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span>Publication d'annonces</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span>Messagerie</span>
            </li>
          </ul>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRetry}
            size="lg"
            className="w-full font-bold shadow-lg"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Réessayer la connexion
          </Button>

          <Button
            onClick={handleGoHome}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <Home className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </Button>
        </div>

        {/* Conseil */}
        <p className="text-xs text-muted-foreground mt-6">
          💡 Astuce : Vérifiez votre connexion Wi-Fi ou vos données mobiles
        </p>
      </motion.div>
    </div>
  );
};

