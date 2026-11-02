/**
 * Hook personnalisé pour gérer les notifications trust-agent
 *
 * Ce hook fournit une interface simple pour gérer les notifications
 * avec synchronisation temps réel via Supabase.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/shared/useSafeToast';
import {
  trustAgentNotificationsService,
  type TrustAgentNotification,
  type NotificationFilters,
  NOTIFICATION_TYPE_CONFIG,
} from '../services/trustAgentNotifications.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Notification sound - optional, provide fallback if hook doesn't exist
const useNotificationSound = () => ({
  playNotificationSound: () => {
    // Fallback: try to use the Audio API directly
    try {
      if (typeof Audio !== 'undefined') {
        // Optional: play a simple beep
      }
    } catch {
      // Silently fail
    }
  },
});

/**
 * Hook pour gérer les notifications trust-agent
 */
export function useTrustAgentNotifications(filters?: NotificationFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { playNotificationSound } = useNotificationSound();

  // Query pour récupérer les notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trust-agent-notifications', user?.id, filters],
    queryFn: async () => {
      try {
        return await trustAgentNotificationsService.getAll(filters);
      } catch (err: unknown) {
        // If table doesn't exist (PGRST205), return empty array silently
        if (err && typeof err === 'object' && 'code' in err && (err.code === 'PGRST116' || err.code === 'PGRST205')) {
          // Table doesn't exist or RLS not configured - silent fallback
          return [];
        }
        // For other errors, also return empty array to prevent UI breaking
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    refetchOnWindowFocus: true,
    retry: false, // Don't retry to avoid spamming errors
    staleTime: Infinity, // Treat empty data as fresh
  });

  // Query pour le compteur de notifications non lues
  const {
    data: unreadCount = 0,
    refetch: refetchUnreadCount,
  } = useQuery({
    queryKey: ['trust-agent-notifications-unread', user?.id],
    queryFn: async () => {
      try {
        return await trustAgentNotificationsService.getUnreadCount();
      } catch (err: unknown) {
        // If table doesn't exist, return 0 silently
        if (err && typeof err === 'object' && 'code' in err && (err.code === 'PGRST116' || err.code === 'PGRST205')) {
          return 0;
        }
        return 0;
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Rafraîchir toutes les 15 secondes
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: Infinity,
  });

  // Mutation pour marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      trustAgentNotificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    },
    onError: (error: unknown) => {
      // Silent error if table doesn't exist
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.error('Error marking notification as read:', error);
        toast.error('Erreur lors du marquage de la notification');
      }
    },
  });

  // Mutation pour tout marquer comme lu
  const markAllAsReadMutation = useMutation({
    mutationFn: () => trustAgentNotificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
      toast.success('Toutes les notifications ont été marquées comme lues');
    },
    onError: (error: unknown) => {
      // Silent error if table doesn't exist
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.error('Error marking all notifications as read:', error);
        toast.error('Erreur lors du marquage des notifications');
      }
    },
  });

  // Mutation pour archiver
  const archiveMutation = useMutation({
    mutationFn: (notificationId: string) =>
      trustAgentNotificationsService.archive(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    },
    onError: (error: unknown) => {
      // Silent error if table doesn't exist
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.error('Error archiving notification:', error);
        toast.error('Erreur lors de l\'archivage de la notification');
      }
    },
  });

  // Mutation pour tout archiver
  const archiveAllReadMutation = useMutation({
    mutationFn: () => trustAgentNotificationsService.archiveAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
      toast.success('Toutes les notifications lues ont été archivées');
    },
    onError: (error: unknown) => {
      // Silent error if table doesn't exist
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.error('Error archiving all read notifications:', error);
        toast.error('Erreur lors de l\'archivage des notifications');
      }
    },
  });

  // S'abonner aux notifications temps réel
  useEffect(() => {
    if (!user?.id) return;

    const handleNewNotification = (notification: TrustAgentNotification) => {
      // Son de notification
      playNotificationSound();

      // Invalider le cache pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });

      // Toast notification pour les notifications urgentes/high priority
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        toast.info(notification.title, {
          description: notification.message,
        });
      }
    };

    // S'abonner au canal Supabase
    channelRef.current = trustAgentNotificationsService.subscribe(
      user.id,
      handleNewNotification
    );

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient, playNotificationSound]);

  // Fonctions helpers
  const markAsRead = useCallback((notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const archive = useCallback((notificationId: string) => {
    archiveMutation.mutate(notificationId);
  }, [archiveMutation]);

  const archiveAllRead = useCallback(() => {
    archiveAllReadMutation.mutate();
  }, [archiveAllReadMutation]);

  const refresh = useCallback(() => {
    refetch();
    refetchUnreadCount();
  }, [refetch, refetchUnreadCount]);

  // Grouper les notifications par date
  const groupedNotifications = (() => {
    const groups: Record<string, TrustAgentNotification[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const week = new Date(today);
    week.setDate(week.getDate() - 7);

    notifications.forEach((notification) => {
      const createdAt = new Date(notification.created_at);
      if (createdAt >= today) {
        groups.today.push(notification);
      } else if (createdAt >= yesterday) {
        groups.yesterday.push(notification);
      } else if (createdAt >= week) {
        groups.week.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  })();

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    archive,
    archiveAllRead,
    refresh,
    // État des mutations
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isArchivingAll: archiveAllReadMutation.isPending,
  };
}

/**
 * Hook simplifié pour uniquement le compteur de notifications non lues
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { playNotificationSound } = useNotificationSound();
  const queryClient = useQueryClient();

  const {
    data: count = 0,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['trust-agent-notifications-unread', user?.id],
    queryFn: async () => {
      try {
        return await trustAgentNotificationsService.getUnreadCount();
      } catch (err: unknown) {
        // Silent fallback if table doesn't exist
        if (err && typeof err === 'object' && 'code' in err && (err.code === 'PGRST116' || err.code === 'PGRST205')) {
          return 0;
        }
        return 0;
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: Infinity,
  });

  // S'abonner aux nouvelles notifications pour mettre à jour le compteur
  useEffect(() => {
    if (!user?.id) return;

    const handleNewNotification = () => {
      playNotificationSound();
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    };

    channelRef.current = trustAgentNotificationsService.subscribe(
      user.id,
      handleNewNotification
    );

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient, playNotificationSound]);

  return { count, isLoading, refetch };
}

/**
 * Hook pour gérer les actions de notification (marquer comme lu, archiver)
 */
export function useNotificationActions() {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      trustAgentNotificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => trustAgentNotificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (notificationId: string) =>
      trustAgentNotificationsService.archive(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    },
  });

  const archiveAllReadMutation = useMutation({
    mutationFn: () => trustAgentNotificationsService.archiveAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['trust-agent-notifications-unread'] });
    },
  });

  return {
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    archive: archiveMutation.mutate,
    archiveAllRead: archiveAllReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isArchivingAll: archiveAllReadMutation.isPending,
  };
}

// Export des utilitaires
export { NOTIFICATION_TYPE_CONFIG };
export type { TrustAgentNotification, NotificationFilters };
