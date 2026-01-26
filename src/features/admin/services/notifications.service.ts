/**
 * Service de notifications admin
 *
 * Gère la création et la gestion des notifications pour les administrateurs
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Types de notifications admin
 */
export type AdminNotificationType =
  | 'new_user'
  | 'document_pending'
  | 'document_fraud'
  | 'service_down'
  | 'quota_exceeded'
  | 'security_alert'
  | 'dispute_created'
  | 'payment_failed'
  | 'system_error'
  | 'feature_flag_change';

export interface AdminNotification {
  id: string;
  admin_id: string;
  type: AdminNotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Service de notifications admin
 */
export const adminNotificationsService = {
  /**
   * Récupérer les notifications de l'admin connecté
   */
  async getNotifications(unreadOnly = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return (data || []) as AdminNotification[];
  },

  /**
   * Compter les notifications non lues
   */
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('get_unread_notifications_count', {
      p_admin_id: user.id,
    });

    if (error) throw error;
    return (data as number) || 0;
  },

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
      p_admin_id: user.id,
    });

    if (error) throw error;
    return (data as boolean) || false;
  },

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_admin_id: user.id,
    });

    if (error) throw error;
    return (data as number) || 0;
  },

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('admin_id', user.id);

    if (error) throw error;
  },

  /**
   * S'abonner aux notifications en temps réel
   */
  subscribeToNotifications(
    callback: (notification: AdminNotification) => void
  ) {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const notification = payload.new as AdminNotification;
          callback(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

/**
 * Helpers pour créer des notifications spécifiques
 */
export const notificationHelpers = {
  /**
   * Notifier tous les admins d'un nouvel utilisateur
   */
  async notifyNewUser(userId: string, userName: string) {
    const { error } = await supabase.rpc('notify_all_admins', {
      p_type: 'new_user',
      p_title: 'Nouvel utilisateur inscrit',
      p_message: `${userName} vient de s'inscrire et nécessite une vérification`,
      p_data: { user_id: userId },
      p_link: `/admin/utilisateurs/${userId}`,
    });

    if (error) console.error('[Notifications] Failed to notify new user:', error);
  },

  /**
   * Notifier d'un service down
   */
  async notifyServiceDown(serviceName: string, errorMessage?: string) {
    const { error } = await supabase.rpc('notify_all_admins', {
      p_type: 'service_down',
      p_title: `Service interrompu: ${serviceName}`,
      p_message: errorMessage || 'Le service est temporairement indisponible',
      p_data: { service_name: serviceName, error: errorMessage },
      p_link: '/admin/service-monitoring',
    });

    if (error) console.error('[Notifications] Failed to notify service down:', error);
  },

  /**
   * Notifier d'une alerte sécurité
   */
  async notifySecurityAlert(message: string, data?: Record<string, unknown>) {
    const { error } = await supabase.rpc('notify_all_admins', {
      p_type: 'security_alert',
      p_title: 'Alerte sécurité',
      p_message: message,
      p_data: data || {},
      p_link: '/admin/logs?level=error',
    });

    if (error) console.error('[Notifications] Failed to notify security alert:', error);
  },

  /**
   * Notifier d'un quota dépassé
   */
  async notifyQuotaExceeded(resource: string, limit: number, current: number) {
    const { error } = await supabase.rpc('notify_all_admins', {
      p_type: 'quota_exceeded',
      p_title: `Quota dépassé: ${resource}`,
      p_message: `La limite de ${limit} a été dépassée (${current} utilisations)`,
      p_data: { resource, limit, current },
      p_link: '/admin/service-monitoring',
    });

    if (error) console.error('[Notifications] Failed to notify quota exceeded:', error);
  },
};

export default adminNotificationsService;
