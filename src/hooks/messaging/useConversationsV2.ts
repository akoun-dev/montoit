import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  messagingService,
  Conversation,
} from '../../features/messaging/services/messaging.service';
import { useAuth } from '../../contexts';
import { supabase } from '../../lib';

/**
 * Enhanced hook for managing conversations with TanStack Query
 */
export function useConversationsV2() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching conversations
  const {
    data: conversations = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return messagingService.getConversations(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Mutation for creating or getting a conversation
  const getOrCreateConversationMutation = useMutation({
    mutationFn: async ({
      otherUserId,
      propertyId,
      subject,
    }: {
      otherUserId: string;
      propertyId?: string | null;
      subject?: string | null;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }
      return messagingService.getOrCreateConversation(user.id, otherUserId, propertyId, subject);
    },
    onSuccess: () => {
      // Invalidate conversations query
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Subscribe to realtime conversation updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = messagingService.subscribeToConversations(() => {
      // Refetch conversations when there's an update
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const getOrCreateConversation = useCallback(
    async (otherUserId: string, propertyId?: string | null, subject?: string | null) => {
      return getOrCreateConversationMutation.mutateAsync({ otherUserId, propertyId, subject });
    },
    [getOrCreateConversationMutation]
  );

  return {
    conversations,
    loading,
    isError,
    error,
    refetch,
    getOrCreateConversation,
  };
}

// Re-export for backward compatibility
export { useConversationsV2 as useConversations };
