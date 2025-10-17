/**
 * Utilitaires pour la gestion des IPs et fingerprints
 * Utilisé pour le rate limiting et la protection DDoS
 */

/**
 * Récupère l'IP du client via un service externe
 * Fallback sur '0.0.0.0' en cas d'échec
 */
import { logger } from '@/services/logger';

export const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || '0.0.0.0';
  } catch (error) {
    logger.logError(error, { context: 'ipUtils', action: 'getClientIP' });
    return '0.0.0.0';
  }
};

/**
 * Génère un fingerprint unique basé sur les caractéristiques du navigateur
 * Utilisé pour identifier les tentatives de connexion suspectes
 */
export const getDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';
  
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Fingerprint', 2, 2);
  
  const canvasHash = canvas.toDataURL().slice(-50);
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvasHash,
  };
  
  return btoa(JSON.stringify(fingerprint)).slice(0, 64);
};

/**
 * Formate un timestamp pour affichage du temps restant
 */
export const formatRetryAfter = (retryAfter: string): string => {
  const diff = new Date(retryAfter).getTime() - Date.now();
  if (diff <= 0) return 'maintenant';
  
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  
  const hours = Math.ceil(minutes / 60);
  return `${hours} heure${hours > 1 ? 's' : ''}`;
};
