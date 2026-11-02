/**
 * Service d'audit pour le panneau admin
 *
 * Fournit des méthodes pratiques pour logger les actions admin
 */

import { supabase } from '@/integrations/supabase/client';
import {
  logAdminAction,
  AuditActions,
  AuditEntityTypes,
} from '@/features/admin/middleware/auditMiddleware';

/**
 * Service centralisé pour l'audit admin
 */
export const adminAuditService = {
  // ==================== USERS ====================

  /**
   * Logger la création d'un utilisateur
   */
  async logUserCreate(userId: string, userDetails: Record<string, unknown>) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.CREATE,
      entityType: AuditEntityTypes.USER,
      entityId: userId,
      newValues: userDetails,
    });
  },

  /**
   * Logger la modification d'un utilisateur
   */
  async logUserUpdate(
    userId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.UPDATE,
      entityType: AuditEntityTypes.USER,
      entityId: userId,
      oldValues,
      newValues,
    });
  },

  /**
   * Logger la suppression d'un utilisateur
   */
  async logUserDelete(userId: string, userDetails: Record<string, unknown>) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.DELETE,
      entityType: AuditEntityTypes.USER,
      entityId: userId,
      oldValues: userDetails,
    });
  },

  /**
   * Logger la suspension d'un utilisateur
   */
  async logUserSuspend(userId: string, reason: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.SUSPEND,
      entityType: AuditEntityTypes.USER,
      entityId: userId,
      newValues: { suspension_reason: reason },
    });
  },

  /**
   * Logger la réactivation d'un utilisateur
   */
  async logUserReactivate(userId: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.REACTIVATE,
      entityType: AuditEntityTypes.USER,
      entityId: userId,
    });
  },

  /**
   * Logger la vérification d'un utilisateur
   */
  async logUserVerify(userId: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.VERIFY,
      entityType: AuditEntityTypes.USER,
      entityId: userId,
      newValues: { is_verified: true },
    });
  },

  // ==================== ROLES & PERMISSIONS ====================

  /**
   * Logger l'assignation d'un rôle
   */
  async logRoleAssign(userId: string, role: string, expiresAt?: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.ASSIGN,
      entityType: AuditEntityTypes.ROLE,
      entityId: userId,
      newValues: { role, expires_at: expiresAt },
    });
  },

  /**
   * Logger la révocation d'un rôle
   */
  async logRoleRevoke(userId: string, role: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.UNASSIGN,
      entityType: AuditEntityTypes.ROLE,
      entityId: userId,
      oldValues: { role },
    });
  },

  // ==================== PROPERTIES ====================

  /**
   * Logger la validation d'une propriété
   */
  async logPropertyValidate(propertyId: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.APPROVE,
      entityType: AuditEntityTypes.PROPERTY,
      entityId: propertyId,
      newValues: { is_validated: true },
    });
  },

  /**
   * Logger le rejet d'une propriété
   */
  async logPropertyReject(propertyId: string, reason: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.REJECT,
      entityType: AuditEntityTypes.PROPERTY,
      entityId: propertyId,
      newValues: { rejection_reason: reason, is_validated: false },
    });
  },

  /**
   * Logger la certification ANSUT d'une propriété
   */
  async logPropertyANsutCertify(propertyId: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.VERIFY,
      entityType: AuditEntityTypes.PROPERTY,
      entityId: propertyId,
      newValues: { ansut_verified: true },
    });
  },

  // ==================== TRANSACTIONS ====================

  /**
   * Logger un remboursement
   */
  async logRefund(transactionId: string, amount: number, reason: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.REFUND,
      entityType: AuditEntityTypes.TRANSACTION,
      entityId: transactionId,
      newValues: { refund_amount: amount, refund_reason: reason },
    });
  },

  // ==================== DOCUMENTS ====================

  /**
   * Logger la validation d'un document
   */
  async logDocumentValidate(documentId: string, notes?: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.VALIDATE_DOCUMENT,
      entityType: AuditEntityTypes.VERIFICATION_DOCUMENT,
      entityId: documentId,
      newValues: { verification_status: 'verified', verification_notes: notes },
    });
  },

  /**
   * Logger le rejet d'un document
   */
  async logDocumentReject(documentId: string, reason: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.REJECT,
      entityType: AuditEntityTypes.VERIFICATION_DOCUMENT,
      entityId: documentId,
      newValues: { verification_status: 'rejected', rejection_reason: reason },
    });
  },

  // ==================== MISSIONS CEV ====================

  /**
   * Logger l'assignation d'une mission
   */
  async logMissionAssign(missionId: string, agentId: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.ASSIGN,
      entityType: AuditEntityTypes.MISSION,
      entityId: missionId,
      newValues: { assigned_agent_id: agentId },
    });
  },

  /**
   * Logger la réassignation d'une mission
   */
  async logMissionReassign(missionId: string, oldAgentId: string, newAgentId: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.REASSIGN,
      entityType: AuditEntityTypes.MISSION,
      entityId: missionId,
      oldValues: { assigned_agent_id: oldAgentId },
      newValues: { assigned_agent_id: newAgentId },
    });
  },

  // ==================== DISPUTES ====================

  /**
   * Logger la résolution d'un litige
   */
  async logDisputeResolve(disputeId: string, resolution: string) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.APPROVE,
      entityType: AuditEntityTypes.DISPUTE,
      entityId: disputeId,
      newValues: { status: 'resolved', resolution },
    });
  },

  // ==================== SYSTEM ====================

  /**
   * Logger l'export de données
   */
  async logExport(entityType: string, format: string, recordCount?: number) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.EXPORT,
      entityType: `export_${entityType}`,
      newValues: { format, record_count: recordCount },
    });
  },

  /**
   * Logger une action en masse
   */
  async logBulkAction(entityType: string, action: string, affectedIds: string[]) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.BULK_ACTION,
      entityType: `bulk_${entityType}`,
      newValues: { action, affected_count: affectedIds.length, affected_ids: affectedIds },
    });
  },

  /**
   * Logger la modification d'un feature flag
   */
  async logFeatureFlagToggle(flagId: string, oldState: boolean, newState: boolean) {
    const adminId = await this.getCurrentAdminId();
    if (!adminId) return;

    return logAdminAction(adminId, {
      action: AuditActions.UPDATE,
      entityType: AuditEntityTypes.FEATURE_FLAG,
      entityId: flagId,
      oldValues: { is_active: oldState },
      newValues: { is_active: newState },
    });
  },

  // ==================== HELPERS ====================

  /**
   * Récupère l'ID de l'admin connecté
   */
  async getCurrentAdminId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      const isAdmin = profile.user_type === 'admin' || profile.user_type === 'admin_ansut';
      if (!isAdmin) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'admin_ansut'])
          .maybeSingle();

        if (!roles) return null;
      }

      return profile.id;
    } catch {
      return null;
    }
  },

  /**
   * Récupère l'historique d'audit pour une entité
   */
  async getEntityHistory(entityType: string, entityId: string, limit = 50) {
    const { data, error } = await supabase.rpc('get_entity_audit_history', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: limit,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Récupère les statistiques d'audit pour un admin
   */
  async getAuditStats(adminId: string) {
    const { data, error } = await supabase
      .from('admin_audit_stats')
      .select('*')
      .eq('admin_id', adminId)
      .single();

    if (error) throw error;
    return data;
  },
};

export default adminAuditService;
