/**
 * Configuration des fonctionnalités activables/désactivables
 * Feature Flags pour Mon Toit
 */

export interface FeatureFlags {
  // Vérifications d'identité
  ONECI_VERIFICATION: boolean;
  FACE_VERIFICATION: boolean;

  // Fonctionnalités de recherche
  ADVANCED_SEARCH: boolean;
  AI_SEARCH: boolean;
  MAP_SEARCH: boolean;

  // Types de propriétés
  COMMERCIAL_PROPERTIES: boolean;
  RESIDENTIAL_PROPERTIES: boolean;

  // Paiements
  MOBILE_MONEY_PAYMENT: boolean;
  CARD_PAYMENT: boolean;

  // Signature électronique
  CRYPTONEO_SIGNATURE: boolean;

  // Chatbot
  SUTA_CHATBOT: boolean;

  // Notifications
  EMAIL_NOTIFICATIONS: boolean;
  SMS_NOTIFICATIONS: boolean;
  WHATSAPP_NOTIFICATIONS: boolean;
}

/**
 * Configuration par défaut des features
 *
 * IMPORTANT :
 * - COMMERCIAL_PROPERTIES est désactivé (Mon Toit = résidentiel uniquement)
 * - AI_SEARCH est désactivé (non implémenté)
 */
export const FEATURES: FeatureFlags = {
  // Vérifications d'identité
  ONECI_VERIFICATION: true, // ✅ Activé - Vérification ONECI/SNEDAI
  FACE_VERIFICATION: true, // ✅ Activé - Biométrie faciale

  // Fonctionnalités de recherche
  ADVANCED_SEARCH: true, // ✅ Activé - Recherche avancée
  AI_SEARCH: false, // ❌ Désactivé - Non implémenté
  MAP_SEARCH: true, // ✅ Activé - Recherche par carte

  // Types de propriétés
  COMMERCIAL_PROPERTIES: false, // ❌ Désactivé - Mon Toit = résidentiel uniquement
  RESIDENTIAL_PROPERTIES: true, // ✅ Activé - Appartements, villas, studios

  // Paiements
  MOBILE_MONEY_PAYMENT: true, // ✅ Activé - Orange Money, MTN Money, Moov Money
  CARD_PAYMENT: false, // ❌ Désactivé - À venir

  // Signature électronique
  CRYPTONEO_SIGNATURE: true, // ✅ Activé - Cachet électronique ANSUT

  // Chatbot
  SUTA_CHATBOT: true, // ✅ Activé - Assistant anti-arnaque

  // Notifications
  EMAIL_NOTIFICATIONS: true, // ✅ Activé - Notifications par email
  SMS_NOTIFICATIONS: false, // ❌ Désactivé - À venir
  WHATSAPP_NOTIFICATIONS: true, // ✅ Activé - OTP WhatsApp via InTouch
};

/**
 * Vérifier si une feature est activée
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return FEATURES[feature];
};

/**
 * Obtenir toutes les features activées
 */
export const getEnabledFeatures = (): Partial<FeatureFlags> => {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

/**
 * Obtenir toutes les features désactivées
 */
export const getDisabledFeatures = (): Partial<FeatureFlags> => {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => !enabled)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

/**
 * Configuration des features par environnement
 * Permet d'activer certaines features uniquement en dev/staging
 */
export const getFeaturesByEnvironment = (): FeatureFlags => {
  const env = import.meta.env.MODE;

  // En développement, on peut activer des features expérimentales
  if (env === 'development') {
    return {
      ...FEATURES,
      // Activer des features de test en dev si besoin
      // AI_SEARCH: true,
    };
  }

  // En staging, on peut tester des features avant prod
  if (env === 'staging') {
    return {
      ...FEATURES,
      // Tester des features en staging
    };
  }

  // En production, utiliser la config par défaut
  return FEATURES;
};

export default FEATURES;
