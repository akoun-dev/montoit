/**
 * Service API pour la messagerie sécurisée
 *
 * Ce service ajoute une couche de sécurité à la messagerie en vérifiant
 * que les utilisateurs sont autorisés à accéder aux conversations et messages.
 */

import { supabase } from '@/services/supabase/client';
import { hasPermission, hasRole } from '@/shared/services/roleValidation.service';
import { SecureUploadService } from '@/shared/services/secureUpload.service';
import type { Database } from '@/shared/lib/database.types';

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  property_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  subject?: string | null;
  other_participant?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  property?: {
    id: string;
    title: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Attachment {
  url: string;
  type: 'image' | 'document';
  name: string;
  size: number;
}

/**
 * API de messagerie sécurisée
 */
export const messagingApi = {
  /**
   * Vérifie si un utilisateur est participant d'une conversation
   */
  async isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();

    if (error || !data) return false;

    return data.participant1_id === userId || data.participant2_id === userId;
  },

  /**
   * Vérifie si deux utilisateurs peuvent communiquer
   */
  async canUsersCommunicate(
    user1Id: string,
    user2Id: string,
    propertyId?: string | null
  ): Promise<boolean> {
    // Les admins peuvent communiquer avec tout le monde
    const isAdmin = await hasRole(['admin']);
    if (isAdmin) return true;

    // Si c'est une conversation liée à une propriété
    if (propertyId) {
      // Vérifier que les deux utilisateurs ont un lien avec la propriété
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id, agency_id')
        .eq('id', propertyId)
        .single();

      if (!property) return false;

      const isOwnerOrAgent = user1Id === property.owner_id || user1Id === property.agency_id;
      const isOwnerOrAgent2 = user2Id === property.owner_id || user2Id === property.agency_id;

      if (isOwnerOrAgent || isOwnerOrAgent2) return true;

      // Vérifier si c'est un locataire via un contrat
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('property_id', propertyId)
        .or(`tenant_id.eq.${user1Id},tenant_id.eq.${user2Id}`)
        .single();

      if (contract) return true;
    }

    // Pour les conversations générales, autoriser la communication
    // (pourrait être affiné selon les règles métier)
    return true;
  },

  /**
   * Récupère toutes les conversations de l'utilisateur
   */
  async getConversations(): Promise<Conversation[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        property:properties!conversations_property_id_fkey(id, title)
      `
      )
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Enrichir avec les détails des participants
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conv: any) => {
        const otherParticipantId =
          conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;

        // Récupérer le profil de l'autre participant
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherParticipantId)
          .single();

        // Compter les messages non lus
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        return {
          ...conv,
          other_participant: profile || {
            id: otherParticipantId,
            full_name: null,
            avatar_url: null,
          },
          unread_count: count || 0,
        };
      })
    );

    return conversationsWithDetails;
  },

  /**
   * Récupère ou crée une conversation entre deux utilisateurs
   */
  async getOrCreateConversation(
    otherUserId: string,
    propertyId?: string | null,
    subject?: string | null
  ): Promise<Conversation | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier que les utilisateurs peuvent communiquer
    const canCommunicate = await this.canUsersCommunicate(user.id, otherUserId, propertyId);
    if (!canCommunicate) {
      throw new Error('Non autorisé à créer cette conversation');
    }

    // Chercher une conversation existante
    let query = supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`
      );

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      return existing as Conversation;
    }

    // Créer une nouvelle conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        participant1_id: user.id,
        participant2_id: otherUserId,
        property_id: propertyId,
        subject,
      })
      .select()
      .single();

    if (error) throw error;
    return newConv as Conversation;
  },

  /**
   * Récupère les messages d'une conversation
   */
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier que l'utilisateur est participant de la conversation
    const isParticipant = await this.isConversationParticipant(conversationId, user.id);
    if (!isParticipant) {
      throw new Error('Non autorisé à accéder à cette conversation');
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrichir avec les profils des expéditeurs
    const messagesWithSenders = await Promise.all(
      (data || []).map(async (msg: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', msg.sender_id)
          .single();

        return {
          ...msg,
          sender: profile || {
            id: msg.sender_id,
            full_name: null,
            avatar_url: null,
          },
        };
      })
    );

    return messagesWithSenders;
  },

  /**
   * Envoie un message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    attachment?: File | null
  ): Promise<Message | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier que l'utilisateur est participant de la conversation
    const isParticipant = await this.isConversationParticipant(conversationId, user.id);
    if (!isParticipant) {
      throw new Error('Non autorisé à envoyer un message dans cette conversation');
    }

    // Récupérer l'autre participant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) throw new Error('Conversation non trouvée');

    const receiverId =
      conversation.participant1_id === user.id
        ? conversation.participant2_id
        : conversation.participant1_id;

    let attachmentData: any = null;
    if (attachment) {
      // Upload sécurisé de la pièce jointe
      const uploadResult = await SecureUploadService.uploadSecure({
        bucket: 'DOCUMENTS',
        folder: 'message-attachments',
        file: attachment,
        resourceType: 'message',
        resourceId: conversationId,
      });

      if (!uploadResult.error) {
        attachmentData = {
          url: uploadResult.url,
          name: attachment.name,
          size: attachment.size,
          type: attachment.type.startsWith('image/') ? 'image' : 'document',
        };
      }
    }

    // Créer le message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        is_read: false,
        attachment_url: attachmentData?.url,
        attachment_type: attachmentData?.type,
        attachment_name: attachmentData?.name,
        attachment_size: attachmentData?.size,
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour la conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
      })
      .eq('id', conversationId);

    // Créer une notification pour le destinataire
    await supabase.from('notifications').insert({
      user_id: receiverId,
      title: 'Nouveau message',
      message: `Vous avez reçu un nouveau message`,
      type: 'message',
      action_url: `/messages/${conversationId}`,
      channel: 'in_app',
    });

    return data as Message;
  },

  /**
   * Marque les messages comme lus
   */
  async markAsRead(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier que l'utilisateur est participant de la conversation
    const isParticipant = await this.isConversationParticipant(conversationId, user.id);
    if (!isParticipant) {
      throw new Error('Non autorisé à modifier cette conversation');
    }

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
  },

  /**
   * Récupère le nombre de messages non lus
   */
  async getUnreadCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Supprime une conversation (si autorisé)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Seuls les admins peuvent supprimer des conversations
    const isAdmin = await hasRole(['admin']);
    if (!isAdmin) {
      throw new Error('Non autorisé à supprimer cette conversation');
    }

    // Marquer comme supprimé (soft delete)
    const { error } = await supabase
      .from('conversations')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', conversationId);

    if (error) throw error;
  },

  /**
   * Signale un message
   */
  async reportMessage(messageId: string, reason: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier que le message existe
    const { data: message } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', messageId)
      .single();

    if (!message) throw new Error('Message non trouvé');

    // Vérifier que l'utilisateur est participant de la conversation
    const isParticipant = await this.isConversationParticipant(message.conversation_id, user.id);
    if (!isParticipant) {
      throw new Error('Non autorisé à signaler ce message');
    }

    // Créer un signalement
    const { error } = await supabase.from('message_reports').insert({
      message_id: messageId,
      reporter_id: user.id,
      reason,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  /**
   * Bloque un utilisateur
   */
  async blockUser(userId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Ne pas se bloquer soi-même
    if (userId === user.id) {
      throw new Error('Vous ne pouvez pas vous bloquer vous-même');
    }

    // Créer ou mettre à jour le blocage
    const { error } = await supabase.from('user_blocks').upsert({
      blocker_id: user.id,
      blocked_id: userId,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  },

  /**
   * Vérifie si un utilisateur est bloqué
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`
      )
      .maybeSingle();

    return !!data;
  },
};
