import { CheckCircle, Clock, UserCheck } from 'lucide-react';

interface SignatureStatusBadgeProps {
  status: 'pending' | 'tenant_signed' | 'landlord_signed' | 'fully_signed';
  isTenant: boolean;
  compact?: boolean;
}

export function SignatureStatusBadge({
  status,
  isTenant,
  compact = false,
}: SignatureStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'fully_signed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          text: 'Signé',
          description: 'Contrat entièrement signé',
        };
      case 'tenant_signed':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: UserCheck,
          text: isTenant ? 'Votre signature' : 'Locataire signé',
          description: isTenant ? 'Vous avez signé' : 'En attente de votre signature',
        };
      case 'landlord_signed':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: UserCheck,
          text: isTenant ? 'Propriétaire signé' : 'Votre signature',
          description: isTenant ? 'En attente de votre signature' : 'Vous avez signé',
        };
      case 'pending':
      default:
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          text: 'En attente',
          description: 'En attente des signatures',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        <span>{config.text}</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${config.color}`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}
