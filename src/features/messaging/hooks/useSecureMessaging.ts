/**
 * Hook de messagerie sécurisé
 *
 * Ce hook encapsule les opérations de messagerie avec validation
 * des permissions et rate limiting.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  messagingApi,
  type Conversation,
  type Message,
} from '@/features/messaging/services/messaging.api';
import { useRateLimiter } from '@/shared/services/rateLimiter.service';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase/client';

export function useSecureMessaging() {
  const { checkRateLimit } = useRateLimiter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Récupérer toutes les conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingApi.getConversations(),
    enabled: !!user,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Mutation pour envoyer un message avec rate limiting
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachment,
    }: {
      conversationId: string;
      content: string;
      attachment?: File;
    }) => {
      // Vérifier le rate limit
      const rateLimitResult = await checkRateLimit('message:send');
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message || 'Trop de messages envoyés');
      }

      // Validation du contenu
      const sanitizedContent = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();

      if (!sanitizedContent && !attachment) {
        throw new Error('Le message ne peut pas être vide');
      }

      return messagingApi.sendMessage(conversationId, sanitizedContent, attachment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi du message");
    },
  });

  // Mutation pour créer une conversation
  const createConversationMutation = useMutation({
    mutationFn: async ({
      otherUserId,
      propertyId,
      subject,
    }: {
      otherUserId: string;
      propertyId?: string;
      subject?: string;
    }) => {
      // Vérifier le rate limit
      const rateLimitResult = await checkRateLimit('message:conversation');
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message || 'Trop de conversations créées');
      }

      return messagingApi.getOrCreateConversation(otherUserId, propertyId, subject);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation créée');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  // Fonctions sécurisées
  const sendMessage = useCallback(
    (conversationId: string, content: string, attachment?: File) => {
      return sendMessageMutation.mutateAsync({ conversationId, content, attachment });
    },
    [sendMessageMutation]
  );

  const createConversation = useCallback(
    (otherUserId: string, propertyId?: string, subject?: string) => {
      return createConversationMutation.mutateAsync({
        otherUserId,
        propertyId,
        subject,
      });
    },
    [createConversationMutation]
  );

  return {
    conversations,
    isLoadingConversations,
    conversationsError,
    sendMessage,
    createConversation,
    isSendingMessage: sendMessageMutation.isPending,
    isCreatingConversation: createConversationMutation.isPending,
  };
}

/**
 * Hook pour une conversation spécifique
 */
export function useSecureConversation(conversationId: string | null) {
  const { checkRateLimit } = useRateLimiter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => (conversationId ? messagingApi.getMessages(conversationId) : []),
    enabled: !!conversationId && !!user,
  });

  // Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (convId: string) => {
      return messagingApi.markAsRead(convId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Signaler un message
  const reportMessageMutation = useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
      return messagingApi.reportMessage(messageId, reason);
    },
    onSuccess: () => {
      toast.success('Message signalé');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du signalement');
    },
  });

  // Bloquer un utilisateur
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return messagingApi.blockUser(userId);
    },
    onSuccess: () => {
      toast.success('Utilisateur bloqué');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du blocage');
    },
  });

  // Marquer comme lu automatiquement lors de l'ouverture
  useEffect(() => {
    if (conversationId && user) {
      markAsReadMutation.mutate(conversationId);
    }
  }, [conversationId, user]);

  // S'abonner aux messages en temps réel
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return {
    messages,
    isLoadingMessages,
    messagesError,
    markAsRead: markAsReadMutation.mutate,
    reportMessage: reportMessageMutation.mutateAsync,
    blockUser: blockUserMutation.mutateAsync,
    isReporting: reportMessageMutation.isPending,
    isBlocking: blockUserMutation.isPending,
  };
}

/**
 * Hook pour le compteur de messages non lus
 */
export function useSecureUnreadCount() {
  const { checkRateLimit } = useRateLimiter();
  const { user } = useAuthStore();

  const { data: unreadCount = 0, isLoading: isLoadingUnread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      // Limiter les appels à cette fonction
      const rateLimitResult = await checkRateLimit('search:general');
      if (!rateLimitResult.allowed) {
        return 0; // Silently return 0 if rate limited
      }

      return messagingApi.getUnreadCount();
    },
    enabled: !!user,
    refetchInterval: 10000, // Vérifier toutes les 10 secondes
  });

  return { unreadCount, isLoadingUnread };
}
