/**
 * Configuration générale de l'application Mon Toit
 * Les valeurs peuvent être surchargées par les variables d'environnement.
 */

// Récupération des variables d'environnement (définies à la construction)
const env = import.meta.env;

export const APP_CONFIG = {
  name: 'Mon Toit',
  version: env['VITE_APP_VERSION'] || '3.3.0',
  branch: env['VITE_GIT_BRANCH'] || 'main',
  commitHash: env['VITE_GIT_COMMIT_HASH'] || '',
  description: "Plateforme de location immobilière sécurisée en Côte d'Ivoire",

  company: {
    name: 'ANSUT',
    website: 'https://ansut.ci',
    supportEmail: 'support@montoit.ci',
    phone: '+225 XX XX XX XX XX',
  },

  features: {
    chatbot: true,
    multiLanguage: false,
    darkMode: false,
    notifications: true,
    analytics: true,
  },

  pagination: {
    defaultPageSize: 12,
    pageSizeOptions: [12, 24, 48, 96],
  },

  fileUpload: {
    maxSize: 5 * 1024 * 1024,
    maxImages: 10,
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedDocumentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },

  score: {
    thresholds: {
      excellent: 80,
      good: 60,
      fair: 40,
      poor: 0,
    },
  },

  lease: {
    durations: [6, 12, 24, 36],
    defaultDuration: 12,
  },

  geolocation: {
    defaultRadius: 5,
    radiusOptions: [5, 10, 20, 50],
    timeout: 10000,
    maxAge: 300000,
  },

  rateLimit: {
    searchDebounce: 300,
    apiRetryAttempts: 3,
    apiRetryDelay: 1000,
  },

  notification: {
    duration: {
      short: 3000,
      medium: 5000,
      long: 8000,
    },
  },
} as const;

export default APP_CONFIG;
