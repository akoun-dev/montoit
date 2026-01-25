/**
 * Service API pour l'agent de confiance (trust-agent)
 *
 * Ce service centralise toutes les opérations spécifiques aux agents de confiance avec validation stricte des permissions.
 */

import { supabase } from '@/integrations/supabase/client';
import { requireRole } from '@/shared/services/roleValidation.service';
import type { Json } from '@/integrations/supabase/types';

export interface Mission {
  id: string;
  property_id: string;
  agent_id: string;
  mission_type: 'inspection' | 'verification' | 'mediation' | 'documentation';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  mission_id?: string;
}

export interface ValidationMetrics {
  total_missions: number;
  completed_missions: number;
  pending_validations: number;
  average_rating: number;
  response_time_hours: number;
}

interface PropertyNeedingVerification {
  id: string;
  title: string;
  address: Json;
  ansut_verified: boolean | null;
  ansut_verification_date: string | null;
  created_at: string;
  city: string;
  neighborhood: string | null;
  property_type: string;
  main_image: string | null;
  owner_id: string;
  is_verified: boolean;
  verification_priority?: 'high' | 'medium' | 'low' | 'urgent';
  days_since_creation?: number;
  needs_verification?: boolean;
}

/**
 * API d'agent de confiance sécurisée
 */
export const trustAgentApi = {
  /**
   * Récupère les missions assignées à l'agent connecté
   */
  getMyMissions: async (filters?: {
    status?: Mission['status'];
    mission_type?: Mission['mission_type'];
    date_from?: string;
    date_to?: string;
  }): Promise<Mission[]> => {
    await requireRole(['trust_agent'])();

    let query = supabase
      .from('cev_missions')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.mission_type) {
      query = query.eq('mission_type', filters.mission_type);
    }
    if (filters?.date_from) {
      query = query.gte('scheduled_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('scheduled_at', filters.date_to);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Mission[];
  },

  /**
   * Récupère une mission par son ID
   */
  getMission: async (missionId: string): Promise<Mission> => {
    await requireRole(['trust_agent'])();

    const { data, error } = await supabase
      .from('cev_missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (error) throw error;
    return data as Mission;
  },

  /**
   * Met à jour le statut d'une mission
   */
  updateMissionStatus: async (
    missionId: string,
    status: Mission['status'],
    notes?: string
  ): Promise<Mission> => {
    await requireRole(['trust_agent'])();

    const updates: {
      status: Mission['status'];
      updated_at: string;
      notes?: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from('cev_missions')
      .update(updates)
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;
    return data as Mission;
  },

  /**
   * Planifie une mission
   */
  scheduleMission: async (missionId: string, scheduledAt: string): Promise<Mission> => {
    await requireRole(['trust_agent'])();

    const { data, error } = await supabase
      .from('cev_missions')
      .update({
        scheduled_at: scheduledAt,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;
    return data as Mission;
  },

  /**
   * Récupère les événements du calendrier pour l'agent
   */
  getCalendarEvents: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
    await requireRole(['trust_agent'])();

    const { data, error } = await supabase
      .from('cev_missions')
      .select('id, mission_type, scheduled_at, status')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((mission) => ({
      id: mission.id,
      title: `${mission.mission_type} - ${mission.status}`,
      start: mission.scheduled_at || '',
      end: mission.scheduled_at || '',
      type: mission.mission_type,
      mission_id: mission.id,
    }));
  },

  /**
   * Récupère les métriques de validation
   */
  getValidationMetrics: async (): Promise<ValidationMetrics> => {
    await requireRole(['trust_agent'])();

    // Récupérer les missions de l'agent
    const { data: missions, error } = await supabase
      .from('cev_missions')
      .select('status, completed_at, created_at')
      .eq('agent_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) throw error;

    const total = missions?.length || 0;
    const completed = missions?.filter((m) => m.status === 'completed').length || 0;
    const pending =
      missions?.filter((m) => m.status === 'pending' || m.status === 'scheduled').length || 0;

    // Calculer le temps de réponse moyen (simplifié)
    let totalResponseHours = 0;
    let count = 0;
    missions?.forEach((m) => {
      if (m.completed_at && m.created_at) {
        const created = new Date(m.created_at);
        const completed = new Date(m.completed_at);
        const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
        totalResponseHours += hours;
        count++;
      }
    });
    const avgResponse = count > 0 ? totalResponseHours / count : 0;

    return {
      total_missions: total,
      completed_missions: completed,
      pending_validations: pending,
      average_rating: 4.8, // À implémenter avec les évaluations
      response_time_hours: avgResponse,
    };
  },

  /**
   * Soumet un rapport de mission
   */
  submitMissionReport: async (
    missionId: string,
    report: Json,
    attachments?: string[]
  ): Promise<void> => {
    await requireRole(['trust_agent'])();

    const { error } = await supabase.from('cev_reports').insert({
      mission_id: missionId,
      report_content: report,
      attachments: attachments || [],
      submitted_at: new Date().toISOString(),
      submitted_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) throw error;
  },

  /**
   * Récupère toutes les propriétés (pour la page de gestion)
   */
  getAllProperties: async (): Promise<PropertyNeedingVerification[]> => {
    await requireRole(['trust_agent'])();

    try {
      const { data, error } = await supabase
        .from('properties')
        .select(
          'id, title, address, ansut_verified, ansut_verification_date, created_at, city, neighborhood, property_type, main_image, owner_id, is_verified, status'
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Add verification priority based on age and verification status
      const propertiesWithPriority = (data || []).map((property) => {
        const daysSinceCreation = property.created_at
          ? Math.floor(
              (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        let priority: 'high' | 'medium' | 'low' | 'urgent' = 'low';
        if (property.ansut_verified) {
          priority = 'low';
        } else if (daysSinceCreation > 60) {
          priority = 'urgent';
        } else if (daysSinceCreation > 30) {
          priority = 'high';
        } else {
          priority = 'medium';
        }

        return {
          ...property,
          verification_priority: priority,
          days_since_creation: daysSinceCreation,
          needs_verification: !property.ansut_verified,
        };
      });

      return propertiesWithPriority as PropertyNeedingVerification[];
    } catch (err) {
      console.error('Error in getAllProperties:', err);
      throw err;
    }
  },

  /**
   * Récupère les propriétés nécessitant une vérification ANSUT
   */
  getPropertiesNeedingVerification: async (): Promise<PropertyNeedingVerification[]> => {
    await requireRole(['trust_agent'])();

    try {
      const { data, error } = await supabase
        .from('properties')
        .select(
          'id, title, address, ansut_verified, ansut_verification_date, created_at, city, neighborhood, property_type, main_image, owner_id, is_verified'
        )
        .or('ansut_verified.is.false,ansut_verified.is.null')
        .eq('status', 'disponible')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Add verification priority based on age and verification status
      const propertiesWithPriority = (data || []).map((property) => {
        const daysSinceCreation = property.created_at
          ? Math.floor(
              (Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        const priority =
          property.ansut_verified === false || !property.ansut_verified
            ? 'high'
            : daysSinceCreation > 30
              ? 'medium'
              : 'low';

        return {
          ...property,
          verification_priority: priority,
          days_since_creation: daysSinceCreation,
          needs_verification: !property.ansut_verified,
        };
      });

      return propertiesWithPriority as PropertyNeedingVerification[];
    } catch (err) {
      console.error('Error in getPropertiesNeedingVerification:', err);
      throw err;
    }
  },

  /**
   * Vérifie une propriété (certification ANSUT)
   */
  verifyProperty: async (
    propertyId: string,
    verificationData: {
      verified: boolean;
      notes?: string;
      certificateUrl?: string;
    }
  ): Promise<unknown> => {
    await requireRole(['trust_agent'])();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('properties')
      .update({
        ansut_verified: verificationData.verified,
        ansut_verified_by: user.id,
        ansut_notes: verificationData.notes,
        ansut_certificate_url: verificationData.certificateUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;

    // Create a verification mission if not exists
    if (verificationData.verified) {
      await supabase.from('cev_missions').upsert(
        {
          property_id: propertyId,
          agent_id: user.id,
          mission_type: 'verification',
          status: 'completed',
          title: `Vérification ANSUT - ${data.title}`,
          completed_at: new Date().toISOString(),
          notes: verificationData.notes,
        },
        {
          onConflict: 'property_id,agent_id,mission_type',
        }
      );
    }

    return data;
  },

  /**
   * Crée une nouvelle mission
   */
  createMission: async (
    missionData: Omit<Mission, 'id' | 'created_at' | 'updated_at' | 'status'>
  ): Promise<Mission> => {
    await requireRole(['trust_agent'])();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('cev_missions')
      .insert({
        ...missionData,
        status: 'pending',
        created_by: user.id,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Mission;
  },
};
