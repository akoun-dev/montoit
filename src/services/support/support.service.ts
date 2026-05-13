/**
 * Service pour la gestion des tickets de support
 *
 * Permet aux utilisateurs de créer et suivre leurs tickets de support
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketCategory = 'technical' | 'billing' | 'account' | 'property' | 'booking' | 'payment' | 'verification' | 'other';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assigned_to: string | null;
  property_id: string | null;
  resolution: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  first_response_at: string | null;
  response_time_minutes: number | null;
  platform: string;
  browser_info: Record<string, unknown>;
  attachments: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  property_id?: string;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  closed: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    role: string;
  };
}

/**
 * Créer un nouveau ticket de support
 */
export async function createSupportTicket(
  userId: string,
  data: CreateTicketData
): Promise<{ ticket_id: string; ticket_number: string }> {
  const { data: ticketData, error } = await supabase.rpc('create_support_ticket', {
    p_user_id: userId,
    p_subject: data.subject,
    p_description: data.description,
    p_category: data.category || 'other',
    p_priority: data.priority || 'medium',
    p_property_id: data.property_id || null,
    p_attachments: data.attachments || [],
  });

  if (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }

  return ticketData as { ticket_id: string; ticket_number: string };
}

/**
 * Récupérer les tickets de l'utilisateur connecté
 */
export async function getUserTickets(
  userId: string,
  status?: SupportTicketStatus
): Promise<SupportTicket[]> {
  let query = supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }

  return (data || []) as SupportTicket[];
}

/**
 * Récupérer un ticket par ID
 */
export async function getTicketById(
  ticketId: string
): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }

  return data as SupportTicket;
}

/**
 * Récupérer un ticket par numéro
 */
export async function getTicketByNumber(
  ticketNumber: string
): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('ticket_number', ticketNumber)
    .single();

  if (error) {
    console.error('Error fetching ticket by number:', error);
    return null;
  }

  return data as SupportTicket;
}

/**
 * Mettre à jour le statut d'un ticket
 */
export async function updateTicketStatus(
  ticketId: string,
  status: SupportTicketStatus,
  userId?: string,
  resolution?: string
): Promise<void> {
  const { error } = await supabase.rpc('update_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
    p_user_id: userId || null,
    p_resolution: resolution || null,
  });

  if (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
}

/**
 * Ajouter un message à un ticket
 */
export async function addTicketMessage(
  ticketId: string,
  senderId: string,
  message: string,
  isInternal = false
): Promise<void> {
  const { error } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: senderId,
      message,
      is_internal: isInternal,
    });

  if (error) {
    console.error('Error adding ticket message:', error);
    throw error;
  }

  // Update ticket updated_at
  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);
}

/**
 * Récupérer les messages d'un ticket
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*, profiles(full_name)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching ticket messages:', error);
    return [];
  }

  return (data || []).map((msg: Record<string, unknown>) => ({
    id: msg.id,
    ticket_id: msg.ticket_id,
    sender_id: msg.sender_id,
    message: msg.message,
    is_internal: msg.is_internal,
    created_at: msg.created_at,
    sender: {
      full_name: msg.profiles?.full_name || 'Utilisateur',
      role: 'user', // Would need to be fetched from user_roles
    },
  }));
}

/**
 * Récupérer les statistiques des tickets de l'utilisateur
 */
export async function getUserTicketStats(userId: string): Promise<TicketStats> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('status')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching ticket stats:', error);
    return {
      total: 0,
      open: 0,
      in_progress: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
    };
  }

  const stats: TicketStats = {
    total: (data || []).length,
    open: 0,
    in_progress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  };

  (data || []).forEach((ticket: { status: string }) => {
    if (ticket.status in stats) {
      const status = ticket.status as keyof TicketStats;
      stats[status]++;
    }
  });

  return stats;
}

/**
 * Fermer un ticket
 */
export async function closeTicket(
  ticketId: string,
  userId: string,
  resolution?: string
): Promise<void> {
  await updateTicketStatus(ticketId, 'closed', userId, resolution);
}

/**
 * Rouvrir un ticket fermé
 */
export async function reopenTicket(ticketId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      status: 'open',
      closed_at: null,
      closed_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error reopening ticket:', error);
    throw error;
  }
}

/**
 * Upload une pièce jointe pour un ticket
 */
export async function uploadTicketAttachment(
  file: File,
  ticketId?: string
): Promise<{ url: string; name: string; type: string; size: number }> {
  const fileExt = file.name.split('.').pop();
  const fileName = ticketId
    ? `tickets/${ticketId}/${Date.now()}.${fileExt}`
    : `tickets/temp/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('support-attachments')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading attachment:', uploadError);
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('support-attachments')
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

/**
 * S'abonner aux messages d'un ticket en temps réel
 */
export function subscribeToTicketMessages(
  ticketId: string,
  callback: (message: TicketMessage) => void
) {
  return supabase
    .channel(`ticket_messages:${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      },
      async (payload) => {
        const msg = payload.new as Record<string, unknown>;
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', msg.sender_id)
          .single();

        callback({
          id: msg.id,
          ticket_id: msg.ticket_id,
          sender_id: msg.sender_id,
          message: msg.message,
          is_internal: msg.is_internal,
          created_at: msg.created_at,
          sender: {
            full_name: profile?.full_name || 'Utilisateur',
            role: 'user',
          },
        });
      }
    )
    .subscribe();
}

// Export du service complet
export const supportService = {
  createSupportTicket,
  getUserTickets,
  getTicketById,
  getTicketByNumber,
  updateTicketStatus,
  addTicketMessage,
  getTicketMessages,
  getUserTicketStats,
  closeTicket,
  reopenTicket,
  uploadTicketAttachment,
  subscribeToTicketMessages,
};

export default supportService;
