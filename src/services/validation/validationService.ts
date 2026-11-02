/**
 * ValidationService - Service centralisé de validation pour Mon Toit
 * Gère toutes les validations : email, téléphone CI, ONECI, dates, nombres
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const ValidationService = {
  // ============================================
  // VALIDATIONS GÉNÉRIQUES
  // ============================================

  /**
   * Valide qu'un champ n'est pas vide
   */
  validateRequired(value: string | number | undefined | null, fieldName: string): ValidationResult {
    const stringValue = String(value ?? '').trim();
    if (!stringValue) {
      return { isValid: false, error: `${fieldName} est obligatoire` };
    }
    return { isValid: true };
  },

  /**
   * Valide la longueur minimale
   */
  validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
    if (value.trim().length < minLength) {
      return {
        isValid: false,
        error: `${fieldName} doit contenir au moins ${minLength} caractères`,
      };
    }
    return { isValid: true };
  },

  /**
   * Valide la longueur maximale
   */
  validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
    if (value.length > maxLength) {
      return { isValid: false, error: `${fieldName} ne doit pas dépasser ${maxLength} caractères` };
    }
    return { isValid: true };
  },

  /**
   * Valide la longueur min ET max combinées
   */
  validateLength(
    value: string,
    minLength: number,
    maxLength: number,
    fieldName: string
  ): ValidationResult {
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      return {
        isValid: false,
        error: `${fieldName} doit contenir au moins ${minLength} caractères`,
      };
    }
    if (trimmed.length > maxLength) {
      return { isValid: false, error: `${fieldName} ne doit pas dépasser ${maxLength} caractères` };
    }
    return { isValid: true };
  },

  /**
   * Valide la qualité d'un titre (bloque les titres génériques)
   */
  validateTitleQuality(title: string): ValidationResult {
    const trimmed = title.trim();

    // Liste des titres génériques interdits
    const genericTitles = ['test', 'essai', 'aaa', 'abc', 'xxx', '123', 'asdf', 'qwerty', 'azerty'];
    const lowerTitle = trimmed.toLowerCase();

    if (genericTitles.some((g) => lowerTitle === g || lowerTitle.startsWith(g + ' '))) {
      return { isValid: false, error: 'Le titre doit être descriptif (pas de titre générique)' };
    }

    // Vérifier qu'il y a au moins 2 mots
    const words = trimmed.split(/\s+/).filter((w) => w.length > 1);
    if (words.length < 2) {
      return { isValid: false, error: 'Le titre doit contenir au moins 2 mots' };
    }

    // Vérifier les caractères répétés abusivement (ex: "aaaaaaa")
    if (/(.)\1{4,}/.test(trimmed)) {
      return {
        isValid: false,
        error: 'Le titre contient des caractères répétés de manière abusive',
      };
    }

    return { isValid: true };
  },

  /**
   * Valide un email
   */
  validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      return { isValid: false, error: "L'email est obligatoire" };
    }
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, error: "Format d'email invalide" };
    }
    return { isValid: true };
  },

  /**
   * Valide qu'un nombre est positif
   */
  validatePositiveNumber(value: string | number, fieldName: string): ValidationResult {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num <= 0) {
      return { isValid: false, error: `${fieldName} doit être un nombre positif` };
    }
    return { isValid: true };
  },

  /**
   * Valide qu'un nombre est >= 0
   */
  validateNonNegativeNumber(value: string | number, fieldName: string): ValidationResult {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0) {
      return { isValid: false, error: `${fieldName} doit être supérieur ou égal à 0` };
    }
    return { isValid: true };
  },

  /**
   * Valide qu'une valeur est dans un intervalle
   */
  validateRange(value: number, min: number, max: number, fieldName: string): ValidationResult {
    if (value < min || value > max) {
      return { isValid: false, error: `${fieldName} doit être entre ${min} et ${max}` };
    }
    return { isValid: true };
  },

  /**
   * Valide qu'une date est dans le futur
   */
  validateFutureDate(dateStr: string, fieldName: string): ValidationResult {
    if (!dateStr) {
      return { isValid: false, error: `${fieldName} est obligatoire` };
    }
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return { isValid: false, error: `${fieldName} doit être une date future` };
    }
    return { isValid: true };
  },

  /**
   * Valide la cohérence entre deux dates (fin > début)
   */
  validateDateRange(startDateStr: string, endDateStr: string): ValidationResult {
    if (!startDateStr || !endDateStr) {
      return { isValid: true }; // Laisse la validation required gérer
    }
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (endDate <= startDate) {
      return { isValid: false, error: 'La date de fin doit être postérieure à la date de début' };
    }
    return { isValid: true };
  },

  // ============================================
  // VALIDATIONS IVOIRIENNES SPÉCIFIQUES
  // ============================================

  /**
   * Valide un numéro de téléphone ivoirien (format local)
   * Formats acceptés: 0701234567, 0501234567, 0101234567
   */
  validateCIPhoneNumber(phone: string): ValidationResult {
    const cleaned = phone.replace(/[\s\-\.]/g, '');
    const ciPhoneRegex = /^0[157][0-9]{8}$/;

    if (!cleaned) {
      return { isValid: false, error: 'Le numéro de téléphone est obligatoire' };
    }
    if (!ciPhoneRegex.test(cleaned)) {
      return { isValid: false, error: 'Format invalide. Ex: 07 01 23 45 67' };
    }
    return { isValid: true };
  },

  /**
   * Valide un numéro de téléphone avec code pays +225
   */
  validatePhoneWithCountryCode(phone: string): ValidationResult {
    const cleaned = phone.replace(/[\s\-\.]/g, '');
    const intlRegex = /^\+225[0-9]{10}$/;

    if (!cleaned) {
      return { isValid: false, error: 'Le numéro de téléphone est obligatoire' };
    }
    if (!intlRegex.test(cleaned)) {
      return { isValid: false, error: 'Format invalide. Ex: +225 07 01 23 45 67' };
    }
    return { isValid: true };
  },

  /**
   * Valide un numéro de téléphone (format local OU international)
   */
  validatePhone(phone: string): ValidationResult {
    const cleaned = phone.replace(/[\s\-\.]/g, '');

    if (!cleaned) {
      return { isValid: false, error: 'Le numéro de téléphone est obligatoire' };
    }

    // Format international +225
    if (cleaned.startsWith('+225')) {
      return this.validatePhoneWithCountryCode(cleaned);
    }

    // Format local
    return this.validateCIPhoneNumber(cleaned);
  },

  /**
   * Valide un numéro ONECI (Carte Nationale d'Identité)
   * Format: 8-15 caractères alphanumériques
   */
  validateONECINumber(number: string): ValidationResult {
    const cleaned = number.replace(/\s/g, '').toUpperCase();
    const oneciRegex = /^[A-Z0-9]{8,15}$/;

    if (!cleaned) {
      return { isValid: false, error: 'Le numéro ONECI est obligatoire' };
    }
    if (!oneciRegex.test(cleaned)) {
      return { isValid: false, error: 'Numéro ONECI invalide (8-15 caractères alphanumériques)' };
    }
    return { isValid: true };
  },

  // ============================================
  // VALIDATIONS DE FORMULAIRES COMPLETS
  // ============================================

  /**
   * Valide le formulaire d'ajout de propriété
   */
  validatePropertyForm(formData: {
    title: string;
    address: string;
    city: string;
    monthly_rent: string | number;
    surface_area?: string | number;
    bedrooms?: number;
    bathrooms?: number;
  }): FormValidationResult {
    const errors: Record<string, string> = {};

    // Titre (minimum 10 caractères)
    const titleResult = this.validateMinLength(formData.title, 10, 'Le titre');
    if (!titleResult.isValid && titleResult.error) {
      errors['title'] = titleResult.error;
    }

    // Adresse obligatoire
    const addressResult = this.validateRequired(formData.address, "L'adresse");
    if (!addressResult.isValid && addressResult.error) {
      errors['address'] = addressResult.error;
    }

    // Ville obligatoire
    const cityResult = this.validateRequired(formData.city, 'La ville');
    if (!cityResult.isValid && cityResult.error) {
      errors['city'] = cityResult.error;
    }

    // Loyer positif
    const rentResult = this.validatePositiveNumber(formData.monthly_rent, 'Le loyer');
    if (!rentResult.isValid && rentResult.error) {
      errors['monthly_rent'] = rentResult.error;
    }

    // Surface positive si renseignée
    if (formData.surface_area && String(formData.surface_area).trim()) {
      const surfaceResult = this.validatePositiveNumber(formData.surface_area, 'La surface');
      if (!surfaceResult.isValid && surfaceResult.error) {
        errors['surface_area'] = surfaceResult.error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Valide le formulaire de candidature locative
   */
  validateApplicationForm(data: {
    coverLetter: string;
    propertyId?: string;
  }): FormValidationResult {
    const errors: Record<string, string> = {};

    // Lettre de motivation (minimum 50 caractères)
    const letterResult = this.validateMinLength(data.coverLetter, 50, 'La lettre de motivation');
    if (!letterResult.isValid && letterResult.error) {
      errors['coverLetter'] = letterResult.error;
    }

    // Property ID obligatoire
    if (!data.propertyId) {
      errors['propertyId'] = 'Aucune propriété sélectionnée';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Valide le formulaire de création de bail
   */
  validateLeaseForm(formData: {
    propertyId: string;
    tenantId: string;
    monthlyRent: string | number;
    depositAmount: string | number;
    startDate: string;
    endDate: string;
    paymentDay: string | number;
  }): FormValidationResult {
    const errors: Record<string, string> = {};

    // Propriété obligatoire
    if (!formData.propertyId) {
      errors['propertyId'] = 'Veuillez sélectionner une propriété';
    }

    // Locataire obligatoire
    if (!formData.tenantId) {
      errors['tenantId'] = 'Veuillez sélectionner un locataire';
    }

    // Loyer positif
    const rentResult = this.validatePositiveNumber(formData.monthlyRent, 'Le loyer mensuel');
    if (!rentResult.isValid && rentResult.error) {
      errors['monthlyRent'] = rentResult.error;
    }

    // Dépôt positif
    const depositResult = this.validatePositiveNumber(
      formData.depositAmount,
      'Le dépôt de garantie'
    );
    if (!depositResult.isValid && depositResult.error) {
      errors['depositAmount'] = depositResult.error;
    }

    // Date de début future
    const startResult = this.validateFutureDate(formData.startDate, 'La date de début');
    if (!startResult.isValid && startResult.error) {
      errors['startDate'] = startResult.error;
    }

    // Date de fin future
    const endResult = this.validateFutureDate(formData.endDate, 'La date de fin');
    if (!endResult.isValid && endResult.error) {
      errors['endDate'] = endResult.error;
    }

    // Cohérence des dates
    const dateRangeResult = this.validateDateRange(formData.startDate, formData.endDate);
    if (!dateRangeResult.isValid && dateRangeResult.error) {
      errors['endDate'] = dateRangeResult.error;
    }

    // Jour de paiement entre 1 et 28
    const dayNum = parseInt(String(formData.paymentDay));
    if (!isNaN(dayNum)) {
      const dayResult = this.validateRange(dayNum, 1, 28, 'Le jour de paiement');
      if (!dayResult.isValid && dayResult.error) {
        errors['paymentDay'] = dayResult.error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  // ============================================
  // UTILITAIRES DE SANITISATION
  // ============================================

  /**
   * Nettoie une entrée utilisateur (supprime tags HTML et espaces superflus)
   */
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<[^>]*>/g, '') // Supprime les tags HTML
      .replace(/\s+/g, ' '); // Normalise les espaces
  },

  /**
   * Échappe les caractères HTML dangereux
   */
  sanitizeHtml(html: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return html.replace(/[&<>"']/g, (m) => map[m] || m);
  },

  /**
   * Normalise un numéro de téléphone ivoirien
   */
  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\.]/g, '');

    // Si format international
    if (cleaned.startsWith('+225')) {
      return cleaned;
    }

    // Si format local, ajoute +225
    if (cleaned.startsWith('0')) {
      return '+225' + cleaned.substring(1);
    }

    return cleaned;
  },

  /**
   * Formate un numéro de téléphone pour affichage
   */
  formatPhoneDisplay(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    // Format: +225 07 01 23 45 67
    if (cleaned.length === 13 && cleaned.startsWith('225')) {
      return `+225 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)} ${cleaned.slice(11, 13)}`;
    }

    // Format local: 07 01 23 45 67
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
    }

    return phone;
  },
};

export default ValidationService;
