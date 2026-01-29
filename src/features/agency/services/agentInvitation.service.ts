/**
 * Agent Invitation Service
 *
 * Handles invitation and onboarding of agents to agencies via email tokens.
 */
import { supabase } from '@/integrations/supabase/client';

export interface InvitationData {
  agencyId: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  commission_split?: number;
  target_monthly?: number;
  bio?: string;
  phone?: string;
}

export interface InvitationResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AcceptInvitationResult {
  success: boolean;
  message: string;
}

class AgentInvitationService {
  /**
   * Create a new invitation for an agent to join an agency
   */
  async inviteAgent(data: InvitationData): Promise<InvitationResult> {
    try {
      const { data: existingInvitation } = await supabase
        .from('agent_invitations')
        .select('id, status, expires_at')
        .eq('agency_id', data.agencyId)
        .eq('email', data.email.toLowerCase())
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        // Return existing token instead of creating duplicate
        return {
          success: true,
          token: existingInvitation.id,
        };
      }

      const { data: invitation, error } = await supabase
        .from('agent_invitations')
        .insert({
          agency_id: data.agencyId,
          email: data.email.toLowerCase(),
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          role: data.role || 'agent',
          commission_split: data.commission_split || 50,
          target_monthly: data.target_monthly || 0,
          phone: data.phone || null,
          bio: data.bio || null,
        })
        .select('token')
        .single();

      if (error) throw error;

      return {
        success: true,
        token: invitation.token,
      };
    } catch (error) {
      console.error('Error creating invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création de l\'invitation',
      };
    }
  }

  /**
   * Validate an invitation token
   */
  async validateInvitation(token: string): Promise<{
    valid: boolean;
    data?: {
      agency_id: string;
      email: string;
      role: string;
      commission_split: number;
      target_monthly: number;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('agent_invitations')
        .select('id, agency_id, email, role, commission_split, target_monthly, expires_at, status')
        .eq('token', token)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: 'Invitation invalide ou expirée',
        };
      }

      return {
        valid: true,
        data: {
          agency_id: data.agency_id,
          email: data.email,
          role: data.role || 'agent',
          commission_split: data.commission_split || 50,
          target_monthly: data.target_monthly || 0,
        },
      };
    } catch (error) {
      console.error('Error validating invitation:', error);
      return {
        valid: false,
        error: 'Erreur lors de la validation de l\'invitation',
      };
    }
  }

  /**
   * Accept an invitation and create the agent record
   * Uses the Supabase RPC function for atomic operation
   */
  async acceptInvitation(token: string, userId: string): Promise<AcceptInvitationResult> {
    try {
      const { data, error } = await supabase.rpc('accept_agent_invitation', {
        token_text: token,
        user_uuid: userId,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'acceptation de l\'invitation',
      };
    }
  }

  /**
   * Get invitation link for a given token
   */
  getInvitationLink(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/rejoindre-agence?token=${token}`;
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return false;
    }
  }

  /**
   * Get all pending invitations for an agency
   */
  async getAgencyInvitations(agencyId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_invitations')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
  }
}

export const agentInvitationService = new AgentInvitationService();
