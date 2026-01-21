import { CheckCircle, Clock, AlertTriangle, ArrowUpCircle } from 'lucide-react';

interface DisputeStatusBadgeProps {
  status: 'assigned' | 'under_mediation' | 'awaiting_response' | 'resolved' | 'escalated';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function DisputeStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: DisputeStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'assigned':
        return {
          label: 'Assigné',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Clock,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
        };
      case 'under_mediation':
        return {
          label: 'En médiation',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
        };
      case 'awaiting_response':
        return {
          label: 'En attente',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
        };
      case 'resolved':
        return {
          label: 'Résolu',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
        };
      case 'escalated':
        return {
          label: 'Escaladé',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: ArrowUpCircle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
        };
      default:
        return {
          label: 'Inconnu',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${config.color} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
