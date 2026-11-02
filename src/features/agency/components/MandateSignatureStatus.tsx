/**
 * Composant d'affichage du statut de signature d'un mandat
 */

import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature,
  User,
  Building2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

interface MandateSignatureStatusProps {
  ownerSignedAt: string | null;
  agencySignedAt: string | null;
  signatureStatus: string | null;
  compact?: boolean;
  className?: string;
}

export function MandateSignatureStatus({
  ownerSignedAt,
  agencySignedAt,
  signatureStatus,
  compact = false,
  className,
}: MandateSignatureStatusProps) {
  const getStatusConfig = () => {
    if (signatureStatus === 'completed' || (ownerSignedAt && agencySignedAt)) {
      return {
        label: 'Signé par les deux parties',
        icon: CheckCircle2,
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-300',
      };
    }

    if (signatureStatus === 'failed') {
      return {
        label: 'Échec de signature',
        icon: XCircle,
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-300',
      };
    }

    if (signatureStatus === 'expired') {
      return {
        label: 'Signature expirée',
        icon: AlertCircle,
        variant: 'secondary' as const,
        className: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    }

    if (ownerSignedAt && !agencySignedAt) {
      return {
        label: 'En attente agence',
        icon: Clock,
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    }

    if (!ownerSignedAt && agencySignedAt) {
      return {
        label: 'En attente propriétaire',
        icon: Clock,
        variant: 'secondary' as const,
        className: 'bg-purple-100 text-purple-800 border-purple-300',
      };
    }

    return {
      label: 'En attente de signature',
      icon: FileSignature,
      variant: 'outline' as const,
      className: 'bg-muted text-muted-foreground',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <Badge variant={config.variant} className={cn(config.className, className)}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status badge */}
      <Badge variant={config.variant} className={cn(config.className, 'text-sm py-1 px-3')}>
        <Icon className="h-4 w-4 mr-2" />
        {config.label}
      </Badge>

      {/* Signature details */}
      <div className="flex items-center gap-4 text-sm">
        {/* Owner signature */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              ownerSignedAt ? 'bg-green-100' : 'bg-muted'
            )}
          >
            <User
              className={cn('h-4 w-4', ownerSignedAt ? 'text-green-600' : 'text-muted-foreground')}
            />
          </div>
          <div>
            <p className="font-medium">Propriétaire</p>
            {ownerSignedAt ? (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Signé
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">En attente</p>
            )}
          </div>
        </div>

        {/* Connector */}
        <div className="flex-1 h-0.5 bg-muted max-w-12" />

        {/* Agency signature */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              agencySignedAt ? 'bg-green-100' : 'bg-muted'
            )}
          >
            <Building2
              className={cn('h-4 w-4', agencySignedAt ? 'text-green-600' : 'text-muted-foreground')}
            />
          </div>
          <div>
            <p className="font-medium">Agence</p>
            {agencySignedAt ? (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Signé
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">En attente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MandateSignatureStatus;
