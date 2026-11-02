/**
 * Cloudflare Block Detection Utility
 * Détecte et formate les erreurs de blocage Cloudflare pour les appels API Brevo
 */

export interface CloudflareBlockInfo {
  isCloudflareBlock: boolean;
  rayId?: string;
  blockedIp?: string;
  errorCode: string;
  bodySnippet: string;
}

/**
 * Détecte si une réponse HTTP est un blocage Cloudflare
 */
export function detectCloudflareBlock(status: number, body: string): CloudflareBlockInfo {
  const isCloudflareSignature = 
    body.includes('Cloudflare') || 
    body.includes('Ray ID') ||
    body.includes('cf-error') ||
    body.includes('cf-wrapper') ||
    body.includes('Sorry, you have been blocked') ||
    body.includes('blocked_why_headline');
  
  const isBlock = (status === 403 || status === 1020 || status === 1015) && isCloudflareSignature;
  
  if (!isBlock) {
    return { 
      isCloudflareBlock: false, 
      errorCode: `HTTP_${status}`,
      bodySnippet: body.substring(0, 300) 
    };
  }
  
  // Extraire Ray ID depuis le HTML Cloudflare
  const rayIdMatch = body.match(/Ray ID[:\s]*<strong[^>]*>([a-f0-9]+)<\/strong>/i) 
                  || body.match(/Cloudflare Ray ID[:\s]*([a-f0-9]+)/i)
                  || body.match(/ray[_-]?id[:\s"']*([a-f0-9]+)/i);
  
  // Extraire IP bloquée depuis le HTML Cloudflare
  const ipMatch = body.match(/id="cf-footer-ip">([^<]+)</i)
               || body.match(/Your IP[:\s]*([0-9a-f.:]+)/i);
  
  return {
    isCloudflareBlock: true,
    rayId: rayIdMatch?.[1],
    blockedIp: ipMatch?.[1]?.trim(),
    errorCode: `CLOUDFLARE_${status}`,
    bodySnippet: body.substring(0, 500)
  };
}

/**
 * Formate une erreur Cloudflare pour le logging
 */
export function formatCloudflareError(info: CloudflareBlockInfo, endpoint: string): string {
  if (!info.isCloudflareBlock) {
    return `[BREVO_ERROR] endpoint=${endpoint} code=${info.errorCode} body=${info.bodySnippet.substring(0, 200)}`;
  }
  
  return `[CLOUDFLARE_BLOCK] ` +
    `endpoint=${endpoint} ` +
    `rayId=${info.rayId || 'unknown'} ` +
    `blockedIp=${info.blockedIp || 'unknown'} ` +
    `code=${info.errorCode} ` +
    `action=CONTACT_BREVO_SUPPORT`;
}

/**
 * Crée un message d'erreur utilisateur-friendly pour les blocages Cloudflare
 */
export function getCloudflareUserMessage(info: CloudflareBlockInfo): string {
  if (!info.isCloudflareBlock) {
    return 'Erreur de communication avec le service SMS';
  }
  
  return `Service SMS temporairement indisponible (Cloudflare block). Ray ID: ${info.rayId || 'unknown'}`;
}
