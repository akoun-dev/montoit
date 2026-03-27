/**
 * Utilitaires pour l'affichage des contacts (email/téléphone)
 * Gère le cas des emails dérivés de numéros de téléphone
 */

// Domaine utilisé pour les emails dérivés de téléphone
const PHONE_EMAIL_DOMAIN = '@phone.montoit.ci';

/**
 * Détecte si un email est un email dérivé d'un numéro de téléphone
 */
export function isPhoneEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.endsWith(PHONE_EMAIL_DOMAIN);
}

/**
 * Formate l'affichage du contact d'un utilisateur
 * - Si c'est un email dérivé de téléphone, affiche le numéro
 * - Sinon affiche l'email
 * - Si aucun des deux, retourne une valeur par défaut
 */
export function formatUserContact(
  email: string | undefined | null,
  phone: string | undefined | null,
  userMetadataPhone?: string | null,
  fallback = 'Non renseigné'
): string {
  // Priorité au numéro de téléphone si disponible dans le profil
  if (phone) {
    return phone;
  }

  // Ensuite, vérifier user_metadata.phone (pour les inscriptions par téléphone)
  if (userMetadataPhone) {
    return formatPhoneNumber(userMetadataPhone);
  }

  // Si c'est un email dérivé de téléphone, extraire et formatter le numéro
  if (email && isPhoneEmail(email)) {
    // Extraire le numéro de l'email dérivé (ex: 2250140984943@phone.montoit.ci -> 2250140984943)
    const phoneNumber = email.replace(PHONE_EMAIL_DOMAIN, '');
    if (phoneNumber) {
      return formatPhoneNumber(phoneNumber);
    }
    return fallback;
  }

  // Email normal
  return email || fallback;
}

/**
 * Formate un numéro de téléphone pour l'affichage
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Nettoyer le numéro
  let cleaned = phone.replace(/\D/g, '');

  // Retirer le préfixe 225 s'il est déjà là (pour éviter les doublons)
  if (cleaned.startsWith('225') && cleaned.length === 13) {
    cleaned = cleaned.substring(3);
  }

  // Ajouter l'indicatif +225 si manquant
  if (!cleaned.startsWith('225') && cleaned.length === 10) {
    cleaned = '225' + cleaned;
  }

  // Format international pour la Côte d'Ivoire: +225 XX XX XX XX XX
  if (cleaned.startsWith('225') && cleaned.length === 12) {
    return `+225 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)} ${cleaned.slice(11, 13)}`;
  }

  // Format générique avec + pour les autres pays
  if (cleaned.length > 10 && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }

  // Fallback: retourner le numéro original s'il n'a pas pu être formaté
  return phone.startsWith('+') ? phone : '+' + cleaned;
}

/**
 * Retourne le type de contact principal d'un utilisateur
 */
export function getContactType(
  email: string | undefined | null,
  phone: string | undefined | null
): 'email' | 'phone' | 'none' {
  if (phone) return 'phone';
  if (email && !isPhoneEmail(email)) return 'email';
  return 'none';
}

/**
 * Retourne le libellé du contact pour l'affichage dans les UI
 */
export function getContactLabel(
  email: string | undefined | null,
  phone: string | undefined | null
): string {
  const contactType = getContactType(email, phone);
  switch (contactType) {
    case 'phone':
      return 'Téléphone';
    case 'email':
      return 'Email';
    default:
      return 'Contact';
  }
}
