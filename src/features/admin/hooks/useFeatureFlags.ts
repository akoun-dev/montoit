/**
 * Hooks React pour les Feature Flags
 *
 * Utilisation dans les composants pour conditionner l'affichage
 */

import { useState, useEffect } from 'react';
import { featureFlagsService, type FlagType } from '@/features/admin/services/featureFlags.service';

/**
 * Hook pour évaluer un seul feature flag
 */
export function useFeatureFlag(flagName: string) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    featureFlagsService.evaluateFlag(flagName)
      .then((result) => {
        if (!cancelled) {
          setEnabled(result.enabled);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(`[FeatureFlag] Error evaluating ${flagName}:`, err);
          setEnabled(false);
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [flagName]);

  return { enabled, isLoading, error };
}

/**
 * Hook pour évaluer plusieurs feature flags
 */
export function useFeatureFlags(flagNames: string[]) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = true;

    Promise.all(
      flagNames.map(async (name) => {
        try {
          const result = await featureFlagsService.evaluateFlag(name);
          return [name, result.enabled] as const;
        } catch (err) {
          console.error(`[FeatureFlag] Error evaluating ${name}:`, err);
          return [name, false] as const;
        }
      })
    )
      .then((results) => {
        if (cancelled) return;

        const flagsMap: Record<string, boolean> = {};
        for (const [name, enabled] of results) {
          flagsMap[name] = enabled;
        }
        setFlags(flagsMap);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = false;
    };
  }, [flagNames]);

  return { flags, isLoading, error };
}

/**
 * Hook pour gérer tous les feature flags (admin)
 */
export function useManageFeatureFlags() {
  const [flags, setFlags] = useState<ReturnType<typeof featureFlagsService.getFeatureFlags> extends Promise<infer T> ? T : never>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await featureFlagsService.getFeatureFlags();
      setFlags(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const createFlag = async (data: Parameters<typeof featureFlagsService.createFeatureFlag>[0]) => {
    const newFlag = await featureFlagsService.createFeatureFlag(data);
    await fetchFlags();
    return newFlag;
  };

  const updateFlag = async (id: string, data: Parameters<typeof featureFlagsService.updateFeatureFlag>[1]) => {
    const updated = await featureFlagsService.updateFeatureFlag(id, data);
    await fetchFlags();
    return updated;
  };

  const deleteFlag = async (id: string) => {
    await featureFlagsService.deleteFeatureFlag(id);
    await fetchFlags();
  };

  const toggleFlag = async (id: string, isActive: boolean) => {
    await featureFlagsService.toggleFeatureFlag(id, isActive);
    await fetchFlags();
  };

  const updateRollout = async (id: string, percentage: number) => {
    await featureFlagsService.updateRollout(id, percentage);
    await fetchFlags();
  };

  return {
    flags,
    isLoading,
    error,
    refetch: fetchFlags,
    createFlag,
    updateFlag,
    deleteFlag,
    toggleFlag,
    updateRollout,
  };
}

/**
 * Hook pour évaluer un flag et retourner une valeur par défaut si désactivé
 */
export function useFeatureFlagWithValue<T>(
  flagName: string,
  enabledValue: T,
  disabledValue: T
): { value: T; isLoading: boolean; enabled: boolean } {
  const { enabled, isLoading } = useFeatureFlag(flagName);

  return {
    value: enabled ? enabledValue : disabledValue,
    isLoading,
    enabled,
  };
}

export default useFeatureFlag;
