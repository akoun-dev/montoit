import { useState, useEffect, useCallback } from 'react';
import {
  messagingService,
  Message,
  Attachment,
} from '../../features/messaging/services/messaging.service';
import { useAuth } from '../../contexts';
import { supabase } from '../../lib';
import { useNotificationSound } from './useNotificationSound';

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const { playIncomingSound } = useNotificationSound();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const data = await messagingService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversationId && user?.id) {
      messagingService.markAsRead(conversationId, user.id);
    }
  }, [conversationId, user?.id]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = messagingService.subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      // Play sound and mark as read if we're the receiver
      if (user?.id && newMessage.receiver_id === user.id && newMessage.sender_id !== user.id) {
        playIncomingSound();
        messagingService.markAsRead(conversationId, user.id);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(
    async (receiverId: string, content: string, attachment?: Attachment | null) => {
      if (!conversationId || !user?.id) return null;
      if (!content.trim() && !attachment) return null;

      setSending(true);
      try {
        let uploadedAttachment: Attachment | null = null;

        // Upload attachment if present
        if (attachment && (attachment as Attachment & { file?: File }).file) {
          const file = (attachment as Attachment & { file: File }).file;
          uploadedAttachment = await messagingService.uploadAttachment(file, conversationId);
        }

        const message = await messagingService.sendMessage(
          conversationId,
          user.id,
          receiverId,
          content.trim(),
          uploadedAttachment
        );
        return message;
      } finally {
        setSending(false);
      }
    },
    [conversationId, user?.id]
  );

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: fetchMessages,
  };
}
