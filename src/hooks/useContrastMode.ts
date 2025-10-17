import { useState, useEffect } from 'react';

/**
 * Hook pour détecter si l'utilisateur préfère un mode high contrast
 * Utile pour accessibilité visuelle (malvoyants)
 */
export const useContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Détecter la préférence système
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    // Écouter les changements
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};
