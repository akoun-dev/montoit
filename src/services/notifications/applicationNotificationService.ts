import { supabase } from '@/integrations/supabase/client';

/**
 * Types de notifications pour les candidatures
 */
export type ApplicationNotificationType =
  | 'application_received'
  | 'application_viewed'
  | 'application_accepted'
  | 'application_rejected'
  | 'visit_scheduled'
  | 'documents_requested';

interface NotificationPayload {
  applicationId: string;
  type: ApplicationNotificationType;
  recipientId?: string;
  reason?: string;
  visitDate?: string;
  documents?: string[];
}

/**
 * Fonction interne pour envoyer une notification via l'edge function
 */
async function sendApplicationNotification(payload: NotificationPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-application-notifications', {
    body: payload,
  });

  if (error) {
    console.error('[applicationNotificationService] Error sending notification:', error);
    throw error;
  }
}

/**
 * Notifier le propriétaire qu'une nouvelle candidature a été reçue
 * @param applicationId ID de la candidature
 */
export async function notifyApplicationReceived(applicationId: string): Promise<void> {
  return sendApplicationNotification({
    applicationId,
    type: 'application_received',
  });
}

/**
 * Notifier le candidat que sa candidature a été consultée
 * @param applicationId ID de la candidature
 */
export async function notifyApplicationViewed(applicationId: string): Promise<void> {
  return sendApplicationNotification({
    applicationId,
    type: 'application_viewed',
  });
}

/**
 * Notifier le candidat que sa candidature a été acceptée
 * @param applicationId ID de la candidature
 */
export async function notifyApplicationAccepted(applicationId: string): Promise<void> {
  return sendApplicationNotification({
    applicationId,
    type: 'application_accepted',
  });
}

/**
 * Notifier le candidat que sa candidature a été refusée
 * @param applicationId ID de la candidature
 * @param reason Raison du refus (optionnel)
 */
export async function notifyApplicationRejected(
  applicationId: string,
  reason?: string
): Promise<void> {
  return sendApplicationNotification({
    applicationId,
    type: 'application_rejected',
    reason,
  });
}

/**
 * Notifier le candidat qu'une visite a été planifiée
 * @param applicationId ID de la candidature
 * @param visitDate Date et heure de la visite formatée
 */
export async function notifyVisitScheduled(
  applicationId: string,
  visitDate: string
): Promise<void> {
  return sendApplicationNotification({
    applicationId,
    type: 'visit_scheduled',
    visitDate,
  });
}

/**
 * Notifier le candidat que des documents supplémentaires sont requis
 * @param applicationId ID de la candidature
 * @param documents Liste des documents demandés
 */
export async function notifyDocumentsRequested(
  applicationId: string,
  documents: string[]
): Promise<void> {
  return sendApplicationNotification({
    applicationId,
    type: 'documents_requested',
    documents,
  });
}

export default {
  notifyApplicationReceived,
  notifyApplicationViewed,
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyVisitScheduled,
  notifyDocumentsRequested,
};
