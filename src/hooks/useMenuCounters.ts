import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';

export interface MenuCounters {
  unreadMessages: number;
  unreadNotifications: number;
  pendingApplications: number;
  pendingVisits: number;
}

export function useMenuCounters() {
  const { user, profile } = useAuth();
  const [counters, setCounters] = useState<MenuCounters>({
    unreadMessages: 0,
    unreadNotifications: 0,
    pendingApplications: 0,
    pendingVisits: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadCounters = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userType = profile?.user_type;
      const userId = user.id;

      // Load all counters in parallel
      const [
        unreadMessagesResult,
        unreadNotificationsResult,
        pendingVisitsResult,
        pendingApplicationsResult,
      ] = await Promise.allSettled([
        // Unread messages (from conversations)
        supabase
          .from('conversations')
          .select('unread_count_participant1, unread_count_participant2, participant1_id, participant2_id')
          .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`),

        // Unread notifications
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false)
          .eq('is_archived', false),

        // Pending visits
        supabase
          .from('visit_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending'])
          .gt('visit_date', new Date().toISOString().split('T')[0]),

        // Pending applications (for owners and agencies)
        userType === 'owner' || userType === 'proprietaire' || userType === 'agency'
          ? supabase
              .from('rental_applications')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          : Promise.resolve({ count: 0, error: null }),
      ]);

      // Process unread messages
      let unreadMessages = 0;
      if (unreadMessagesResult.status === 'fulfilled' && !unreadMessagesResult.value.error) {
        const conversations = unreadMessagesResult.value.data || [];
        unreadMessages = conversations.reduce((sum, conv) => {
          if (conv.participant1_id === userId) {
            return sum + (conv.unread_count_participant1 || 0);
          } else {
            return sum + (conv.unread_count_participant2 || 0);
          }
        }, 0);
      }

      // Process unread notifications
      let unreadNotifications = 0;
      if (unreadNotificationsResult.status === 'fulfilled' && !unreadNotificationsResult.value.error) {
        unreadNotifications = unreadNotificationsResult.value.count || 0;
      }

      // Process pending visits (different logic based on user type)
      let pendingVisits = 0;
      if (pendingVisitsResult.status === 'fulfilled' && !pendingVisitsResult.value.error) {
        const visits = pendingVisitsResult.value.data || [];

        if (userType === 'tenant' || userType === 'locataire') {
          // For tenants: count their pending visits
          pendingVisits = visits.filter((v) => v.tenant_id === userId).length;
        } else if (userType === 'owner' || userType === 'proprietaire' || userType === 'agency') {
          // For owners/agencies: count pending visits for their properties
          pendingVisits = visits.filter((v) => v.owner_id === userId).length;
        }
      }

      // Process pending applications
      let pendingApplications = 0;
      if (pendingApplicationsResult.status === 'fulfilled' && !pendingApplicationsResult.value.error) {
        pendingApplications = pendingApplicationsResult.value.count || 0;
      }

      setCounters({
        unreadMessages,
        unreadNotifications,
        pendingApplications,
        pendingVisits,
      });
    } catch (error) {
      console.error('Error loading menu counters:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.user_type]);

  useEffect(() => {
    if (user) {
      loadCounters();

      // Set up real-time subscriptions
      const channels = [
        // Notifications
        supabase
          .channel('notifications-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => loadCounters()
          )
          .subscribe(),

        // Messages/Conversations
        supabase
          .channel('conversations-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'conversations',
              filter: `participant1_id=eq.${user.id}|participant2_id=eq.${user.id}`,
            },
            () => loadCounters()
          )
          .subscribe(),

        // Visit requests
        supabase
          .channel('visit-requests-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'visit_requests',
            },
            () => loadCounters()
          )
          .subscribe(),

        // Rental applications (for owners and agencies)
        supabase
          .channel('applications-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rental_applications',
            },
            () => loadCounters()
          )
          .subscribe(),
      ];

      return () => {
        channels.forEach((channel) => supabase.removeChannel(channel));
      };
    }
  }, [user, profile?.user_type, loadCounters]);

  return { counters, loading, refresh: loadCounters };
}
