import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  messagingService,
  Message,
  Attachment,
} from '../../features/messaging/services/messaging.service';
import { useAuth } from '../../contexts';
import { supabase } from '../../lib';
import { useNotificationSound } from './useNotificationSound';
import { toast } from '../shared/useToast';

interface UseMessagesOptions {
  initialLimit?: number;
  enabled?: boolean;
}

/**
 * Enhanced hook for managing messages with pagination and error handling
 */
export function useMessagesV2(
  conversationId: string | null,
  options: UseMessagesOptions = {}
) {
  const { user } = useAuth();
  const { playIncomingSound } = useNotificationSound();
  const queryClient = useQueryClient();

  const { initialLimit = 50, enabled = true } = options;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const allMessageIdsRef = useRef(new Set<string>());

  // Reset pagination when conversation changes
  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    allMessageIdsRef.current.clear();
  }, [conversationId]);

  // Query for fetching messages with pagination
  const {
    data: messages = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['messages', conversationId, currentPage],
    queryFn: async () => {
      if (!conversationId) return [];

      const offset = currentPage * initialLimit;
      const data = await messagingService.getMessages(conversationId, initialLimit, offset);

      // Check if there are more messages
      if (data.length < initialLimit) {
        setHasMore(false);
      }

      // Track message IDs for deduplication
      data.forEach(msg => {
        allMessageIdsRef.current.add(msg.id);
      });

      return data;
    },
    enabled: enabled && !!conversationId,
    staleTime: 0, // Always refetch for latest messages
  });

  // Mutation for sending messages with retry
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      receiverId,
      content,
      attachment,
    }: {
      receiverId: string;
      content: string;
      attachment?: Attachment | null;
    }) => {
      if (!conversationId || !user?.id) {
        throw new Error('Conversation ou utilisateur non disponible');
      }

      if (!content.trim() && !attachment) {
        throw new Error('Contenu ou pièce jointe requis');
      }

      let uploadedAttachment: Attachment | null = null;

      // Upload attachment if present
      if (attachment && (attachment as Attachment & { file?: File }).file) {
        const file = (attachment as Attachment & { file: File }).file;
        uploadedAttachment = await messagingService.uploadAttachment(file, conversationId);
      }

      return messagingService.sendMessage(
        conversationId,
        user.id,
        receiverId,
        content.trim(),
        uploadedAttachment
      );
    },
    onSuccess: (message) => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      return message;
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      // You can add toast notification here
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Mutation for marking messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user?.id) return;
      await messagingService.markAsRead(conversationId, user.id);
    },
  });

  // Load more messages (pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setCurrentPage(prev => prev + 1);
  }, [hasMore, loading]);

  // Mark as read when viewing conversation
  useEffect(() => {
    if (conversationId && user?.id) {
      markAsReadMutation.mutate();
    }
  }, [conversationId, user?.id]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = messagingService.subscribeToMessages((newMessage) => {
      // Avoid duplicates
      if (allMessageIdsRef.current.has(newMessage.id)) return;

      allMessageIdsRef.current.add(newMessage.id);

      queryClient.setQueryData(
        ['messages', conversationId, currentPage],
        (old: Message[] = []) => [...old, newMessage]
      );

      // Play sound and mark as read if we're the receiver
      if (user?.id && newMessage.receiver_id === user.id && newMessage.sender_id !== user.id) {
        playIncomingSound();
        markAsReadMutation.mutate();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(
    async (receiverId: string, content: string, attachment?: Attachment | null) => {
      return sendMessageMutation.mutateAsync({ receiverId, content, attachment });
    },
    [sendMessageMutation]
  );

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, newContent }: { messageId: string; newContent: string }) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');
      return messagingService.editMessage(messageId, newContent, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Message modifié');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de modifier le message');
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');
      return messagingService.deleteMessage(messageId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Message supprimé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de supprimer le message');
    },
  });

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      return editMessageMutation.mutateAsync({ messageId, newContent });
    },
    [editMessageMutation]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      return deleteMessageMutation.mutateAsync(messageId);
    },
    [deleteMessageMutation]
  );

  return {
    messages,
    loading,
    sending: sendMessageMutation.isPending,
    isError,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMore,
    hasMore,
    refetch,
  };
}

// Re-export for backward compatibility
export { useMessagesV2 as useMessages };
