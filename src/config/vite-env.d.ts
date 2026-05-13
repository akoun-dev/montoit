/**
 * Typescript definitions for environment variables
 * Provides type safety for VITE_ prefixed environment variables
 */

interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly SITE_URL: string;
  readonly VITE_PUBLIC_SUPABASE_URL?: string;
  readonly SUPABASE_STUDIO_URL?: string;

  // Azure SMS
  readonly AZURE_SMS_URL?: string;
  readonly AZURE_SMS_USERNAME?: string;
  readonly AZURE_SMS_PASSWORD?: string;
  readonly AZURE_SMS_FROM?: string;

  // Mapbox
  readonly VITE_MAPBOX_PUBLIC_TOKEN?: string;

  // Azure OpenAI
  readonly VITE_AZURE_OPENAI_API_KEY?: string;
  readonly VITE_AZURE_OPENAI_ENDPOINT?: string;
  readonly VITE_AZURE_OPENAI_DEPLOYMENT_NAME?: string;
  readonly VITE_AZURE_OPENAI_API_VERSION?: string;

  // Gemini API
  readonly GEMINI_API_KEY?: string;

  // NeoFace
  readonly NEOFACE_BEARER_TOKEN?: string;

  // ONECI
  readonly VITE_ONECI_API_URL?: string;
  readonly VITE_ONECI_API_KEY?: string;
  readonly VITE_ONECI_SECRET_KEY?: string;

  // CryptoNeo
  readonly VITE_CRYPTONEO_BASE_URL?: string;
  readonly VITE_CRYPTONEO_APP_KEY?: string;
  readonly VITE_CRYPTONEO_APP_SECRET?: string;

  // InTouch Payments
  readonly VITE_INTOUCH_BASE_URL?: string;
  readonly VITE_INTOUCH_API_URL?: string;
  readonly VITE_INTOUCH_USERNAME?: string;
  readonly VITE_INTOUCH_PASSWORD?: string;
  readonly VITE_INTOUCH_PARTNER_ID?: string;
  readonly VITE_INTOUCH_LOGIN_API?: string;
  readonly VITE_INTOUCH_PASSWORD_API?: string;

  // Application Configuration
  readonly ALLOWED_ORIGINS?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_ENABLE_EXPERIMENTAL_FEATURES?: string;
  readonly VITE_ENABLE_DEVTOOLS?: string;

  // Analytics & Monitoring
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_GA_TRACKING_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
}

// Augment the global ImportMeta interface
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Export the env object for type safety
 * Use this in your code to access environment variables with autocomplete
 */
export const env = import.meta.env as ImportMetaEnv;

export default env;
