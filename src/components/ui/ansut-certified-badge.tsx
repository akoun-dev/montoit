import { Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ANSUTCertifiedBadgeProps {
  status: 'not_requested' | 'pending' | 'certified' | 'rejected';
  certifiedAt?: string | null;
  variant?: 'default' | 'detailed' | 'compact';
}

const ANSUTCertifiedBadge = ({ status, certifiedAt, variant = 'default' }: ANSUTCertifiedBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'certified':
        return {
          icon: CheckCircle,
          text: 'Certifié ANSUT',
          color: 'bg-green-600 hover:bg-green-700',
          iconColor: 'text-white',
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'Certification en cours',
          color: 'bg-yellow-600 hover:bg-yellow-700',
          iconColor: 'text-white',
        };
      case 'rejected':
        return {
          icon: XCircle,
          text: 'Certification refusée',
          color: 'bg-red-600 hover:bg-red-700',
          iconColor: 'text-white',
        };
      default:
        return {
          icon: Shield,
          text: 'Non certifié',
          color: 'bg-muted hover:bg-muted/80',
          iconColor: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <Badge className={`${config.color} gap-1.5 text-xs px-2 py-1`}>
        <Icon className="h-3 w-3" />
        <span>ANSUT</span>
      </Badge>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`inline-flex items-center gap-2 ${config.color} px-4 py-2 rounded-lg text-white transition-smooth`}>
        <Icon className="h-5 w-5" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{config.text}</span>
          {status === 'certified' && certifiedAt && (
            <span className="text-xs opacity-90">
              Le {new Date(certifiedAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.color} cursor-help gap-2`}>
            <Icon className="h-4 w-4" />
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {status === 'certified' && (
            <div className="space-y-1">
              <p className="font-semibold">Bail validé par ANSUT</p>
              {certifiedAt && (
                <p className="text-xs">
                  Certifié le {new Date(certifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              <p className="text-xs">Conforme aux normes légales ivoiriennes</p>
            </div>
          )}
          {status === 'pending' && (
            <div className="space-y-1">
              <p className="font-semibold">Certification en cours</p>
              <p className="text-xs">Demande en cours d'examen (2-5 jours)</p>
            </div>
          )}
          {status === 'rejected' && (
            <div className="space-y-1">
              <p className="font-semibold">Certification refusée</p>
              <p className="text-xs">Consultez les notes pour plus de détails</p>
            </div>
          )}
          {status === 'not_requested' && (
            <div className="space-y-1">
              <p className="font-semibold">Pas de certification ANSUT</p>
              <p className="text-xs">Ce bail n'a pas demandé de certification</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ANSUTCertifiedBadge;
