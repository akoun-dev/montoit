/**
 * Hook personnalisé pour les notifications admin
 *
 * Gère l'état des notifications en temps réel
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminNotificationsService,
  type AdminNotification,
} from '@/features/admin/services/notifications.service';

export function useAdminNotifications() {
  const queryClient = useQueryClient();

  // Query pour les notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminNotificationsService.getNotifications(),
    staleTime: 30 * 1000, // 30 secondes
  });

  // Query pour le compteur de non lues
  const { data: unreadCountData } = useQuery({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: () => adminNotificationsService.getUnreadCount(),
    staleTime: 10 * 1000, // 10 secondes
  });

  // Mettre à jour le compteur quand les données changent

  // Marquer comme lu
  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await adminNotificationsService.markAsRead(notificationId);
    if (success) {
      // Invalider le cache
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    }
    return success;
  }, [queryClient]);

  // Marquer toutes comme lues
  const markAllAsRead = useCallback(async () => {
    const count = await adminNotificationsService.markAllAsRead();
    // Invalider le cache
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    return count;
  }, [queryClient]);

  // Supprimer une notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    await adminNotificationsService.deleteNotification(notificationId);
    // Invalider le cache
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
  }, [queryClient]);

  // S'abonner aux notifications en temps réel
  useEffect(() => {
    const unsubscribe = adminNotificationsService.subscribeToNotifications((notification) => {
      // Nouvelle notification reçue
      queryClient.setQueryData(['admin', 'notifications'], (old: AdminNotification[] = []) => {
        return [notification, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return {
    notifications,
    unreadCount: unreadCountData ?? 0,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export default useAdminNotifications;
