/**
 * Azure Translator Service Stub
 * Service de traduction pour l'internationalisation
 */

// In-memory storage for production (no localStorage)
let preferredLanguage = 'fr';

export const azureTranslatorService = {
  /**
   * Définit la langue cible pour la traduction
   */
  setTargetLanguage: async (lang: string): Promise<void> => {
    preferredLanguage = lang;
  },

  /**
   * Traduit un texte vers la langue cible
   */
  translate: async (text: string, _targetLang: string): Promise<string> => {
    // Stub: retourne le texte original
    return text;
  },

  /**
   * Vérifie si le service est configuré
   */
  isConfigured: (): boolean => {
    return !!import.meta.env['VITE_AZURE_TRANSLATOR_KEY'];
  },

  /**
   * Obtient la langue préférée
   */
  getPreferredLanguage: (): string => {
    return preferredLanguage;
  },
};

export default azureTranslatorService;
