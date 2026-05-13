/**
 * Composant d'affichage du statut de vérification ONECI
 *
 * Ce composant affiche l'état de la vérification d'identité ONECI
 * pour un utilisateur (en attente, en cours, réussi, échoué)
 */

import { Card, CardContent } from '@/shared/ui/Card';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Fingerprint,
  User,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type OneciVerificationStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'verified'
  | 'failed'
  | 'expired';

export interface OneciVerificationStatusProps {
  status: OneciVerificationStatus;
  verificationType?: 'attributes' | 'face' | 'both';
  verificationDate?: string;
  expiryDate?: string;
  className?: string;
  showDetails?: boolean;
  errorMessage?: string;
}

const statusConfig = {
  not_started: {
    icon: Clock,
    iconColor: 'text-neutral-500',
    bgColor: 'bg-neutral-50',
    borderColor: 'border-neutral-200',
    textColor: 'text-neutral-700',
    title: 'Vérification non commencée',
    description:
      'Commencez la vérification d\'identité ONECI pour accéder à toutes les fonctionnalités.',
  },
  in_progress: {
    icon: Shield,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    title: 'Vérification en cours',
    description: 'Votre vérification d\'identité est en cours de traitement.',
  },
  pending_review: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    title: 'En attente de validation',
    description: 'Votre dossier est en cours de révision par nos équipes.',
  },
  verified: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    title: 'Identité vérifiée',
    description: 'Votre identité a été confirmée avec succès par l\'ONECI.',
  },
  failed: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    title: 'Vérification échouée',
    description: 'La vérification n\'a pas pu être complétée.',
  },
  expired: {
    icon: XCircle,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    title: 'Vérification expirée',
    description: 'Votre vérification a expiré. Veuillez la renouveler.',
  },
};

export function OneciVerificationStatus({
  status,
  verificationType = 'both',
  verificationDate,
  expiryDate,
  className,
  showDetails = false,
  errorMessage,
}: OneciVerificationStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const getVerificationTypeLabel = () => {
    switch (verificationType) {
      case 'attributes':
        return 'Attributs (NNI, nom, prénom, date de naissance)';
      case 'face':
        return 'Authentification faciale';
      case 'both':
        return 'Attributs + Authentification faciale';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const isExpiringSoon = expiryDate && new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <Card className={cn(config.bgColor, config.borderColor, className)}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Icone de statut */}
          <div className={cn('flex-shrink-0 p-2 rounded-full bg-white', config.borderColor)}>
            <Icon className={cn('h-6 w-6', config.iconColor)} />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn('font-semibold', config.textColor)}>{config.title}</h3>
              {status === 'verified' && isExpiringSoon && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  Expiration proche
                </span>
              )}
            </div>
            <p className={cn('text-sm mt-1', config.textColor)}>{config.description}</p>

            {errorMessage && status === 'failed' && (
              <p className="text-sm text-red-600 mt-2 bg-red-100 p-2 rounded-lg">
                {errorMessage}
              </p>
            )}

            {showDetails && (status === 'verified' || status === 'in_progress') && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Fingerprint className="h-4 w-4" />
                  <span>Type de vérification: {getVerificationTypeLabel()}</span>
                </div>

                {verificationDate && (
                  <div className="flex items-center gap-2 text-neutral-600">
                    <User className="h-4 w-4" />
                    <span>Verifié le: {formatDate(verificationDate)}</span>
                  </div>
                )}

                {expiryDate && (
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      isExpiringSoon ? 'text-amber-700' : 'text-neutral-600'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Expiration: {formatDate(expiryDate)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Version compacte du statut (pour les listes et badges)
 */
interface OneciVerificationBadgeProps {
  status: OneciVerificationStatus;
  showLabel?: boolean;
  className?: string;
}

export function OneciVerificationBadge({
  status,
  showLabel = true,
  className,
}: OneciVerificationBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        config.bgColor,
        config.borderColor,
        config.textColor,
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span>{config.title}</span>}
    </div>
  );
}

/**
 * Progression de la vérification (pour les étapes multiples)
 */
interface OneciVerificationProgressProps {
  currentStep: 'attributes' | 'face' | 'complete';
  className?: string;
}

const steps = [
  { key: 'attributes', label: 'Informations personnelles', icon: User },
  { key: 'face', label: 'Authentification faciale', icon: Fingerprint },
  { key: 'complete', label: 'Terminé', icon: CheckCircle },
];

export function OneciVerificationProgress({
  currentStep,
  className,
}: OneciVerificationProgressProps) {
  const currentStepIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div className={cn('space-y-3', className)}>
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                isActive
                  ? 'border-[#F16522] bg-[#F16522] text-white'
                  : isCompleted
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-400'
              )}
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <StepIcon className={cn('h-5 w-5', isActive ? 'text-white' : '')} />
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                isActive || isCompleted ? 'text-[#2C1810]' : 'text-neutral-400'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
