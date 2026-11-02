import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from './badge';

interface VerificationBadgeProps {
  type: 'oneci' | 'face';
  status: 'verified' | 'pending' | 'failed' | 'not_started' | null;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ type, status }) => {
  const getLabel = () => {
    switch (type) {
      case 'oneci':
        return 'ONECI';
      case 'face':
        return 'Vérification faciale';
      default:
        return '';
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'verified':
        return 'success' as const;
      case 'pending':
        return 'warning' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'pending':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'failed':
        return <XCircle className="h-3 w-3 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'verified':
        return 'Vérifié';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      default:
        return 'Non commencé';
    }
  };

  return (
    <Badge variant={getVariant()} className="flex items-center gap-1">
      {getIcon()}
      <span>
        {getLabel()}: {getStatusText()}
      </span>
    </Badge>
  );
};

export default VerificationBadge;
