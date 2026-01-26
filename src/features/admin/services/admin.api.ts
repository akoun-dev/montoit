/**
 * Service API pour l'administration
 *
 * Ce service centralise toutes les opérations administratives avec validation stricte des permissions.
 */

import { supabase } from '@/services/supabase/client';
import { requirePermission, requireRole } from '@/shared/services/roleValidation.service';
import type { Json } from '@/integrations/supabase/types';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: Json;
  category: string;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string;
  is_verified: boolean | null;
  trust_score: number | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface SystemStats {
  total_users: number;
  total_properties: number;
  total_contracts: number;
  active_listings: number;
  pending_applications: number;
  verification_requests: number;
}

export interface PlatformStats {
  total_users: number;
  total_properties: number;
  total_leases: number;
  active_leases: number;
  total_payments: number;
  total_visits: number;
  pending_verifications: number;
  pending_maintenance: number;
  total_revenue: number;
  monthly_growth: number;
  error_rate: number;
  uptime: number;
  total_conversations?: number;
  total_messages?: number;
  total_feedbacks?: number;
}

/**
 * API d'administration sécurisée
 */
export const adminApi = {
  /**
   * Récupère tous les paramètres système
   */
  getSystemSettings: async (category?: string): Promise<SystemSetting[]> => {
    await requirePermission('canAccessAdminPanel')();

    let query = supabase.from('system_settings').select('*').order('category').order('setting_key');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as SystemSetting[];
  },

  /**
   * Met à jour un paramètre système
   */
  updateSystemSetting: async (id: string, setting_value: Json): Promise<SystemSetting> => {
    await requirePermission('canAccessAdminPanel')();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('system_settings')
      .update({
        setting_value,
        updated_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SystemSetting;
  },

  /**
   * Récupère la liste des utilisateurs avec pagination
   */
  getUsers: async (
    page = 1,
    limit = 50,
    filters?: {
      user_type?: string;
      is_verified?: boolean;
      search?: string;
    }
  ): Promise<{ users: UserProfile[]; total: number }> => {
    await requirePermission('canManageUsers')();

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters?.user_type) {
      query = query.eq('user_type', filters.user_type);
    }
    if (filters?.is_verified !== undefined) {
      query = query.eq('is_verified', filters.is_verified);
    }
    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      users: data as UserProfile[],
      total: count || 0,
    };
  },

  /**
   * Vérifie un utilisateur
   */
  verifyUser: async (userId: string, verifiedBy?: string): Promise<UserProfile> => {
    await requirePermission('canVerifyUsers')();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_verified: true,
        verified_by: verifiedBy || (await supabase.auth.getUser()).data.user?.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  /**
   * Suspend un utilisateur
   */
  suspendUser: async (userId: string, reason: string): Promise<UserProfile> => {
    await requirePermission('canManageUsers')();

    // Get current metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        metadata: {
          ...(profile?.metadata || {}),
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
        },
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  /**
   * Réactive un utilisateur suspendu
   */
  reactivateUser: async (userId: string): Promise<UserProfile> => {
    await requirePermission('canManageUsers')();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        metadata: {
          suspension_reason: null,
          suspended_at: null,
        },
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  /**
   * Modifie le rôle d'un utilisateur
   */
  changeUserRole: async (userId: string, newRole: string): Promise<UserProfile> => {
    await requirePermission('canManageUsers')();

    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .single();

    const currentUser = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        user_type: newRole,
        metadata: {
          ...(profile?.metadata || {}),
          role_changed_at: new Date().toISOString(),
          role_changed_by: currentUser?.id,
        },
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  /**
   * Récupère les statistiques système
   */
  getSystemStats: async (): Promise<SystemStats> => {
    await requirePermission('canAccessAdminPanel')();

    const [usersRes, propertiesRes, contractsRes, listingsRes, applicationsRes] = await Promise.all(
      [
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('properties').select('id', { count: 'exact' }),
        supabase.from('contracts').select('id', { count: 'exact' }),
        supabase.from('properties').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('applications').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]
    );

    return {
      total_users: usersRes.count || 0,
      total_properties: propertiesRes.count || 0,
      total_contracts: contractsRes.count || 0,
      active_listings: listingsRes.count || 0,
      pending_applications: applicationsRes.count || 0,
      verification_requests: 0, // À implémenter avec la table appropriée
    };
  },

  /**
   * Supprime un utilisateur (soft delete)
   */
  deleteUser: async (userId: string, reason: string): Promise<void> => {
    await requirePermission('canManageUsers')();

    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: reason,
        deleted_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Récupère les logs d'audit
   */
  getAuditLogs: async (
    page = 1,
    limit = 100,
    filters?: {
      user_id?: string;
      action?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<{ logs: unknown[]; total: number }> => {
    await requireRole(['admin', 'admin_ansut']);

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
    };
  },

  /**
   * Récupère les statistiques de plateforme via RPC
   */
  getPlatformStats: async (): Promise<PlatformStats> => {
    await requirePermission('canAccessAdminPanel')();

    const { data, error } = await supabase.rpc('get_platform_stats');

    if (error) throw error;

    // Convertir les données JSON en PlatformStats
    return data as PlatformStats;
  },

  /**
   * Récupère les logs d'audit admin (table admin_audit_logs)
   */
  getAdminAuditLogs: async (limit = 20): Promise<unknown[]> => {
    await requireRole(['admin', 'admin_ansut']);

    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('id, action, entity_type, user_email, created_at, details')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  },
};
