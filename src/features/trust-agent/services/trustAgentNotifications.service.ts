/**
 * Service de notifications pour l'agent de confiance (trust-agent)
 *
 * Ce service gère les notifications des agents de confiance avec support temps réel via Supabase.
 */

import { supabase } from '@/integrations/supabase/client';
import { requireRole } from '@/shared/services/roleValidation.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Types de notifications pour les agents de confiance
 */
export type TrustAgentNotificationType =
  | 'new_mission' // Nouvelle mission assignée
  | 'mission_update' // Mise à jour de mission
  | 'new_dispute' // Nouveau litige
  | 'dispute_update' // Mise à jour de litige
  | 'new_dossier' // Nouveau dossier à valider
  | 'dossier_approved' // Dossier approuvé
  | 'property_certified'; // Propriété certifiée

/**
 * Priorité de notification
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Interface d'une notification
 */
export interface TrustAgentNotification {
  id: string;
  user_id: string;
  type: TrustAgentNotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  entity_type?: 'mission' | 'dispute' | 'dossier' | 'property';
  entity_id?: string;
}

/**
 * Filtres pour les notifications
 */
export interface NotificationFilters {
  type?: TrustAgentNotificationType | 'all';
  read?: boolean | 'all';
  date_from?: string;
  date_to?: string;
}

/**
 * Configuration des types de notifications
 */
export const NOTIFICATION_TYPE_CONFIG: Record<TrustAgentNotificationType, {
  label: string;
  icon: string;
  defaultPriority: NotificationPriority;
  color: string;
}> = {
  new_mission: {
    label: 'Nouvelle mission',
    icon: 'briefcase',
    defaultPriority: 'high',
    color: 'bg-blue-100 text-blue-700',
  },
  mission_update: {
    label: 'Mise à jour de mission',
    icon: 'refresh-cw',
    defaultPriority: 'medium',
    color: 'bg-purple-100 text-purple-700',
  },
  new_dispute: {
    label: 'Nouveau litige',
    icon: 'alert-triangle',
    defaultPriority: 'urgent',
    color: 'bg-red-100 text-red-700',
  },
  dispute_update: {
    label: 'Mise à jour de litige',
    icon: 'scale',
    defaultPriority: 'high',
    color: 'bg-orange-100 text-orange-700',
  },
  new_dossier: {
    label: 'Nouveau dossier',
    icon: 'file-text',
    defaultPriority: 'high',
    color: 'bg-yellow-100 text-yellow-700',
  },
  dossier_approved: {
    label: 'Dossier approuvé',
    icon: 'check-circle',
    defaultPriority: 'medium',
    color: 'bg-green-100 text-green-700',
  },
  property_certified: {
    label: 'Propriété certifiée',
    icon: 'home',
    defaultPriority: 'medium',
    color: 'bg-teal-100 text-teal-700',
  },
};

/**
 * Crée une nouvelle notification pour un agent de confiance
 */
export const createTrustAgentNotification = async (
  userId: string,
  type: TrustAgentNotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
  priority?: NotificationPriority
): Promise<TrustAgentNotification> => {
  await requireRole(['trust_agent', 'admin'])();

  const config = NOTIFICATION_TYPE_CONFIG[type];

  const { data: notification, error } = await supabase
    .from('trust_agent_notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      priority: priority || config.defaultPriority,
      data: data || null,
      entity_type: data?.entity_type as string | null,
      entity_id: data?.entity_id as string | null,
    })
    .select()
    .single();

  if (error) throw error;
  return notification as TrustAgentNotification;
};

/**
 * Récupère les notifications de l'utilisateur connecté
 */
export const getTrustAgentNotifications = async (
  filters?: NotificationFilters,
  limit = 50
): Promise<TrustAgentNotification[]> => {
  await requireRole(['trust_agent'])();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  let query = supabase
    .from('trust_agent_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Appliquer les filtres
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }

  if (filters?.read !== undefined && filters.read !== 'all') {
    if (filters.read === true) {
      query = query.not('read_at', 'is', null);
    } else {
      query = query.is('read_at', null);
    }
  }

  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;

  if (error?.code === 'PGRST204' || error?.code === 'PGRST116') {
    // Table doesn't exist yet, return empty array
    return [];
  }

  if (error) throw error;
  return (data || []) as TrustAgentNotification[];
};

/**
 * Marque une notification comme lue
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await requireRole(['trust_agent'])();

  const { error } = await supabase
    .from('trust_agent_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error?.code !== 'PGRST204' && error?.code !== 'PGRST116' && error) {
    throw error;
  }
};

/**
 * Marque toutes les notifications comme lues
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await requireRole(['trust_agent'])();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  const { error } = await supabase
    .from('trust_agent_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error?.code !== 'PGRST204' && error?.code !== 'PGRST116' && error) {
    throw error;
  }
};

/**
 * Archive (supprime) une notification
 */
export const archiveNotification = async (notificationId: string): Promise<void> => {
  await requireRole(['trust_agent'])();

  const { error } = await supabase
    .from('trust_agent_notifications')
    .delete()
    .eq('id', notificationId);

  if (error?.code !== 'PGRST204' && error?.code !== 'PGRST116' && error) {
    throw error;
  }
};

/**
 * Archive toutes les notifications lues
 */
export const archiveAllReadNotifications = async (): Promise<void> => {
  await requireRole(['trust_agent'])();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  const { error } = await supabase
    .from('trust_agent_notifications')
    .delete()
    .eq('user_id', user.id)
    .not('read_at', 'is', null);

  if (error?.code !== 'PGRST204' && error?.code !== 'PGRST116' && error) {
    throw error;
  }
};

/**
 * Compte les notifications non lues
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  await requireRole(['trust_agent'])();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('trust_agent_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error?.code === 'PGRST204' || error?.code === 'PGRST116') {
    return 0;
  }

  if (error) throw error;
  return data || 0;
};

/**
 * Callback pour les notifications temps réel
 */
export type NotificationCallback = (notification: TrustAgentNotification) => void;

/**
 * S'abonne aux notifications en temps réel
 * @returns La fonction de désabonnement
 */
export const subscribeToNotifications = (
  userId: string,
  onNewNotification: NotificationCallback
): RealtimeChannel => {
  const channel = supabase
    .channel(`trust-agent-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trust_agent_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new as TrustAgentNotification);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Helper pour créer les notifications automatiquement basées sur les événements
 */
export const createMissionNotification = async (
  agentId: string,
  missionType: 'assigned' | 'updated',
  missionId: string,
  missionTitle: string
): Promise<void> => {
  const type = missionType === 'assigned' ? 'new_mission' : 'mission_update';
  const title = missionType === 'assigned'
    ? 'Nouvelle mission assignée'
    : 'Mission mise à jour';

  await createTrustAgentNotification(
    agentId,
    type,
    title,
    `La mission "${missionTitle}" vous a été ${missionType === 'assigned' ? 'assignée' : 'mise à jour'}.`,
    {
      entity_type: 'mission',
      entity_id: missionId,
    }
  );
};

export const createDisputeNotification = async (
  agentId: string,
  disputeType: 'assigned' | 'updated',
  disputeId: string,
  disputeTitle: string
): Promise<void> => {
  const type = disputeType === 'assigned' ? 'new_dispute' : 'dispute_update';
  const title = disputeType === 'assigned'
    ? 'Nouveau litige à traiter'
    : 'Litige mis à jour';

  await createTrustAgentNotification(
    agentId,
    type,
    title,
    `Le litige "${disputeTitle}" vous a été ${disputeType === 'assigned' ? 'assigné' : 'mis à jour'}.`,
    {
      entity_type: 'dispute',
      entity_id: disputeId,
    }
  );
};

export const createDossierNotification = async (
  agentId: string,
  dossierType: 'pending' | 'approved',
  dossierId: string,
  dossierTitle: string
): Promise<void> => {
  const type = dossierType === 'pending' ? 'new_dossier' : 'dossier_approved';
  const title = dossierType === 'pending'
    ? 'Nouveau dossier à valider'
    : 'Dossier approuvé';

  await createTrustAgentNotification(
    agentId,
    type,
    title,
    `Le dossier "${dossierTitle}" est ${dossierType === 'pending' ? 'en attente de validation' : 'approuvé'}.`,
    {
      entity_type: 'dossier',
      entity_id: dossierId,
    }
  );
};

export const createPropertyCertifiedNotification = async (
  agentId: string,
  propertyId: string,
  propertyTitle: string
): Promise<void> => {
  await createTrustAgentNotification(
    agentId,
    'property_certified',
    'Propriété certifiée ANSUT',
    `La propriété "${propertyTitle}" a été certifiée conforme aux normes ANSUT.`,
    {
      entity_type: 'property',
      entity_id: propertyId,
    }
  );
};

/**
 * Service complet de notifications trust-agent
 */
export const trustAgentNotificationsService = {
  create: createTrustAgentNotification,
  getAll: getTrustAgentNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  archive: archiveNotification,
  archiveAllRead: archiveAllReadNotifications,
  getUnreadCount: getUnreadNotificationCount,
  subscribe: subscribeToNotifications,
  // Helpers
  createMission: createMissionNotification,
  createDispute: createDisputeNotification,
  createDossier: createDossierNotification,
  createPropertyCertified: createPropertyCertifiedNotification,
};
