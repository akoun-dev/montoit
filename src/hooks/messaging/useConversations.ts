import { useState, useEffect, useCallback } from 'react';
import {
  messagingService,
  Conversation,
} from '../../features/messaging/services/messaging.service';
import { useAuth } from '../../contexts';
import { supabase } from '../../lib';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await messagingService.getConversations(user.id);
      setConversations(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = messagingService.subscribeToConversations(user.id, fetchConversations);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversations]);

  const getOrCreateConversation = useCallback(
    async (otherUserId: string, propertyId?: string | null, subject?: string | null) => {
      if (!user?.id) return null;
      return messagingService.getOrCreateConversation(user.id, otherUserId, propertyId, subject);
    },
    [user?.id]
  );

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    getOrCreateConversation,
  };
}
