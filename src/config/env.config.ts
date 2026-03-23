/**
 * Configuration des environnements
 * Gère les variables d'environnement selon le mode (development, staging, production)
 */

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  name: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  apiBaseUrl?: string;
  enableDevTools: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableAnalytics: boolean;
  enableExperimentalFeatures: boolean;
  mapProvider: 'leaflet' | 'mapbox';
  sentryDsn?: string;
  gaTrackingId?: string;
}

/**
 * Configuration par défaut pour le développement
 */
const developmentConfig: EnvironmentConfig = {
  name: 'Development',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  siteUrl: import.meta.env.SITE_URL || 'http://localhost:8080',
  enableDevTools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'debug',
  enableAnalytics: false,
  enableExperimentalFeatures: true,
  mapProvider: 'leaflet',
};

/**
 * Configuration pour l'environnement de staging
 */
const stagingConfig: EnvironmentConfig = {
  name: 'Staging',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  siteUrl: import.meta.env.SITE_URL || 'https://staging.mon-toit.ci',
  enableDevTools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableExperimentalFeatures: import.meta.env.VITE_ENABLE_EXPERIMENTAL_FEATURES === 'true',
  mapProvider: 'mapbox',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID,
};

/**
 * Configuration pour la production
 */
const productionConfig: EnvironmentConfig = {
  name: 'Production',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  siteUrl: import.meta.env.SITE_URL || 'https://mon-toit.ci',
  enableDevTools: false,
  logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'error',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableExperimentalFeatures: false,
  mapProvider: 'mapbox',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID,
};

/**
 * Détermine l'environnement actuel basé sur le mode Vite
 */
function getCurrentEnvironment(): Environment {
  const mode = import.meta.env.MODE;
  if (mode === 'production') return 'production';
  if (mode === 'staging') return 'staging';
  return 'development';
}

/**
 * Retourne la configuration selon l'environnement actuel
 */
export function getEnvConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();

  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return developmentConfig;
  }
}

/**
 * Vérifie si nous sommes en environnement de développement
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Vérifie si nous sommes en environnement de staging
 */
export function isStaging(): boolean {
  return getCurrentEnvironment() === 'staging';
}

/**
 * Vérifie si nous sommes en environnement de production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Retourne l'environnement actuel
 */
export { getCurrentEnvironment as getEnvironment };

export default getEnvConfig();
