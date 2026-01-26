/**
 * Badge pour afficher le statut d'un dossier de verification
 *
 * Affiche le statut avec une couleur et un icône appropriés.
 */

import { CheckCircle2, Clock, AlertCircle, FileText, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { DossierStatus } from '@/features/verification/services/verificationApplications.service';

export interface DossierStatusBadgeProps {
  status: DossierStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    icon: Clock,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  in_review: {
    label: 'En cours',
    icon: FileText,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  approved: {
    label: 'Approuvé',
    icon: CheckCircle2,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  rejected: {
    label: 'Rejeté',
    icon: XCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  more_info_requested: {
    label: 'Infos demandées',
    icon: AlertCircle,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function DossierStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: DossierStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        SIZE_CLASSES[size],
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
}

export default DossierStatusBadge;
