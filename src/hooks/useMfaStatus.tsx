import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '@/services/logger';

export interface MfaStatus {
  mfaEnabled: boolean;
  backupCodesCount: number;
  unusedCodesCount: number;
  mfaRequired: boolean;
  gracePeriodDays: number;
  loading: boolean;
  complianceStatus: {
    daysRemaining: number;
    isExpired: boolean;
    expiresAt: Date | null;
  };
}

export const useMfaStatus = () => {
  const { user, roles, profile } = useAuth();
  const [status, setStatus] = useState<MfaStatus>({
    mfaEnabled: false,
    backupCodesCount: 0,
    unusedCodesCount: 0,
    mfaRequired: false,
    gracePeriodDays: 0,
    loading: true,
    complianceStatus: {
      daysRemaining: 0,
      isExpired: false,
      expiresAt: null,
    },
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        mfaEnabled: false,
        backupCodesCount: 0,
        unusedCodesCount: 0,
        mfaRequired: false,
        gracePeriodDays: 0,
        loading: false,
        complianceStatus: {
          daysRemaining: 0,
          isExpired: false,
          expiresAt: null,
        },
      });
      return;
    }

    const fetchMfaStatus = async () => {
      try {
        // Check if MFA is enabled (check if user has backup codes)
        const { data: backupCodes, error: codesError } = await supabase
          .from('mfa_backup_codes')
          .select('id, used_at')
          .eq('user_id', user.id);

        if (codesError) throw codesError;

        const totalCodes = backupCodes?.length || 0;
        const unusedCodes = backupCodes?.filter(code => !code.used_at).length || 0;
        const hasMfa = totalCodes > 0;

        // Check MFA policy for user's roles
        let isRequired = false;
        let graceDays = 0;

        if (roles.length > 0) {
          // Filter valid app_role values
          const validRoles = roles.filter(role => 
            ['admin', 'super_admin', 'tiers_de_confiance', 'user'].includes(role)
          );

          if (validRoles.length > 0) {
            const { data: policies, error: policiesError } = await supabase
              .from('mfa_policies')
              .select('role, mfa_required, grace_period_days')
              .in('role', validRoles as any);

            if (policiesError) throw policiesError;

            // If any role requires MFA, it's required
            const requiredPolicy = policies?.find(p => p.mfa_required);
            if (requiredPolicy) {
              isRequired = true;
              graceDays = requiredPolicy.grace_period_days || 0;
            }
          }
        }

        // Calculer le statut de conformité pour les admins
        let complianceStatus = {
          daysRemaining: 0,
          isExpired: false,
          expiresAt: null as Date | null,
        };

        if (isRequired && !hasMfa && profile?.created_at) {
          const createdAt = new Date(profile.created_at);
          const expiresAt = new Date(createdAt);
          expiresAt.setDate(expiresAt.getDate() + graceDays);
          
          const now = new Date();
          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          complianceStatus = {
            daysRemaining: Math.max(0, daysRemaining),
            isExpired: daysRemaining < 0,
            expiresAt,
          };
        }

        setStatus({
          mfaEnabled: hasMfa,
          backupCodesCount: totalCodes,
          unusedCodesCount: unusedCodes,
          mfaRequired: isRequired,
          gracePeriodDays: graceDays,
          loading: false,
          complianceStatus,
        });
      } catch (error) {
        logger.logError(error, { context: 'useMfaStatus', action: 'fetch' });
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchMfaStatus();
  }, [user, roles, profile]);

  const refreshStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    // Trigger re-fetch by updating a dependency
    if (user) {
      const { data: backupCodes } = await supabase
        .from('mfa_backup_codes')
        .select('id, used_at')
        .eq('user_id', user.id);

      const totalCodes = backupCodes?.length || 0;
      const unusedCodes = backupCodes?.filter(code => !code.used_at).length || 0;

      setStatus(prev => {
        // Recalculer le statut de conformité
        let complianceStatus = prev.complianceStatus;
        if (prev.mfaRequired && totalCodes === 0 && profile?.created_at) {
          const createdAt = new Date(profile.created_at);
          const expiresAt = new Date(createdAt);
          expiresAt.setDate(expiresAt.getDate() + prev.gracePeriodDays);
          
          const now = new Date();
          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          complianceStatus = {
            daysRemaining: Math.max(0, daysRemaining),
            isExpired: daysRemaining < 0,
            expiresAt,
          };
        } else if (totalCodes > 0) {
          complianceStatus = {
            daysRemaining: 0,
            isExpired: false,
            expiresAt: null,
          };
        }

        return {
          ...prev,
          mfaEnabled: totalCodes > 0,
          backupCodesCount: totalCodes,
          unusedCodesCount: unusedCodes,
          loading: false,
          complianceStatus,
        };
      });
    }
  };

  return { ...status, refreshStatus };
};
