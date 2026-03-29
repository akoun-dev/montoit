/**
 * Service de notifications pour les mandats de gestion
 *
 * Utilise l'Edge Function send-mandate-notifications pour envoyer les notifications
 * car les notifications système doivent utiliser service_role pour éviter les problèmes RLS
 */

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
  | 'mandate_permissions_updated'
  | 'mandate_signed';

/**
 * Notifier l'agence qu'un propriétaire l'invite à gérer un bien
 */
export async function notifyMandateCreated(mandateId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_created' },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending created notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending created notification:', error);
  }
}

/**
 * Notifier le propriétaire que l'agence a accepté le mandat
 */
export async function notifyMandateAccepted(mandateId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_accepted' },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending accepted notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending accepted notification:', error);
  }
}

/**
 * Notifier le propriétaire que l'agence a refusé le mandat
 */
export async function notifyMandateRefused(mandateId: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_refused', reason },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending refused notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending refused notification:', error);
  }
}

/**
 * Notifier le propriétaire que le mandat a été suspendu
 */
export async function notifyMandateSuspended(mandateId: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_suspended', reason },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending suspended notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending suspended notification:', error);
  }
}

/**
 * Notifier le propriétaire que le mandat a été réactivé
 */
export async function notifyMandateReactivated(mandateId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_reactivated' },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending reactivated notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending reactivated notification:', error);
  }
}

/**
 * Notifier les deux parties que le mandat a été résilié
 */
export async function notifyMandateTerminated(
  mandateId: string,
  terminatedBy: 'owner' | 'agency',
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_terminated', terminatedBy, reason },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending terminated notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending terminated notification:', error);
  }
}

/**
 * Notifier l'agence que les permissions du mandat ont été modifiées
 */
export async function notifyMandatePermissionsUpdated(mandateId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_permissions_updated' },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending permissions updated notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending permissions updated notification:', error);
  }
}

/**
 * Notifier qu'une signature a été enregistrée
 */
export async function notifyMandateSigned(mandateId: string, signerType: 'owner' | 'agency'): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-mandate-notifications', {
      body: { mandateId, type: 'mandate_signed', signerType },
    });

    if (error) {
      console.error('[mandateNotificationService] Error sending signed notification:', error);
    }
  } catch (error) {
    console.error('[mandateNotificationService] Error sending signed notification:', error);
  }
}

export default {
  notifyMandateCreated,
  notifyMandateAccepted,
  notifyMandateRefused,
  notifyMandateSuspended,
  notifyMandateReactivated,
  notifyMandateTerminated,
  notifyMandatePermissionsUpdated,
  notifyMandateSigned,
};
