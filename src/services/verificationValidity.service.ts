/**
 * Service pour la gestion des durées de validité des vérifications
 */

import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notification.service';

export type VerificationType = 'oneci' | 'cnam' | 'facial' | 'tenant_dossier' | 'owner_certification' | 'agency_certification';
export type ValidityStatus = 'active' | 'expiring_soon' | 'expired' | 'revoked';

export interface VerificationValidity {
  id: string;
  user_id: string;
  verification_type: VerificationType;
  verification_id: string | null;
  valid_from: string;
  valid_until: string;
  status: ValidityStatus;
  reminder_sent: boolean;
  expiry_notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface ValidityConfig {
  verification_type: VerificationType;
  validity_duration_months: number;
  reminder_days_before: number;
  is_active: boolean;
}

/**
 * Service de gestion des durées de validité
 */
export const verificationValidityService = {
  /**
   * Créer une validité pour une vérification
   */
  async createValidity(options: {
    userId: string;
    verificationType: VerificationType;
    verificationId?: string;
    customDurationMonths?: number;
  }): Promise<VerificationValidity> {
    const { userId, verificationType, verificationId, customDurationMonths } = options;

    // Récupérer la configuration
    const config = await this.getConfig(verificationType);
    const durationMonths = customDurationMonths || config?.validity_duration_months || 12;

    const validFrom = new Date();
    const validUntil = new Date(validFrom);
    validUntil.setMonth(validUntil.getMonth() + durationMonths);

    const { data, error } = await supabase
      .from('verification_validity')
      .insert({
        user_id: userId,
        verification_type: verificationType,
        verification_id: verificationId || null,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return data as VerificationValidity;
  },

  /**
   * Récupérer les validités d'un utilisateur
   */
  async getUserValidities(
    userId: string,
    options?: { status?: ValidityStatus; verificationType?: VerificationType }
  ): Promise<VerificationValidity[]> {
    let query = supabase
      .from('verification_validity')
      .select('*')
      .eq('user_id', userId)
      .order('valid_until', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.verificationType) {
      query = query.eq('verification_type', options.verificationType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as VerificationValidity[];
  },

  /**
   * Vérifier si une vérification est valide
   */
  async isValid(
    userId: string,
    verificationType: VerificationType,
    verificationId?: string
  ): Promise<boolean> {
    const validities = await this.getUserValidities(userId, { verificationType });

    if (validities.length === 0) return false;

    // Filtrer par verification_id si fourni
    const relevantValidities = verificationId
      ? validities.filter((v) => v.verification_id === verificationId)
      : validities;

    if (relevantValidities.length === 0) return false;

    // Vérifier si au moins une est active
    return relevantValidities.some((v) => v.status === 'active');
  },

  /**
   * Révoquer une validité
   */
  async revokeValidity(
    validityId: string,
    reason?: string
  ): Promise<void> {
    await supabase
      .from('verification_validity')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', validityId);
  },

  /**
   * Renouveler une validité
   */
  async renewValidity(
    validityId: string
  ): Promise<VerificationValidity> {
    // Récupérer la validité actuelle
    const { data: current } = await supabase
      .from('verification_validity')
      .select('*')
      .eq('id', validityId)
      .single();

    if (!current) throw new Error('Validité non trouvée');

    // Créer une nouvelle validité
    const newValidity = await this.createValidity({
      userId: current.user_id,
      verificationType: current.verification_type as VerificationType,
      verificationId: current.verification_id || undefined,
    });

    // Révoquer l'ancienne
    await this.revokeValidity(validityId);

    return newValidity;
  },

  /**
   * Mettre à jour les statuts d'expiration (cron job)
   */
  async updateExpiryStatuses(): Promise<void> {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours

    // Récupérer toutes les validités actives
    const { data: activeValidities } = await supabase
      .from('verification_validity')
      .select('*')
      .eq('status', 'active');

    if (!activeValidities) return;

    for (const validity of activeValidities as VerificationValidity[]) {
      const validUntil = new Date(validity.valid_until);
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let newStatus: ValidityStatus | null = null;

      if (daysUntilExpiry <= 0) {
        newStatus = 'expired';
      } else if (daysUntilExpiry <= 30) {
        newStatus = 'expiring_soon';
      }

      if (newStatus && newStatus !== validity.status) {
        await supabase
          .from('verification_validity')
          .update({
            status: newStatus,
            updated_at: now.toISOString(),
          })
          .eq('id', validity.id);

        // Envoyer notification si expiration
        if (newStatus === 'expiring_soon' && !validity.reminder_sent) {
          await this.sendReminderNotification(validity, daysUntilExpiry);
        } else if (newStatus === 'expired' && !validity.expiry_notification_sent) {
          await this.sendExpiryNotification(validity, Math.abs(daysUntilExpiry));
        }
      }
    }
  },

  /**
   * Envoyer une notification de rappel d'expiration
   */
  async sendReminderNotification(
    validity: VerificationValidity,
    daysLeft: number
  ): Promise<void> {
    await notificationService.sendVerificationExpiryNotification({
      userId: validity.user_id,
      verificationType: this.getVerificationTypeLabel(validity.verification_type),
      daysLeft,
      verificationId: validity.id,
    });

    // Marquer le rappel comme envoyé
    await supabase
      .from('verification_validity')
      .update({ reminder_sent: true })
      .eq('id', validity.id);
  },

  /**
   * Envoyer une notification d'expiration
   */
  async sendExpiryNotification(
    validity: VerificationValidity,
    daysSince: number
  ): Promise<void> {
    await notificationService.sendVerificationExpiryNotification({
      userId: validity.user_id,
      verificationType: this.getVerificationTypeLabel(validity.verification_type),
      daysLeft: -daysSince, // Négatif pour indiquer l'expiration
      verificationId: validity.id,
    });

    // Marquer la notification comme envoyée
    await supabase
      .from('verification_validity')
      .update({ expiry_notification_sent: true })
      .eq('id', validity.id);
  },

  /**
   * Récupérer la configuration de durée de validité
   */
  async getConfig(verificationType: VerificationType): Promise<ValidityConfig | null> {
    const { data, error } = await supabase
      .from('verification_validity_config')
      .select('*')
      .eq('verification_type', verificationType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    return data as ValidityConfig | null;
  },

  /**
   * Mettre à jour la configuration de durée de validité
   */
  async updateConfig(
    verificationType: VerificationType,
    config: Partial<Omit<ValidityConfig, 'verification_type'>>
  ): Promise<void> {
    await supabase
      .from('verification_validity_config')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('verification_type', verificationType);
  },

  /**
   * Obtenir le label lisible d'un type de vérification
   */
  getVerificationTypeLabel(type: VerificationType): string {
    const labels: Record<VerificationType, string> = {
      oneci: 'Vérification d\'identité ONECI',
      cnam: 'Vérification CNAM',
      facial: 'Vérification faciale',
      tenant_dossier: 'Dossier locataire',
      owner_certification: 'Certification propriétaire',
      agency_certification: 'Certification agence',
    };

    return labels[type] || type;
  },

  /**
   * Étendre une validité (pour les cas exceptionnels)
   */
  async extendValidity(
    validityId: string,
    additionalMonths: number
  ): Promise<VerificationValidity> {
    const { data: current } = await supabase
      .from('verification_validity')
      .select('*')
      .eq('id', validityId)
      .single();

    if (!current) throw new Error('Validité non trouvée');

    const currentValidUntil = new Date(current.valid_until);
    const newValidUntil = new Date(currentValidUntil);
    newValidUntil.setMonth(newValidUntil.getMonth() + additionalMonths);

    const { data, error } = await supabase
      .from('verification_validity')
      .update({
        valid_until: newValidUntil.toISOString(),
        status: 'active',
        reminder_sent: false,
        expiry_notification_sent: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validityId)
      .select()
      .single();

    if (error) throw error;

    return data as VerificationValidity;
  },

  /**
   * Récupérer les validités expirant bientôt (pour alertes admin)
   */
  async getExpiringSoon(daysThreshold: number = 30): Promise<VerificationValidity[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    const { data, error } = await supabase
      .from('verification_validity')
      .select('*')
      .lte('valid_until', threshold.toISOString())
      .eq('status', 'active')
      .order('valid_until', { ascending: true });

    if (error) throw error;

    return (data || []) as VerificationValidity[];
  },

  /**
   * Récupérer les statistiques de validité
   */
  async getValidityStats(): Promise<{
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    revoked: number;
    byType: Record<VerificationType, number>;
  }> {
    const { data: allValidities } = await supabase
      .from('verification_validity')
      .select('status, verification_type');

    const stats = {
      total: 0,
      active: 0,
      expiringSoon: 0,
      expired: 0,
      revoked: 0,
      byType: {} as Record<VerificationType, number>,
    };

    if (!allValidities) return stats;

    for (const v of allValidities) {
      stats.total++;
      stats[v.status as ValidityStatus]++;

      if (v.verification_type in stats.byType) {
        stats.byType[v.verification_type as VerificationType]++;
      } else {
        stats.byType[v.verification_type as VerificationType] = 1;
      }
    }

    return stats;
  },
};

export default verificationValidityService;
