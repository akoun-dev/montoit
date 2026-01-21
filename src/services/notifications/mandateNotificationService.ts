import { supabase } from '@/integrations/supabase/client';

/**
 * Types de notifications pour les mandats agence
 */
export type MandateNotificationType =
  | 'mandate_created'
  | 'mandate_accepted'
  | 'mandate_refused'
  | 'mandate_suspended'
  | 'mandate_reactivated'
  | 'mandate_terminated'
  | 'mandate_permissions_updated';

interface NotificationPayload {
  mandateId: string;
  type: MandateNotificationType;
  reason?: string;
  terminatedBy?: 'owner' | 'agency';
}

/**
 * Fonction interne pour envoyer une notification via l'edge function
 */
async function sendMandateNotification(payload: NotificationPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: payload,
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending notification:', error);
    }
  } catch (err) {
    console.error('[mandateNotificationService] Failed to send notification:', err);
  }
}

/**
 * Notifier l'agence qu'un propriétaire l'invite à gérer un bien
 */
export async function notifyMandateCreated(mandateId: string): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_created',
  });
}

/**
 * Notifier le propriétaire que l'agence a accepté le mandat
 */
export async function notifyMandateAccepted(mandateId: string): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_accepted',
  });
}

/**
 * Notifier le propriétaire que l'agence a refusé le mandat
 */
export async function notifyMandateRefused(mandateId: string, reason?: string): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_refused',
    reason,
  });
}

/**
 * Notifier le propriétaire que le mandat a été suspendu
 */
export async function notifyMandateSuspended(mandateId: string, reason?: string): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_suspended',
    reason,
  });
}

/**
 * Notifier le propriétaire que le mandat a été réactivé
 */
export async function notifyMandateReactivated(mandateId: string): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_reactivated',
  });
}

/**
 * Notifier les deux parties que le mandat a été résilié
 */
export async function notifyMandateTerminated(
  mandateId: string,
  terminatedBy: 'owner' | 'agency',
  reason?: string
): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_terminated',
    terminatedBy,
    reason,
  });
}

/**
 * Notifier l'agence que les permissions du mandat ont été modifiées
 */
export async function notifyMandatePermissionsUpdated(mandateId: string): Promise<void> {
  return sendMandateNotification({
    mandateId,
    type: 'mandate_permissions_updated',
  });
}

export default {
  notifyMandateCreated,
  notifyMandateAccepted,
  notifyMandateRefused,
  notifyMandateSuspended,
  notifyMandateReactivated,
  notifyMandateTerminated,
  notifyMandatePermissionsUpdated,
};
