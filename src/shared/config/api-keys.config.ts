/**
 * Configuration centralisée des clés API
 * Ce fichier regroupe toutes les clés API et configurations de services externes
 * utilisées dans l'application Mon Toit.
 *
 * IMPORTANT: Ne JAMAIS inclure serviceRoleKey côté client !
 */

interface ApiConfig {
  key: string;
  endpoint?: string;
  isConfigured: boolean;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
  // SÉCURITÉ: serviceRoleKey ne doit JAMAIS être exposé côté client
}

interface AzureOpenAIConfig extends ApiConfig {
  deploymentName: string;
  apiVersion: string;
}

type AzureAIServicesConfig = ApiConfig;

interface AzureSpeechConfig extends ApiConfig {
  region: string;
  sttEndpoint: string;
  ttsEndpoint: string;
}

type MapConfig = ApiConfig;

interface PaymentConfig {
  baseUrl: string;
  username: string;
  password: string;
  partnerId: string;
  loginApi: string;
  passwordApi: string;
  isConfigured: boolean;
}

interface FacialVerificationConfig extends ApiConfig {
  apiBase: string;
}

interface SignatureConfig {
  appKey: string;
  appSecret: string;
  baseUrl: string;
  isConfigured: boolean;
}

interface EmailConfig extends ApiConfig {
  fromEmail: string;
  domain: string;
}

type LLMConfig = ApiConfig;

interface ONECIConfig extends ApiConfig {
  apiBase: string;
  cevEndpoint: string;
  secretKey: string;
  apiKey: string;
}

class ApiKeysConfig {
  readonly supabase: SupabaseConfig = {
    url: import.meta.env['SUPABASE_URL'] || '',
    anonKey: import.meta.env['SUPABASE_ANON_KEY'] || '',
    // SÉCURITÉ: Pas de serviceRoleKey ici - n'utiliser que dans les edge functions
  };

  readonly azure = {
    openai: {
      key: import.meta.env['VITE_AZURE_OPENAI_API_KEY'] || '',
      endpoint: import.meta.env['VITE_AZURE_OPENAI_ENDPOINT'] || '',
      deploymentName: import.meta.env['VITE_AZURE_OPENAI_DEPLOYMENT_NAME'] || 'gpt-4o-mini',
      apiVersion: import.meta.env['VITE_AZURE_OPENAI_API_VERSION'] || '2024-10-21',
      isConfigured: !!(
        import.meta.env['VITE_AZURE_OPENAI_API_KEY'] &&
        import.meta.env['VITE_AZURE_OPENAI_ENDPOINT']
      ),
    } as AzureOpenAIConfig,

    aiServices: {
      key: import.meta.env['VITE_AZURE_AI_SERVICES_API_KEY'] || '',
      endpoint: import.meta.env['VITE_AZURE_AI_SERVICES_ENDPOINT'] || '',
      isConfigured: !!(
        import.meta.env['VITE_AZURE_AI_SERVICES_API_KEY'] &&
        import.meta.env['VITE_AZURE_AI_SERVICES_ENDPOINT']
      ),
    } as AzureAIServicesConfig,

    speech: {
      key: import.meta.env['AZURE_SPEECH_API_KEY'] || '',
      endpoint: import.meta.env['AZURE_SPEECH_TTS_ENDPOINT'] || '',
      region: import.meta.env['AZURE_SPEECH_REGION'] || 'eastus',
      sttEndpoint: import.meta.env['AZURE_SPEECH_STT_ENDPOINT'] || '',
      ttsEndpoint: import.meta.env['AZURE_SPEECH_TTS_ENDPOINT'] || '',
      isConfigured: !!import.meta.env['AZURE_SPEECH_API_KEY'],
    } as AzureSpeechConfig,
  };

  readonly maps = {
    mapbox: {
      key: import.meta.env['VITE_MAPBOX_PUBLIC_TOKEN'] || '',
      endpoint: 'https://api.mapbox.com',
      isConfigured: !!import.meta.env['VITE_MAPBOX_PUBLIC_TOKEN'],
    } as MapConfig,

    googleMaps: {
      key: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] || '',
      endpoint: 'https://maps.googleapis.com',
      isConfigured: !!import.meta.env['VITE_GOOGLE_MAPS_API_KEY'],
    } as MapConfig,
  };

  readonly payment = {
    inTouch: {
      baseUrl: import.meta.env['VITE_INTOUCH_BASE_URL'] || 'https://apidist.gutouch.net',
      username: import.meta.env['VITE_INTOUCH_USERNAME'] || '',
      password: import.meta.env['VITE_INTOUCH_PASSWORD'] || '',
      partnerId: import.meta.env['VITE_INTOUCH_PARTNER_ID'] || '',
      loginApi: import.meta.env['VITE_INTOUCH_LOGIN_API'] || '',
      passwordApi: import.meta.env['VITE_INTOUCH_PASSWORD_API'] || '',
      isConfigured: !!(
        import.meta.env['VITE_INTOUCH_USERNAME'] && import.meta.env['VITE_INTOUCH_PASSWORD']
      ),
    } as PaymentConfig,
  };

  readonly verification = {
    neoface: {
      key: import.meta.env['NEOFACE_BEARER_TOKEN'] || '',
      endpoint: '',
      apiBase: import.meta.env['NEOFACE_API_BASE'] || 'https://neoface.aineo.ai/api/v2',
      isConfigured: !!import.meta.env['NEOFACE_BEARER_TOKEN'],
    } as FacialVerificationConfig,

    smileless: {
      key: import.meta.env['SMILELESS_TOKEN'] || '',
      endpoint: '',
      apiBase: import.meta.env['SMILELESS_API_BASE'] || 'https://neoface.aineo.ai/api',
      isConfigured: !!import.meta.env['SMILELESS_TOKEN'],
    } as FacialVerificationConfig,

    oneci: {
      key: import.meta.env['VITE_ONECI_API_KEY'] || '',
      endpoint: import.meta.env['VITE_ONECI_API_URL'] || 'https://api-rnpp.verif.ci',
      apiBase: import.meta.env['VITE_ONECI_API_URL'] || 'https://api-rnpp.verif.ci',
      cevEndpoint: '/api/v1/cev',
      secretKey: import.meta.env['VITE_ONECI_SECRET_KEY'] || '',
      apiKey: import.meta.env['VITE_ONECI_API_KEY'] || '',
      isConfigured: !!(
        import.meta.env['VITE_ONECI_API_KEY'] && import.meta.env['VITE_ONECI_SECRET_KEY']
      ),
    } as ONECIConfig,
  };

  readonly signature = {
    cryptoneo: {
      appKey: import.meta.env['VITE_CRYPTONEO_APP_KEY'] || '',
      appSecret: import.meta.env['VITE_CRYPTONEO_APP_SECRET'] || '',
      baseUrl:
        import.meta.env['VITE_CRYPTONEO_BASE_URL'] ||
        'https://ansut.cryptoneoplatforms.com/esignaturedemo',
      isConfigured: !!(
        import.meta.env['VITE_CRYPTONEO_APP_KEY'] && import.meta.env['VITE_CRYPTONEO_APP_SECRET']
      ),
    } as SignatureConfig,
  };

  readonly communication = {
    email: {
      key: import.meta.env['RESEND_API_KEY'] || '',
      endpoint: 'https://api.resend.com',
      fromEmail: import.meta.env['RESEND_FROM_EMAIL'] || 'no-reply@notifications.ansut.ci',
      domain: import.meta.env['RESEND_DOMAIN'] || 'notifications.ansut.ci',
      isConfigured: !!import.meta.env['RESEND_API_KEY'],
    } as EmailConfig,
    // SMS/WhatsApp : passent par les Edge Functions Supabase (send-sms-azure)
    // La clé Azure SMS est stockée dans Supabase Secrets, jamais côté client
  };

  readonly llm = {
    gemini: {
      key: import.meta.env['GEMINI_API_KEY'] || '',
      endpoint: 'https://generativelanguage.googleapis.com',
      isConfigured: !!import.meta.env['GEMINI_API_KEY'],
    } as LLMConfig,

    deepseek: {
      key: import.meta.env['DEEPSEEK_API_KEY'] || '',
      endpoint: 'https://api.deepseek.com',
      isConfigured: !!import.meta.env['DEEPSEEK_API_KEY'],
    } as LLMConfig,
  };

  validateConfiguration(): {
    isValid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!this.supabase.url || !this.supabase.anonKey) {
      missing.push('Supabase (SUPABASE_URL, SUPABASE_ANON_KEY)');
    }

    if (!this.azure.openai.isConfigured) {
      warnings.push('Azure OpenAI - Le chatbot IA ne sera pas disponible');
    }

    if (!this.payment.inTouch.isConfigured) {
      warnings.push('IN TOUCH - Les paiements Mobile Money ne seront pas disponibles');
    }

    if (!this.verification.neoface.isConfigured && !this.verification.smileless.isConfigured) {
      warnings.push('Vérification faciale - La vérification biométrique ne sera pas disponible');
    }

    if (!this.verification.oneci.isConfigured) {
      warnings.push("ONECI - La vérification d'identité nationale ne sera pas disponible");
    }

    if (!this.signature.cryptoneo.isConfigured) {
      warnings.push('CryptoNeo - La signature électronique ne sera pas disponible');
    }

    if (!this.maps.mapbox.isConfigured) {
      warnings.push('Mapbox - Les cartes ne seront pas affichées correctement');
    }

    return {
      isValid: missing.length === 0,
      missing,
      warnings,
    };
  }

  getServiceStatus(): Record<string, boolean> {
    return {
      supabase: !!(this.supabase.url && this.supabase.anonKey),
      azureOpenAI: this.azure.openai.isConfigured,
      azureAIServices: this.azure.aiServices.isConfigured,
      azureSpeech: this.azure.speech.isConfigured,
      mapbox: this.maps.mapbox.isConfigured,
      googleMaps: this.maps.googleMaps.isConfigured,
      inTouchPayment: this.payment.inTouch.isConfigured,
      neofaceVerification: this.verification.neoface.isConfigured,
      smilelessVerification: this.verification.smileless.isConfigured,
      oneciVerification: this.verification.oneci.isConfigured,
      cryptoneoSignature: this.signature.cryptoneo.isConfigured,
      emailService: this.communication.email.isConfigured,
      // SMS/WhatsApp: toujours disponible via Edge Functions (send-sms-azure)
      smsService: true, // Géré par Supabase Edge Functions
      geminiLLM: this.llm.gemini.isConfigured,
      deepseekLLM: this.llm.deepseek.isConfigured,
    };
  }

  logConfiguration() {
    const status = this.getServiceStatus();
    const validation = this.validateConfiguration();

    if (import.meta.env.DEV) {
      console.group('📋 Configuration des Services API - Mon Toit');
      console.log(
        '✅ Services Configurés:',
        Object.entries(status)
          .filter(([, v]) => v)
          .map(([k]) => k)
      );
      console.log(
        '❌ Services Non Configurés:',
        Object.entries(status)
          .filter(([, v]) => !v)
          .map(([k]) => k)
      );

      if (validation.missing.length > 0) {
        console.error('🚨 Configuration Manquante (Critique):', validation.missing);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Avertissements:', validation.warnings);
      }

      console.groupEnd();
    }

    return validation;
  }
}

export const apiKeysConfig = new ApiKeysConfig();

export default apiKeysConfig;
