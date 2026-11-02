/**
 * Service de notifications pour le workflow de bail
 * Gère l'envoi de notifications automatiques à chaque étape du contrat
 */

import { supabase } from '@/integrations/supabase/client';

export type LeaseNotificationType =
  | 'lease_created'
  | 'lease_pending_signature'
  | 'lease_signed_owner'
  | 'lease_signed_tenant'
  | 'lease_active'
  | 'lease_expiring_soon'
  | 'lease_expired'
  | 'lease_terminated'
  | 'lease_signature_reminder'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'visit_scheduled';

interface NotificationPayload {
  leaseId: string;
  type: LeaseNotificationType;
  recipientId?: string;
  daysRemaining?: number;
  signerName?: string;
}

/**
 * Appelle l'edge function pour envoyer la notification
 */
async function sendLeaseNotification(payload: NotificationPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-lease-notifications', {
      body: payload,
    });

    if (error) {
      console.error('Error sending lease notification:', error);
    }
  } catch (err) {
    console.error('Failed to send lease notification:', err);
  }
}

/**
 * Notification : Contrat créé
 * Envoyée au locataire quand le propriétaire crée un contrat
 */
export async function notifyLeaseCreated(leaseId: string): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_created',
  });
}

/**
 * Notification : Signature en attente
 * Rappel envoyé à l'utilisateur qui n'a pas encore signé
 */
export async function notifyPendingSignature(leaseId: string, targetUserId: string): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_pending_signature',
    recipientId: targetUserId,
  });
}

/**
 * Notification : Contrat signé par une partie
 * Envoyée à l'autre partie quand quelqu'un signe
 */
export async function notifyLeaseSigned(
  leaseId: string,
  signerName: string,
  isOwner: boolean
): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: isOwner ? 'lease_signed_owner' : 'lease_signed_tenant',
    signerName,
  });
}

/**
 * Notification : Bail activé
 * Envoyée aux deux parties quand toutes les signatures sont complètes
 */
export async function notifyLeaseActive(leaseId: string): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_active',
  });
}

/**
 * Notification : Expiration proche
 * Envoyée aux deux parties X jours avant expiration
 */
export async function notifyLeaseExpiringSoon(
  leaseId: string,
  daysRemaining: number
): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_expiring_soon',
    daysRemaining,
  });
}

/**
 * Notification : Bail expiré
 * Envoyée aux deux parties quand le bail expire
 */
export async function notifyLeaseExpired(leaseId: string): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_expired',
  });
}

/**
 * Notification : Bail résilié
 * Envoyée aux deux parties lors d'une résiliation
 */
export async function notifyLeaseTerminated(leaseId: string): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_terminated',
  });
}

/**
 * Notification : Rappel de signature
 * Envoyée pour rappeler la signature en attente
 */
export async function notifySignatureReminder(leaseId: string, recipientId: string): Promise<void> {
  await sendLeaseNotification({
    leaseId,
    type: 'lease_signature_reminder',
    recipientId,
  });
}
