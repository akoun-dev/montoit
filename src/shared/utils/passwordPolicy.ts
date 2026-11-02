/**
 * Politique de validation des mots de passe
 */

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbiddenPatterns: RegExp[];
  errorMessages: {
    minLength: string;
    requireUppercase: string;
    requireLowercase: string;
    requireNumbers: string;
    requireSpecialChars: string;
    forbiddenPatterns: string;
  };
}

export const passwordPolicy: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    /(.)\1{2,}/, // 3+ caractères identiques consécutifs
    /123456|abcdef|qwerty/i, // Séquences communes
    /password|motdepasse|admin|root|user|login/i, // Mots communs
    /montoit|ansut/i, // Noms de l'application
  ],
  errorMessages: {
    minLength: 'Le mot de passe doit contenir au moins 8 caractères',
    requireUppercase: 'Le mot de passe doit contenir au moins une majuscule',
    requireLowercase: 'Le mot de passe doit contenir au moins une minuscule',
    requireNumbers: 'Le mot de passe doit contenir au moins un chiffre',
    requireSpecialChars:
      'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*()_+-=[]{}|;:,.<>)',
    forbiddenPatterns: 'Le mot de passe contient un motif non autorisé',
  },
};

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

/**
 * Valide un mot de passe selon la politique de sécurité
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Longueur minimale
  if (password.length < passwordPolicy.minLength) {
    errors.push(passwordPolicy.errorMessages.minLength);
  } else {
    score += 20;
  }

  // Majuscule
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push(passwordPolicy.errorMessages.requireUppercase);
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  // Minuscule
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push(passwordPolicy.errorMessages.requireLowercase);
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  // Chiffres
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push(passwordPolicy.errorMessages.requireNumbers);
  } else if (/\d/.test(password)) {
    score += 15;
  }

  // Caractères spéciaux
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push(passwordPolicy.errorMessages.requireSpecialChars);
  } else if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    score += 15;
  }

  // Vérifier les motifs interdits
  for (const pattern of passwordPolicy.forbiddenPatterns) {
    if (pattern.test(password)) {
      errors.push(passwordPolicy.errorMessages.forbiddenPatterns);
      score -= 30;
      break;
    }
  }

  // Bonus pour les mots de passe longs
  if (password.length >= 12) {
    score += 10;
    suggestions.push('Excellent ! Mot de passe de bonne longueur');
  }

  // Bonus pour la complexité
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.6) {
    score += 10;
  }

  // Suggestions d'amélioration
  if (score < 60) {
    suggestions.push('Utilisez une combinaison de majuscules, minuscules, chiffres et symboles');
    suggestions.push('Évitez les informations personnelles (dates, noms)');
  }

  // Limiter le score entre 0 et 100
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: errors.length === 0,
    score,
    errors,
    suggestions,
  };
}

/**
 * Génère un mot de passe sécurisé aléatoire
 */
export function generateSecurePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';

  // Assurer au moins un caractère de chaque type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Remplir le reste
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mélanger le mot de passe
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
