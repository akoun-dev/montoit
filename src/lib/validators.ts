/**
 * Validateurs de formats — fonctions pures réutilisables côté client comme serveur.
 *
 * Chaque validateur retourne { valid: boolean, error?: string } où `error` est
 * un message en français prêt à afficher à l'utilisateur quand la valeur est invalide.
 *
 * Conventions :
 * - Une chaîne vide est considérée comme "non remplie" → l'erreur dépend du champ
 *   (certains acceptent vide, d'autres demandent au minimum un caractère).
 * - Les valeurs sont trim-ées automatiquement avant validation.
 * - Pour activer/désactiver un bouton "Envoyer", utiliser isValidEmail(value)
 *   plutôt que validateEmail() qui renvoie un objet.
 */

export type ValidationResult = {
  valid: boolean
  error?: string
}

const ok: ValidationResult = { valid: true }

// ── Email ─────────────────────────────────────────────────────────────────

/**
 * RFC 5322 simplifié : assez strict pour bloquer les saisies invalides
 * (espaces, absence de @, absence de TLD) sans tomber dans des regex
 * monstrueuses qui rejettent des emails valides exotiques.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function validateEmail(value: string): ValidationResult {
  const v = (value || '').trim()
  if (!v) return { valid: false, error: 'L\'adresse email est requise.' }
  if (v.length > 254) return { valid: false, error: 'Adresse email trop longue.' }
  if (!EMAIL_REGEX.test(v)) {
    return { valid: false, error: 'Format d\'email invalide (ex: nom@exemple.com).' }
  }
  return ok
}

export function isValidEmail(value: string): boolean {
  return validateEmail(value).valid
}

// ── Téléphone (Côte d'Ivoire) ─────────────────────────────────────────────

/**
 * Format attendu : 10 chiffres consécutifs, commençant par un préfixe
 * d'opérateur ivoirien (01, 05, 07).
 * - 01 → Moov Africa
 * - 05 → MTN
 * - 07 → Orange / Wave
 */
const CI_PHONE_PREFIXES = ['01', '05', '07']

export function validatePhoneCI(value: string): ValidationResult {
  const digits = (value || '').replace(/\D/g, '')
  if (!digits) return { valid: false, error: 'Le numéro de téléphone est requis.' }
  if (digits.length !== 10) {
    return { valid: false, error: 'Le numéro doit contenir 10 chiffres (ex: 0700000000).' }
  }
  const prefix = digits.slice(0, 2)
  if (!CI_PHONE_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      error: `Préfixe invalide. Utilisez ${CI_PHONE_PREFIXES.join(', ')} (Moov, MTN, Orange).`,
    }
  }
  return ok
}

export function isValidPhoneCI(value: string): boolean {
  return validatePhoneCI(value).valid
}

// ── Nom / Prénom ──────────────────────────────────────────────────────────

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]{2,60}$/

export function validateName(value: string, label = 'Nom'): ValidationResult {
  const v = (value || '').trim()
  if (!v) return { valid: false, error: `${label} requis.` }
  if (v.length < 2) return { valid: false, error: `${label} trop court (2 caractères minimum).` }
  if (v.length > 60) return { valid: false, error: `${label} trop long (60 caractères maximum).` }
  if (!NAME_REGEX.test(v)) {
    return { valid: false, error: `${label} contient des caractères non autorisés.` }
  }
  return ok
}

// ── NNI (Numéro National d'Identification CI) ─────────────────────────────

/**
 * NNI ivoirien : 14 caractères alphanumériques (format CI : CIxxxxxxxxxxxx).
 * On accepte aussi 13 chiffres pour les anciens formats.
 */
export function validateNNI(value: string): ValidationResult {
  const v = (value || '').trim().toUpperCase()
  if (!v) return { valid: false, error: 'Le NNI est requis.' }
  if (!/^[A-Z0-9]{10,16}$/.test(v)) {
    return { valid: false, error: 'NNI invalide (10 à 16 caractères alphanumériques).' }
  }
  return ok
}

// ── Date de naissance ─────────────────────────────────────────────────────

/**
 * Vérifie qu'une date ISO (YYYY-MM-DD) est valide et que la personne a
 * entre 18 et 120 ans.
 */
export function validateBirthDate(value: string): ValidationResult {
  const v = (value || '').trim()
  if (!v) return { valid: false, error: 'La date de naissance est requise.' }
  const date = new Date(v)
  if (isNaN(date.getTime())) return { valid: false, error: 'Date invalide.' }

  const now = new Date()
  const age = now.getFullYear() - date.getFullYear() - (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
      ? 1 : 0
  )
  if (age < 18) return { valid: false, error: 'Vous devez avoir au moins 18 ans.' }
  if (age > 120) return { valid: false, error: 'Date de naissance invalide.' }
  return ok
}

// ── OTP (code à 6 chiffres) ───────────────────────────────────────────────

export function validateOtp(value: string, length = 6): ValidationResult {
  const v = (value || '').trim()
  if (!v) return { valid: false, error: 'Code requis.' }
  if (!/^\d+$/.test(v)) return { valid: false, error: 'Le code doit contenir uniquement des chiffres.' }
  if (v.length !== length) return { valid: false, error: `Le code doit contenir ${length} chiffres.` }
  return ok
}

// ── Mot de passe ──────────────────────────────────────────────────────────

export function validatePassword(value: string): ValidationResult {
  const v = value || ''
  if (!v) return { valid: false, error: 'Le mot de passe est requis.' }
  if (v.length < 8) return { valid: false, error: 'Le mot de passe doit faire au moins 8 caractères.' }
  if (!/[A-Z]/.test(v)) return { valid: false, error: 'Le mot de passe doit contenir une majuscule.' }
  if (!/[a-z]/.test(v)) return { valid: false, error: 'Le mot de passe doit contenir une minuscule.' }
  if (!/[0-9]/.test(v)) return { valid: false, error: 'Le mot de passe doit contenir un chiffre.' }
  return ok
}
