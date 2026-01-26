/**
 * Service pour les Feature Flags
 *
 * Gestion des feature flags pour déploiement progressif
 */

import { supabase } from '@/integrations/supabase/client';

// Types de feature flags
export type FlagType = 'boolean' | 'percentage' | 'multivariate';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  flag_type: FlagType;
  is_active: boolean;
  rollout_percentage: number;
  segment_rules: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagWithStats extends FeatureFlag {
  total_users_enabled: number;
  total_users_evaluated: number;
  variants_count: number;
  evaluations_last_7_days: number;
}

export interface FeatureFlagVariant {
  id: string;
  flag_id: string;
  name: string;
  description: string | null;
  percentage: number;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  flag_name: string;
  flag_type: FlagType;
  variant_id?: string;
  rollout_percentage?: number;
}

export interface CreateFlagData {
  name: string;
  description?: string;
  flag_type: FlagType;
  is_active?: boolean;
  rollout_percentage?: number;
  segment_rules?: Record<string, any>;
}

/**
 * Service des feature flags
 */
export const featureFlagsService = {
  /**
   * Récupérer tous les feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlagWithStats[]> {
    const { data, error } = await supabase
      .from('feature_flags_with_stats')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as FeatureFlagWithStats[];
  },

  /**
   * Récupérer un feature flag par ID
   */
  async getFeatureFlag(id: string): Promise<FeatureFlag | null> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as FeatureFlag | null;
  },

  /**
   * Créer un nouveau feature flag
   */
  async createFeatureFlag(data: CreateFlagData): Promise<FeatureFlag> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: rpcResult, error } = await supabase.rpc('upsert_feature_flag', {
      p_name: data.name,
      p_description: data.description || null,
      p_flag_type: data.flag_type,
      p_is_active: data.is_active ?? true,
      p_rollout_percentage: data.rollout_percentage ?? 0,
      p_segment_rules: data.segment_rules || {},
      p_changed_by: user.id,
    });

    if (error) throw error;

    // Récupérer le flag créé
    return (await this.getFeatureFlagByName(data.name))!;
  },

  /**
   * Mettre à jour un feature flag
   */
  async updateFeatureFlag(id: string, data: Partial<CreateFlagData>): Promise<FeatureFlag> {
    const flag = await this.getFeatureFlag(id);
    if (!flag) throw new Error('Feature flag not found');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: rpcResult, error } = await supabase.rpc('upsert_feature_flag', {
      p_name: flag.name, // Le nom ne change pas
      p_description: data.description,
      p_flag_type: data.flag_type,
      p_is_active: data.is_active,
      p_rollout_percentage: data.rollout_percentage,
      p_segment_rules: data.segment_rules,
      p_changed_by: user.id,
    });

    if (error) throw error;

    return (await this.getFeatureFlagByName(flag.name))!;
  },

  /**
   * Supprimer un feature flag
   */
  async deleteFeatureFlag(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('delete_feature_flag', {
      p_flag_id: id,
      p_changed_by: user.id,
    });

    if (error) throw error;
    return (data as boolean) || false;
  },

  /**
   * Activer/désactiver un feature flag
   */
  async toggleFeatureFlag(id: string, isActive: boolean): Promise<FeatureFlag> {
    return this.updateFeatureFlag(id, { is_active: isActive });
  },

  /**
   * Modifier le rollout percentage
   */
  async updateRollout(id: string, percentage: number): Promise<FeatureFlag> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    return this.updateFeatureFlag(id, { rollout_percentage: percentage });
  },

  /**
   * Évaluer un feature flag pour l'utilisateur actuel
   */
  async evaluateFlag(flagName: string): Promise<FeatureFlagEvaluation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        enabled: false,
        flag_name: flagName,
        flag_type: 'boolean',
      };
    }

    const { data, error } = await supabase.rpc('evaluate_feature_flag', {
      p_flag_name: flagName,
      p_user_id: user.id,
    });

    if (error) throw error;
    return data as FeatureFlagEvaluation;
  },

  /**
   * Évaluer plusieurs flags d'un coup
   */
  async evaluateFlags(flagNames: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const name of flagNames) {
      const evaluation = await this.evaluateFlag(name);
      results[name] = evaluation.enabled;
    }

    return results;
  },

  /**
   * Récupérer les variantes d'un flag
   */
  async getVariants(flagId: string): Promise<FeatureFlagVariant[]> {
    const { data, error } = await supabase
      .from('feature_flag_variants')
      .select('*')
      .eq('flag_id', flagId)
      .order('name');

    if (error) throw error;
    return (data || []) as FeatureFlagVariant[];
  },

  /**
   * Ajouter une variante à un flag multivarié
   */
  async addVariant(
    flagId: string,
    variant: Omit<FeatureFlagVariant, 'id' | 'flag_id' | 'created_at'>
  ): Promise<FeatureFlagVariant> {
    const { data, error } = await supabase
      .from('feature_flag_variants')
      .insert({
        flag_id: flagId,
        name: variant.name,
        description: variant.description,
        percentage: variant.percentage,
        config: variant.config,
        is_active: variant.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as FeatureFlagVariant;
  },

  /**
   * Récupérer l'historique d'audit d'un flag
   */
  async getAuditHistory(flagId: string) {
    const { data, error } = await supabase
      .from('feature_flag_audits')
      .select(`
        *,
        changer:profiles!inner(id=changed_by)(full_name, email)
      `)
      .eq('flag_id', flagId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Rollback à une version précédente
   */
  async rollback(flagId: string, auditId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('rollback_feature_flag', {
      p_flag_id: flagId,
      p_audit_id: auditId,
      p_rolled_back_by: user.id,
    });

    if (error) throw error;
    return (data as boolean) || false;
  },

  /**
   * Helper pour récupérer un flag par nom
   */
  async getFeatureFlagByName(name: string): Promise<FeatureFlag | null> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;
    return data as FeatureFlag | null;
  },
};

export default featureFlagsService;
