/**
 * Composants pour l'intégration ONECI
 *
 * Export principal des composants de vérification d'identité ONECI
 */

export { OneciVerificationForm } from './OneciVerificationForm';
export type {
  OneciFormData,
  OneciVerificationFormProps,
} from './OneciVerificationForm';

export { OneciFaceAuth } from './OneciFaceAuth';
export type { OneciFaceAuthProps } from './OneciFaceAuth';

export {
  OneciVerificationStatus,
  OneciVerificationBadge,
  OneciVerificationProgress,
} from './OneciVerificationStatus';
export type {
  OneciVerificationStatus,
  OneciVerificationStatusProps,
  OneciVerificationBadgeProps,
  OneciVerificationProgressProps,
} from './OneciVerificationStatus';
