import { Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/utils';

interface ANSUTCertificationBadgeProps {
  status: 'certified' | 'partial' | 'pending' | 'none';
  certifiedAt?: string | null;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  certified: {
    label: 'Certifié ANSUT',
    description: "Ce contrat a été vérifié et certifié par l'ANSUT",
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
    iconColor: 'text-green-600',
    badgeVariant: 'default' as const,
  },
  partial: {
    label: 'Certification partielle',
    description: 'Certification en cours - certaines vérifications sont en attente',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
    badgeVariant: 'secondary' as const,
  },
  pending: {
    label: 'En attente',
    description: "La certification ANSUT n'a pas encore été demandée",
    icon: Clock,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    iconColor: 'text-gray-500',
    badgeVariant: 'outline' as const,
  },
  none: {
    label: 'Non certifié',
    description: "Ce contrat n'est pas certifié ANSUT",
    icon: AlertCircle,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    iconColor: 'text-gray-400',
    badgeVariant: 'outline' as const,
  },
};

const sizeConfig = {
  sm: {
    container: 'p-1.5',
    icon: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    container: 'p-2',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
  lg: {
    container: 'p-3',
    icon: 'h-5 w-5',
    text: 'text-base',
  },
};

export function ANSUTCertificationBadge({
  status,
  certifiedAt,
  className,
  showLabel = true,
  size = 'md',
}: ANSUTCertificationBadgeProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const formattedDate = certifiedAt
    ? new Date(certifiedAt).toLocaleDateString('fr-CI', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border',
              config.color,
              sizeStyles.container,
              className
            )}
          >
            <Shield className={cn(sizeStyles.icon, config.iconColor)} />
            {showLabel && (
              <span className={cn('font-medium', sizeStyles.text)}>{config.label}</span>
            )}
            {status === 'certified' && <Icon className={cn(sizeStyles.icon, 'text-green-600')} />}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {formattedDate && (
              <p className="text-xs text-muted-foreground">Certifié le {formattedDate}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact inline version for lists
export function ANSUTBadgeInline({
  status,
}: {
  status: 'certified' | 'partial' | 'pending' | 'none';
}) {
  const config = statusConfig[status];

  if (status === 'none') return null;

  return (
    <Badge variant={config.badgeVariant} className="text-xs">
      <Shield className="h-3 w-3 mr-1" />
      {status === 'certified' ? 'ANSUT' : status === 'partial' ? 'Partiel' : 'En attente'}
    </Badge>
  );
}
