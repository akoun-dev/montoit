import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook pour gérer les raccourcis clavier globaux
 * Améliore l'accessibilité keyboard-only users
 */
export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + K : Ouvrir recherche
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/recherche');
      }

      // Escape : Retour arrière
      if (e.key === 'Escape') {
        navigate(-1);
      }

      // H : Retour accueil
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
        navigate('/');
      }

      // S : Ouvrir recherche
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        navigate('/recherche');
      }

      // P : Ouvrir profil
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        navigate('/profil');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);
};
