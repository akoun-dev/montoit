/**
 * Service pour la gestion des créneaux de visite
 *
 * Permet aux propriétaires de définir leurs disponibilités pour les visites
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export type VisitSlotStatus = 'available' | 'booked' | 'blocked' | 'cancelled';
export type VisitType = 'in_person' | 'video_call' | 'virtual';

export interface VisitSlot {
  id: string;
  property_id: string;
  owner_id: string;
  start_time: string;
  end_time: string;
  visit_type: VisitType;
  status: VisitSlotStatus;
  booked_by: string | null;
  visit_request_id: string | null;
  max_attendees: number;
  current_attendees: number;
  notes: string | null;
  is_recurring: boolean;
  recurrence_pattern: Record<string, unknown> | null;
  parent_slot_id: string | null;
  created_at: string;
  updated_at: string;
  booked_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface CreateSlotData {
  property_id: string;
  start_time: string;
  end_time: string;
  visit_type?: VisitType;
  max_attendees?: number;
  notes?: string;
}

export interface RecurringSlotData {
  property_id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  days_of_week: number[]; // 0-6 (Sunday-Saturday)
  visit_type?: VisitType;
  max_attendees?: number;
}

export interface BookSlotResult {
  success: boolean;
  slot_id?: string;
  attendee_number?: number;
  error?: string;
}

/**
 * Récupérer les créneaux disponibles pour une propriété
 */
export async function getAvailableSlots(
  propertyId: string,
  startDate?: Date,
  endDate?: Date
): Promise<VisitSlot[]> {
  let query = supabase
    .from('visit_slots')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (startDate) {
    query = query.gte('start_time', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('start_time', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching available slots:', error);
    return [];
  }

  return (data || []) as VisitSlot[];
}

/**
 * Récupérer tous les créneaux d'un propriétaire
 */
export async function getOwnerSlots(
  ownerId: string,
  status?: VisitSlotStatus,
  propertyId?: string
): Promise<VisitSlot[]> {
  let query = supabase
    .from('visit_slots')
    .select('*')
    .eq('owner_id', ownerId)
    .order('start_time', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }
  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching owner slots:', error);
    return [];
  }

  return (data || []) as VisitSlot[];
}

/**
 * Créer un nouveau créneau de visite
 */
export async function createVisitSlot(
  ownerId: string,
  slotData: CreateSlotData
): Promise<VisitSlot> {
  const { data, error } = await supabase
    .from('visit_slots')
    .insert({
      owner_id: ownerId,
      property_id: slotData.property_id,
      start_time: slotData.start_time,
      end_time: slotData.end_time,
      visit_type: slotData.visit_type || 'in_person',
      status: 'available',
      max_attendees: slotData.max_attendees || 5,
      current_attendees: 0,
      notes: slotData.notes || null,
      is_recurring: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating visit slot:', error);
    throw error;
  }

  return data as VisitSlot;
}

/**
 * Créer des créneaux récurrents
 */
export async function createRecurringSlots(
  ownerId: string,
  recurringData: RecurringSlotData
): Promise<{ parent_slot_id: string; slots_created: number }> {
  const { data, error } = await supabase.rpc('generate_recurring_visit_slots', {
    p_property_id: recurringData.property_id,
    p_owner_id: ownerId,
    p_start_date: recurringData.start_date,
    p_end_date: recurringData.end_date,
    p_start_time: recurringData.start_time,
    p_end_time: recurringData.end_time,
    p_days_of_week: recurringData.days_of_week,
    p_visit_type: recurringData.visit_type || 'in_person',
    p_max_attendees: recurringData.max_attendees || 5,
  });

  if (error) {
    console.error('Error creating recurring slots:', error);
    throw error;
  }

  return data as { parent_slot_id: string; slots_created: number };
}

/**
 * Réserver un créneau
 */
export async function bookVisitSlot(
  slotId: string,
  visitRequestId: string,
  tenantId: string
): Promise<BookSlotResult> {
  const { data, error } = await supabase.rpc('book_visit_slot', {
    p_slot_id: slotId,
    p_visit_request_id: visitRequestId,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error booking visit slot:', error);
    return { success: false, error: error.message };
  }

  return data as BookSlotResult;
}

/**
 * Annuler une réservation de créneau
 */
export async function cancelSlotBooking(
  slotId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_visit_slot_booking', {
    p_slot_id: slotId,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error cancelling slot booking:', error);
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string };
}

/**
 * Mettre à jour un créneau
 */
export async function updateVisitSlot(
  slotId: string,
  ownerId: string,
  updates: Partial<CreateSlotData>
): Promise<VisitSlot> {
  const { data, error } = await supabase
    .from('visit_slots')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', slotId)
    .eq('owner_id', ownerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating visit slot:', error);
    throw error;
  }

  return data as VisitSlot;
}

/**
 * Supprimer un créneau
 */
export async function deleteVisitSlot(
  slotId: string,
  ownerId: string
): Promise<void> {
  const { error } = await supabase
    .from('visit_slots')
    .delete()
    .eq('id', slotId)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error deleting visit slot:', error);
    throw error;
  }
}

/**
 * Bloquer un créneau (pour indisponibilité)
 */
export async function blockSlot(
  slotId: string,
  ownerId: string,
  reason?: string
): Promise<VisitSlot> {
  return updateVisitSlot(slotId, ownerId, {} as CreateSlotData).then(async () => {
    const { data, error } = await supabase
      .from('visit_slots')
      .update({
        status: 'blocked',
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', slotId)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw error;
    return data as VisitSlot;
  });
}

/**
 * Annuler tous les créneaux futurs d'une propriété
 */
export async function cancelFutureSlots(
  propertyId: string,
  ownerId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('visit_slots')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelled by owner',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('property_id', propertyId)
    .eq('owner_id', ownerId)
    .gte('start_time', new Date().toISOString())
    .in('status', ['available', 'booked']);

  if (error) {
    console.error('Error cancelling future slots:', error);
    throw error;
  }
}

/**
 * Obtenir les statistiques des créneaux d'un propriétaire
 */
export async function getSlotStats(
  ownerId: string,
  propertyId?: string
): Promise<{
  total: number;
  available: number;
  booked: number;
  blocked: number;
  cancelled: number;
}> {
  let query = supabase
    .from('visit_slots')
    .select('status', { count: 'exact', head: false })
    .eq('owner_id', ownerId);

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching slot stats:', error);
    return { total: 0, available: 0, booked: 0, blocked: 0, cancelled: 0 };
  }

  const stats = {
    total: (data || []).length,
    available: (data || []).filter((s: { status: string }) => s.status === 'available').length,
    booked: (data || []).filter((s: { status: string }) => s.status === 'booked').length,
    blocked: (data || []).filter((s: { status: string }) => s.status === 'blocked').length,
    cancelled: (data || []).filter((s: { status: string }) => s.status === 'cancelled').length,
  };

  return stats;
}

/**
 * Nettoyer les anciens créneaux expirés
 */
export async function cleanupExpiredSlots(
  ownerId: string,
  daysOld = 7
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from('visit_slots')
    .delete()
    .eq('owner_id', ownerId)
    .lt('start_time', cutoffDate.toISOString())
    .in('status', ['cancelled', 'blocked'])
    .select();

  if (error) {
    console.error('Error cleaning up expired slots:', error);
    return 0;
  }

  return (data || []).length;
}

// Export du service complet
export const visitSlotsService = {
  getAvailableSlots,
  getOwnerSlots,
  createVisitSlot,
  createRecurringSlots,
  bookVisitSlot,
  cancelSlotBooking,
  updateVisitSlot,
  deleteVisitSlot,
  blockSlot,
  cancelFutureSlots,
  getSlotStats,
  cleanupExpiredSlots,
};

export default visitSlotsService;
