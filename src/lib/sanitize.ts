import DOMPurify from 'dompurify';

/**
 * Configuration de DOMPurify pour la plateforme Mon Toit
 * Adaptée pour permettre les éléments HTML nécessaires tout en bloquant les attaques XSS
 */

// Configuration personnalisée pour les descriptions de propriétés
export const PROPERTY_DESCRIPTION_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'i', 'b',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'span', 'div'
  ],
  ALLOWED_ATTR: ['class'],
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
  KEEP_CONTENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

// Configuration pour les messages (plus restrictive)
export const MESSAGE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'i', 'b'],
  ALLOWED_ATTR: [],
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'class'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'div', 'span'],
  KEEP_CONTENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

// Configuration pour le contenu admin (plus permissive)
export const ADMIN_CONTENT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'a',
    'ul', 'ol', 'li', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'span', 'div', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'
  ],
  ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt'],
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
  KEEP_CONTENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  ADD_ATTR: ['target'],
  FORBID_SCRIPT: true
};

/**
 * Fonction principale de sanitization pour le contenu utilisateur
 * @param dirty - Le contenu HTML potentiellement dangereux
 * @param config - Configuration DOMPurify à utiliser
 * @returns Le contenu HTML sécurisé
 */
export function sanitizeHtml(dirty: string, config = MESSAGE_CONFIG): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  try {
    const clean = DOMPurify.sanitize(dirty, config);
    return clean;
  } catch (error) {
    console.error('Erreur lors de la sanitization HTML:', error);
    // En cas d'erreur, retourner une version texte brute sécurisée
    return dirty.replace(/<[^>]*>/g, '').substring(0, 1000);
  }
}

/**
 * Sanitization spécifique pour les descriptions de propriétés
 */
export function sanitizePropertyDescription(description: string | null | undefined): string {
  if (!description) return '';
  return sanitizeHtml(description, PROPERTY_DESCRIPTION_CONFIG);
}

/**
 * Sanitization spécifique pour les messages utilisateurs
 */
export function sanitizeMessage(content: string | null | undefined): string {
  if (!content) return '';
  return sanitizeHtml(content, MESSAGE_CONFIG);
}

/**
 * Sanitization pour le contenu admin (plus permissive)
 */
export function sanitizeAdminContent(content: string | null | undefined): string {
  if (!content) return '';
  return sanitizeHtml(content, ADMIN_CONTENT_CONFIG);
}

/**
 * Sanitization de base pour le texte (supprime tous les tags HTML)
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  if (typeof text !== 'string') return '';

  // Utiliser DOMPurify avec une configuration très restrictive
  const textOnlyConfig = {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true
  };

  return DOMPurify.sanitize(text, textOnlyConfig);
}

/**
 * Validation du contenu pour détecter des tentatives d'attaques
 */
export function detectSuspiciousContent(content: string): {
  isSuspicious: boolean;
  reasons: string[];
  sanitized: string;
} {
  const reasons: string[] = [];
  const suspiciousPatterns = [
    { pattern: /<script[^>]*>/i, reason: 'Balise script détectée' },
    { pattern: /javascript:/i, reason: 'Protocole JavaScript détecté' },
    { pattern: /on\w+\s*=/i, reason: 'Event handler détecté' },
    { pattern: /data:text\/html/i, reason: 'Data URL HTML détectée' },
    { pattern: /vbscript:/i, reason: 'VBScript détecté' },
    { pattern: /<iframe[^>]*>/i, reason: 'Balise iframe détectée' },
    { pattern: /<object[^>]*>/i, reason: 'Balise object détectée' },
    { pattern: /<embed[^>]*>/i, reason: 'Balise embed détectée' },
    { pattern: /expression\s*\(/i, reason: 'Expression CSS détectée' },
    { pattern: /@import/i, reason: 'Import CSS détecté' }
  ];

  let isSuspicious = false;

  for (const { pattern, reason } of suspiciousPatterns) {
    if (pattern.test(content)) {
      isSuspicious = true;
      reasons.push(reason);
    }
  }

  return {
    isSuspicious,
    reasons,
    sanitized: sanitizeText(content)
  };
}

/**
 * Hook React pour la sanitization automatique
 */
export function useSanitizedContent(content: string | null | undefined, config = MESSAGE_CONFIG) {
  const [sanitized, setSanitized] = useState('');
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [suspiciousReasons, setSuspiciousReasons] = useState<string[]>([]);

  useEffect(() => {
    if (!content) {
      setSanitized('');
      setIsSuspicious(false);
      setSuspiciousReasons([]);
      return;
    }

    const detection = detectSuspiciousContent(content);
    setIsSuspicious(detection.isSuspicious);
    setSuspiciousReasons(detection.reasons);

    if (detection.isSuspicious) {
      setSanitized(detection.sanitized);
    } else {
      setSanitized(sanitizeHtml(content, config));
    }
  }, [content, config]);

  return {
    sanitized,
    isSuspicious,
    suspiciousReasons,
    hasContent: !!sanitized
  };
}

// Import de useState et useEffect pour le hook
import { useState, useEffect } from 'react';