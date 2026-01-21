/**
 * Utilitaires de vérification HMAC-SHA256 pour les webhooks
 * Module partagé pour sécuriser tous les endpoints de webhook
 */

/**
 * Vérifie une signature HMAC-SHA256
 * @param payload - Le corps brut de la requête
 * @param signature - La signature fournie dans le header
 * @param secret - Le secret partagé pour la vérification
 * @returns true si la signature est valide
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Import la clé secrète pour HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Calcule la signature attendue
    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    // Convertit en hexadécimal
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Compare de manière sécurisée (timing-safe)
    return timingSafeEqual(
      signature.toLowerCase().replace(/^sha256=/, ''), 
      expectedHex.toLowerCase()
    );
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Comparaison timing-safe pour éviter les attaques temporelles
 * @param a - Première chaîne
 * @param b - Deuxième chaîne
 * @returns true si les chaînes sont identiques
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Pour éviter les fuites de timing sur la longueur,
    // on compare quand même mais avec un résultat toujours faux
    let result = 1;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extrait la signature d'un header de webhook
 * Supporte plusieurs formats: X-Webhook-Signature, X-InTouch-Signature, etc.
 */
export function extractSignature(req: Request): string | null {
  const signatureHeaders = [
    'X-Webhook-Signature',
    'X-InTouch-Signature', 
    'X-Hub-Signature-256',
    'X-Signature'
  ];
  
  for (const header of signatureHeaders) {
    const value = req.headers.get(header);
    if (value) {
      return value;
    }
  }
  
  return null;
}

/**
 * Type pour les logs de webhook
 */
export interface WebhookLogEntry {
  webhook_type: string;
  source_ip: string | null;
  signature_provided: string | null;
  signature_valid: boolean;
  payload: Record<string, unknown>;
  processing_result: 'success' | 'failed' | 'rejected';
  error_message: string | null;
}

/**
 * Enregistre une tentative de webhook dans les logs
 * Utilise any pour le client Supabase car les edge functions n'ont pas de types stricts
 */
// deno-lint-ignore no-explicit-any
export async function logWebhookAttempt(
  supabase: any,
  entry: WebhookLogEntry
): Promise<void> {
  try {
    const { error } = await supabase
      .from('webhook_logs')
      .insert(entry);
    
    if (error) {
      console.error('Failed to log webhook attempt:', error);
    }
  } catch (err) {
    console.error('Webhook logging error:', err);
  }
}
