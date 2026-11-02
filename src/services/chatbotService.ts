/**
 * Chatbot Service Stub
 * Placeholder temporaire pour le service chatbot
 */

import type { ChatMessage, ChatConversation } from '@/types/monToit.types';
import { supabase } from '@/services/supabase/client';

/**
 * Récupère ou crée une conversation pour un utilisateur
 */
export async function getOrCreateConversation(userId: string): Promise<ChatConversation | null> {
  try {
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching conversation:', error);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        userId: data.user_id || '',
        title: data.title || 'Nouvelle conversation',
        status: data.status || 'active',
        type: 'general',
        messageCount: data.message_count || 0,
        metadata: { priority: 'normal' },
        createdAt: new Date(data.created_at || Date.now()),
        updatedAt: new Date(data.updated_at || Date.now()),
        archivedAt: data.archived_at ? new Date(data.archived_at) : undefined,
      } as unknown as ChatConversation;
    }

    // Créer une nouvelle conversation
    const { data: newConv, error: createError } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId,
        title: 'Conversation avec SUTA',
        status: 'active',
        metadata: { type: 'general' },
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return null;
    }

    return {
      id: newConv.id,
      userId: newConv.user_id || '',
      title: newConv.title || 'Nouvelle conversation',
      status: newConv.status || 'active',
      type: 'general',
      messageCount: 0,
      metadata: { priority: 'normal' },
      createdAt: new Date(newConv.created_at || Date.now()),
      updatedAt: new Date(newConv.updated_at || Date.now()),
    } as unknown as ChatConversation;
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return null;
  }
}

/**
 * Récupère tous les messages d'une conversation
 */
export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chatbot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map(
      (msg) =>
        ({
          id: msg.id,
          conversationId: msg.conversation_id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.created_at || Date.now()),
          metadata: {},
          isRead: msg.is_read || false,
          readAt: msg.read_at ? new Date(msg.read_at) : undefined,
          attachments: [],
          reactions: [],
        }) as ChatMessage
    );
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

/**
 * Envoie un message dans une conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  role: 'user' | 'assistant'
): Promise<ChatMessage | null> {
  try {
    const { data, error } = await supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role as 'user' | 'assistant' | 'system',
      content: data.content,
      timestamp: new Date(data.created_at || Date.now()),
      metadata: {},
      isRead: false,
    } as ChatMessage;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
}

/**
 * Obtient une réponse de l'IA via Edge Function
 */
export async function getAIResponse(params: {
  userMessage: string;
  conversationHistory: ChatMessage[];
  userId: string;
}): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chatbot', {
      body: {
        message: params.userMessage,
        userId: params.userId,
        conversationHistory: params.conversationHistory.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      },
    });

    if (error) {
      console.error('Error getting AI response:', error);
      throw new Error('Erreur lors de la génération de la réponse');
    }

    return data.response || "Désolé, je n'ai pas pu générer une réponse.";
  } catch (error) {
    console.error('Error in getAIResponse:', error);
    throw error;
  }
}

/**
 * Récupère toutes les conversations d'un utilisateur
 */
export async function getAllConversations(userId: string): Promise<ChatConversation[]> {
  try {
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return (data || []).map(
      (conv) =>
        ({
          id: conv.id,
          userId: conv.user_id || '',
          title: conv.title || 'Conversation',
          status: conv.status || 'active',
          type: 'general',
          messageCount: conv.message_count || 0,
          metadata: { priority: 'normal' },
          createdAt: new Date(conv.created_at || Date.now()),
          updatedAt: new Date(conv.updated_at || Date.now()),
          archivedAt: conv.archived_at ? new Date(conv.archived_at) : undefined,
        }) as unknown as ChatConversation
    );
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    return [];
  }
}

/**
 * Archive une conversation
 */
export async function archiveConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('chatbot_conversations')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error archiving conversation:', error);
    }
  } catch (error) {
    console.error('Error in archiveConversation:', error);
  }
}

// Export par défaut pour compatibilité
export const chatbotService = {
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  getAIResponse,
  getAllConversations,
  archiveConversation,
};
