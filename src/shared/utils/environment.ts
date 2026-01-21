/**
 * Utilitaires pour détecter l'environnement d'exécution
 */

/**
 * Détecte si Supabase est en local (localhost ou 127.0.0.1)
 */
export const isLocalSupabase = (): boolean => {
  const url = import.meta.env['VITE_SUPABASE_URL'] || import.meta.env['VITE_PUBLIC_SUPABASE_URL'];
  return url?.includes('127.0.0.1') || url?.includes('localhost') || false;
};

/**
 * Détecte si l'application est en développement (local)
 */
export const isDevelopment = (): boolean => {
  return import.meta.env['MODE'] === 'development' || isLocalSupabase();
};

/**
 * Détecte si les Edge Functions sont disponibles localement
 * (par défaut, elles ne le sont pas)
 */
export const areEdgeFunctionsAvailable = (): boolean => {
  // Pour l'instant, on considère qu'elles ne sont pas disponibles en local
  // sauf si une variable d'environnement spécifique est définie
  return import.meta.env['VITE_EDGE_FUNCTIONS_AVAILABLE'] === 'true' || !isLocalSupabase();
};
