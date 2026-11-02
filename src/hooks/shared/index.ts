// Re-export depuis le hook useDebounce parent
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
  useDebouncedFilters,
  useDebouncedAutoSave,
  DEBOUNCE_DELAYS,
} from './useDebounce';

// Export all shared hooks
export { useAnalytics } from './useAnalytics';
export { useBreakpoint } from './useBreakpoint';
export { useBusinessRule } from './useBusinessRule';
export { useConfetti } from './useConfetti';
export { useContextualRoles } from './useContextualRoles';
export { useErrorHandler } from './useErrorHandler';
export { useFeatureFlag } from './useFeatureFlag';
export { useFormValidation } from './useFormValidation';
export { useHomeStats } from './useHomeStats';
export { useLocalStorage } from './useLocalStorage';
export { useMapboxToken } from './useMapboxToken';
export { useParallax } from './useParallax';
export { usePermissions } from './usePermissions';
export { useProfileGuard } from './useProfileGuard';
export { useSafeToast } from './useSafeToast';
export { useScrollAnimation } from './useScrollAnimation';
export { useToast } from './useToast';
export { useUserRoles } from './useUserRoles';
