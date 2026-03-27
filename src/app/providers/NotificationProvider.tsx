import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/services/supabase/client';
import { toast } from 'sonner';
import { useMenuCounters } from '@/hooks/useMenuCounters';

/**
 * NotificationProvider - Gère les notifications temps réel sur toute l'application
 *
 * Ce provider :
 * - Maintient les souscriptions Supabase realtime actives sur toutes les vues
 * - Affiche des toasts quand une nouvelle notification arrive
 * - Gère les notifications navigateur (browser notifications)
 * - Met à jour les compteurs globaux automatiquement
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { refresh } = useMenuCounters();
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!user) return;

    // Nettoyer les anciens canaux
    channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
    channelsRef.current = [];

    // Demander la permission pour les notifications navigateur
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }

    // Canal pour les notifications
    const notificationsChannel = supabase
      .channel('global-notifications', {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
            priority?: string;
            data?: Record<string, unknown>;
          };

          console.log('New notification received:', notification);

          // Rafraîchir les compteurs
          refresh();

          // Extraire l'action_url des données
          const data = notification.data as Record<string, unknown> | null;
          const actionUrl = data?.['action_url'] as string | undefined;

          // Afficher un toast
          toast(notification.title || 'Nouvelle notification', {
            description: notification.message?.substring(0, 100),
            duration: notification.priority === 'high' ? 10000 : 5000,
            action: actionUrl
              ? {
                  label: 'Voir',
                  onClick: () => {
                    if (actionUrl) {
                      window.location.href = actionUrl;
                    }
                  },
                }
              : undefined,
          });

          // Afficher une notification navigateur si permission accordée
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification(notification.title || 'Nouvelle notification', {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id,
                badge: '/favicon.ico',
              });

              notif.onclick = () => {
                window.focus();
                notif.close();
                if (actionUrl) {
                  window.location.href = actionUrl;
                }
              };
            } catch (err) {
              console.error('Error showing browser notification:', err);
            }
          }

          // Son de notification (optionnel)
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
              // Les navigateurs peuvent bloquer la lecture automatique
              console.log('Audio autoplay blocked');
            });
          } catch {
            // Ignorer les erreurs audio
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Rafraîchir les compteurs quand une notification est mise à jour (marquée comme lue, etc.)
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Rafraîchir les compteurs quand une notification est supprimée
          refresh();
        }
      )
      .subscribe((status) => {
        console.log('Global notifications realtime status:', status);
      });

    channelsRef.current.push(notificationsChannel);

    // Cleanup
    return () => {
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [user, refresh]);

  // Canal pour les messages (conversations)
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `participant1_id=eq.${user.id}|participant2_id=eq.${user.id}`,
        },
        async () => {
          // Rafraîchir les compteurs de messages
          refresh();
        }
      )
      .subscribe((status) => {
        console.log('Global messages realtime status:', status);
      });

    channelsRef.current.push(messagesChannel);

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, refresh]);

  return <>{children}</>;
}
