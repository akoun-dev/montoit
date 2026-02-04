import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingCallbacks {
  onTypingStart: (userId: string) => void;
  onTypingStop: (userId: string) => void;
}

class TypingIndicatorService {
  private typingChannels: Map<string, RealtimeChannel> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Subscribe to typing indicators for a conversation
   */
  subscribeToTyping(conversationId: string, callbacks: TypingCallbacks) {
    const channelName = `typing:${conversationId}`;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing_start' }, ({ payload }) => {
        const { userId } = payload as { userId: string };
        if (userId !== this.userId) {
          callbacks.onTypingStart(userId);
        }
      })
      .on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
        const { userId } = payload as { userId: string };
        if (userId !== this.userId) {
          callbacks.onTypingStop(userId);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Failed to subscribe to typing indicators');
        }
      });

    this.typingChannels.set(conversationId, channel);
    return channel;
  }

  /**
   * Unsubscribe from typing indicators
   */
  unsubscribe(conversationId: string) {
    const channel = this.typingChannels.get(conversationId);
    if (channel) {
      supabase.removeChannel(channel);
      this.typingChannels.delete(conversationId);
    }

    // Clear any pending timeout
    const timeout = this.typingTimeouts.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(conversationId);
    }
  }

  /**
   * Send typing start event (debounced)
   */
  sendTypingStart(conversationId: string) {
    if (!this.userId) return;

    const channel = this.typingChannels.get(conversationId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: { userId: this.userId },
      });
    }

    // Clear existing timeout and set new one
    const existingTimeout = this.typingTimeouts.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Auto-send typing_stop after 3 seconds of no activity
    const timeout = setTimeout(() => {
      this.sendTypingStop(conversationId);
    }, 3000);

    this.typingTimeouts.set(conversationId, timeout);
  }

  /**
   * Send typing stop event
   */
  sendTypingStop(conversationId: string) {
    if (!this.userId) return;

    const channel = this.typingChannels.get(conversationId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: { userId: this.userId },
      });
    }

    // Clear timeout
    const timeout = this.typingTimeouts.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(conversationId);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.typingChannels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.typingChannels.clear();

    this.typingTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.typingTimeouts.clear();
  }
}

export const typingIndicatorService = new TypingIndicatorService();
