/**
 * Service de gestion des assignations pour les agents de confiance
 *
 * Ce service gère la réassignment des missions et litiges entre agents.
 */

import { supabase } from '@/integrations/supabase/client';
import { requireRole } from '@/shared/services/roleValidation.service';

/**
 * Charge de travail d'un agent
 */
export interface AgentWorkload {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  active_missions: number;
  active_disputes: number;
  completed_missions: number;
  resolved_disputes: number;
  completion_rate: number;
  last_activity: string | null;
}

/**
 * Agent disponible pour réassignment
 */
export interface AvailableAgent {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  workload: {
    missions: number;
    disputes: number;
    total: number;
  };
  availability: 'high' | 'medium' | 'low';
}

/**
 * Récupère la charge de travail de tous les agents trust-agent
 */
export const getAgentsWorkload = async (): Promise<AgentWorkload[]> => {
  await requireRole(['trust_agent', 'admin'])();

  const { data, error } = await supabase
    .from('agent_workload')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    // If view doesn't exist, return empty array silently
    if (error.code === 'PGRST204' || error.code === 'PGRST116' || error.code === 'PGRST205') {
      return [];
    }
    throw error;
  }

  return (data || []) as AgentWorkload[];
};

/**
 * Récupère les agents disponibles pour une réassignment
 */
export const getAvailableAgents = async (excludeAgentId?: string): Promise<AvailableAgent[]> => {
  await requireRole(['trust_agent', 'admin'])();

  const workload = await getAgentsWorkload();

  return workload
    .filter((agent) => agent.user_id !== excludeAgentId)
    .map((agent) => {
      const total = agent.active_missions + agent.active_disputes;
      let availability: 'high' | 'medium' | 'low' = 'high';

      if (total >= 15) {
        availability = 'low';
      } else if (total >= 8) {
        availability = 'medium';
      }

      return {
        id: agent.user_id,
        full_name: agent.full_name,
        email: agent.email,
        avatar_url: agent.avatar_url,
        workload: {
          missions: agent.active_missions,
          disputes: agent.active_disputes,
          total,
        },
        availability,
      };
    })
    .sort((a, b) => {
      // Sort by availability (high -> medium -> low), then by workload
      const availabilityOrder = { high: 0, medium: 1, low: 2 };
      const orderDiff = availabilityOrder[a.availability] - availabilityOrder[b.availability];
      if (orderDiff !== 0) return orderDiff;
      return a.workload.total - b.workload.total;
    });
};

/**
 * Réassigne un litige à un autre agent
 */
export const reassignDispute = async (
  disputeId: string,
  newAgentId: string,
  reason?: string
): Promise<void> => {
  await requireRole(['trust_agent', 'admin'])();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Get current dispute to check ownership
  const { data: dispute } = await supabase
    .from('disputes')
    .select('assigned_to, title')
    .eq('id', disputeId)
    .single();

  if (!dispute) {
    throw new Error('Litige introuvable');
  }

  // Update dispute
  const { error } = await supabase
    .from('disputes')
    .update({
      assigned_to: newAgentId,
      updated_at: new Date().toISOString(),
      // Add reassignment reason to resolution notes if provided
      ...(reason && {
        resolution_notes: `Réassigné par ${user.user_metadata?.full_name || user.email}: ${reason}\n${dispute.resolution_notes || ''}`,
      }),
    })
    .eq('id', disputeId);

  if (error) throw error;

  // Create a notification for the new agent (silently fail if table doesn't exist)
  await supabase
    .from('trust_agent_notifications')
    .insert({
      user_id: newAgentId,
      type: 'new_dispute',
      title: 'Litige réassigné',
      message: `Le litige "${dispute.title}" vous a été réassigné.`,
      priority: 'high',
      data: {
        entity_type: 'dispute',
        entity_id: disputeId,
      },
    })
    .then(({ error }) => {
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.warn('Failed to create notification:', error);
      }
    });

  // Log the reassignment (silently fail if table doesn't exist)
  await supabase.from('admin_audit_logs').insert({
    user_id: user.id,
    user_email: user.email,
    action: 'reassign_dispute',
    entity_type: 'dispute',
    entity_id: disputeId,
    details: {
      previous_agent: dispute.assigned_to,
      new_agent: newAgentId,
      reason,
    },
  }).then(({ error }) => {
    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      console.warn('Failed to log reassignment:', error);
    }
  });
};

/**
 * Réassigne une mission à un autre agent
 */
export const reassignMission = async (
  missionId: string,
  newAgentId: string,
  reason?: string
): Promise<void> => {
  await requireRole(['trust_agent', 'admin'])();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Get current mission to check ownership
  const { data: mission } = await supabase
    .from('cev_missions')
    .select('assigned_agent_id, title')
    .eq('id', missionId)
    .single();

  if (!mission) {
    throw new Error('Mission introuvable');
  }

  // Update mission
  const { error } = await supabase
    .from('cev_missions')
    .update({
      assigned_agent_id: newAgentId,
      updated_at: new Date().toISOString(),
      // Add reassignment reason to notes if provided
      ...(reason && {
        notes: `Réassigné par ${user.user_metadata?.full_name || user.email}: ${reason}\n${mission.notes || ''}`,
      }),
    })
    .eq('id', missionId);

  if (error) throw error;

  // Create a notification for the new agent (silently fail if table doesn't exist)
  await supabase
    .from('trust_agent_notifications')
    .insert({
      user_id: newAgentId,
      type: 'new_mission',
      title: 'Mission réassignée',
      message: `La mission "${mission.title}" vous a été réassignée.`,
      priority: 'high',
      data: {
        entity_type: 'mission',
        entity_id: missionId,
      },
    })
    .then(({ error }) => {
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.warn('Failed to create notification:', error);
      }
    });

  // Log the reassignment (silently fail if table doesn't exist)
  await supabase.from('admin_audit_logs').insert({
    user_id: user.id,
    user_email: user.email,
    action: 'reassign_mission',
    entity_type: 'mission',
    entity_id: missionId,
    details: {
      previous_agent: mission.assigned_agent_id,
      new_agent: newAgentId,
      reason,
    },
  }).then(({ error }) => {
    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      console.warn('Failed to log reassignment:', error);
    }
  });
};

/**
 * Réassigne automatiquement les tâches d'un agent à d'autres agents disponibles
 * Utile quand un agent est en congé ou indisponible
 */
export const autoReassignAgentWorkload = async (
  agentId: string,
  reason: string
): Promise<{ missions: number; disputes: number }> => {
  await requireRole(['trust_agent', 'admin'])();

  // Get available agents
  const availableAgents = await getAvailableAgents(agentId);

  if (availableAgents.length === 0) {
    throw new Error('Aucun agent disponible pour la réassignment');
  }

  // Get agent's active missions
  const { data: missions } = await supabase
    .from('cev_missions')
    .select('id, title')
    .eq('assigned_agent_id', agentId)
    .in('status', ['pending', 'assigned', 'in_progress']);

  // Get agent's active disputes
  const { data: disputes } = await supabase
    .from('disputes')
    .select('id, title')
    .eq('assigned_to', agentId)
    .in('status', ['assigned', 'under_mediation', 'awaiting_response']);

  let missionsReassigned = 0;
  let disputesReassigned = 0;

  // Distribute missions evenly among available agents
  if (missions && missions.length > 0) {
    for (let i = 0; i < missions.length; i++) {
      const agent = availableAgents[i % availableAgents.length];
      try {
        await reassignMission(missions[i].id, agent.id, reason);
        missionsReassigned++;
      } catch (error) {
        console.error(`Failed to reassign mission ${missions[i].id}:`, error);
      }
    }
  }

  // Distribute disputes evenly among available agents
  if (disputes && disputes.length > 0) {
    for (let i = 0; i < disputes.length; i++) {
      const agent = availableAgents[i % availableAgents.length];
      try {
        await reassignDispute(disputes[i].id, agent.id, reason);
        disputesReassigned++;
      } catch (error) {
        console.error(`Failed to reassign dispute ${disputes[i].id}:`, error);
      }
    }
  }

  return { missions: missionsReassigned, disputes: disputesReassigned };
};

/**
 * Service complet de gestion des assignations
 */
export const agentAssignmentService = {
  getAgentsWorkload,
  getAvailableAgents,
  reassignDispute,
  reassignMission,
  autoReassignAgentWorkload,
};
