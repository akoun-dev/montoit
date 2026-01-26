/**
 * Middleware d'audit pour le panneau admin
 *
 * Log automatiquement toutes les actions admin pour conformité et debugging
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * Retourne l'adresse IP du client (côté client, approximation)
 */
async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

/**
 * Loggue une action admin dans la table d'audit
 */
export async function logAdminAction(
  adminId: string,
  options: AuditLogOptions
): Promise<string | null> {
  try {
    const ipAddress = await getClientIp();

    const { data, error } = await supabase.rpc('log_admin_action', {
      p_admin_id: adminId,
      p_action: options.action,
      p_entity_type: options.entityType,
      p_entity_id: options.entityId || null,
      p_old_values: options.oldValues || {},
      p_new_values: options.newValues || {},
      p_ip_address: ipAddress,
      p_user_agent: navigator.userAgent,
      p_status_code: options.statusCode || null,
      p_error_message: options.errorMessage || null,
    });

    if (error) {
      console.error('[Audit] Failed to log action:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('[Audit] Error logging action:', error);
    return null;
  }
}

/**
 * Wrapper HOC pour logger automatiquement les appels de fonction
 */
export function withAudit<T extends (...args: unknown[]) => Promise<unknown>>(
  action: string,
  entityType: string,
  fn: T,
  getEntityId?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    let result: unknown;
    let error: unknown = null;
    let oldValues: Record<string, unknown> = {};
    let newValues: Record<string, unknown> = {};

    try {
      // Tenter de récupérer les anciennes valeurs avant modification
      if (action === 'update' && getEntityId) {
        const entityId = getEntityId(...args);
        oldValues = await fetchEntityBefore(entityType, entityId);
      }

      result = await fn(...args);

      // Récupérer les nouvelles valeurs après modification
      if (getEntityId) {
        const entityId = getEntityId(...args);
        newValues = await fetchEntityAfter(entityType, entityId);
      }

      return result;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      const adminId = await getCurrentAdminId();
      if (!adminId) {
        // Can't log without admin ID
        // Don't throw or return in finally block
      } else {
        const entityId = getEntityId?.(...args);

        await logAdminAction(adminId, {
          action,
          entityType,
          entityId,
          oldValues: action === 'update' ? oldValues : {},
          newValues: error ? {} : (action === 'create' ? newValues : newValues),
          statusCode: error ? 500 : 200,
          errorMessage: error?.message,
        });
      }
    }
  }) as T;
}

/**
 * Récupère l'ID de l'admin connecté
 */
async function getCurrentAdminId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    // Vérifier que c'est un admin
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
}

/**
 * Récupère l'état d'une entité avant modification
 */
async function fetchEntityBefore(entityType: string, entityId: string): Promise<Record<string, unknown>> {
  try {
    const tableMap: Record<string, string> = {
      user: 'profiles',
      property: 'properties',
      contract: 'lease_contracts',
      transaction: 'payments',
      mission: 'cev_missions',
      dispute: 'disputes',
      verification_application: 'verification_applications',
    };

    const table = tableMap[entityType] || entityType;

    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('id', entityId)
      .maybeSingle();

    return (data as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

/**
 * Récupère l'état d'une entité après modification
 */
async function fetchEntityAfter(entityType: string, entityId: string): Promise<Record<string, unknown>> {
  return fetchEntityBefore(entityType, entityId);
}

/**
 * Types d'actions standardisées
 */
export const AuditActions = {
  // CRUD
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',

  // Validation
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_CHANGES: 'request_changes',

  // Gestion
  SUSPEND: 'suspend',
  REACTIVATE: 'reactivate',
  VERIFY: 'verify',
  UNVERIFY: 'unverify',

  // Assignation
  ASSIGN: 'assign',
  REASSIGN: 'reassign',
  UNASSIGN: 'unassign',

  // System
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export',
  IMPORT: 'import',
  BULK_ACTION: 'bulk_action',

  // Finance
  REFUND: 'refund',
  CHARGE: 'charge',
  CANCEL_PAYMENT: 'cancel_payment',

  // Documents
  UPLOAD_DOCUMENT: 'upload_document',
  DELETE_DOCUMENT: 'delete_document',
  VALIDATE_DOCUMENT: 'validate_document',
} as const;

/**
 * Types d'entités standardisées
 */
export const AuditEntityTypes = {
  // Users
  USER: 'user',
  PROFILE: 'profile',
  ROLE: 'role',
  PERMISSION: 'permission',

  // Properties
  PROPERTY: 'property',
  PROPERTY_IMAGE: 'property_image',
  PROPERTY_AMENITY: 'property_amenity',

  // Contracts & Leases
  CONTRACT: 'contract',
  LEASE: 'lease',
  LEASE_TEMPLATE: 'lease_template',
  RENTAL_APPLICATION: 'rental_application',

  // Transactions
  TRANSACTION: 'transaction',
  PAYMENT: 'payment',
  REFUND: 'refund',
  INVOICE: 'invoice',

  // Trust Agents & CEV
  MISSION: 'mission',
  CEV_REPORT: 'cev_report',
  TRUST_AGENT: 'trust_agent',
  TRUST_AGENT_ASSIGNMENT: 'trust_agent_assignment',

  // Verification
  VERIFICATION_APPLICATION: 'verification_application',
  VERIFICATION_DOCUMENT: 'verification_document',

  // Disputes
  DISPUTE: 'dispute',
  DISPUTE_MESSAGE: 'dispute_message',
  DISPUTE_RESOLUTION: 'dispute_resolution',

  // System
  FEATURE_FLAG: 'feature_flag',
  BUSINESS_RULE: 'business_rule',
  API_KEY: 'api_key',
  AUDIT_LOG: 'audit_log',
  SYSTEM_CONFIG: 'system_config',
} as const;
