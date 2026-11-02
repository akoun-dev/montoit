/**
 * Badge de statut pour les mandats
 */

import { Clock, CheckCircle, XCircle, AlertTriangle, Pause } from 'lucide-react';

type MandateStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended';

interface MandateStatusBadgeProps {
  status: MandateStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  MandateStatus,
  {
    label: string;
    icon: typeof Clock;
    bgColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-600',
  },
  active: {
    label: 'Actif',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
  },
  expired: {
    label: 'Expiré',
    icon: AlertTriangle,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
  suspended: {
    label: 'Suspendu',
    icon: Pause,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

const iconSizeConfig = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export default function MandateStatusBadge({ status, size = 'md' }: MandateStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeConfig[size]}`}
    >
      <Icon className={`${iconSizeConfig[size]} ${config.iconColor}`} />
      {config.label}
    </span>
  );
}
