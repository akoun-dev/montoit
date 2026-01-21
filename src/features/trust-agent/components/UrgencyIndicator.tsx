import { AlertTriangle, Clock } from 'lucide-react';

interface UrgencyIndicatorProps {
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function UrgencyIndicator({
  urgency,
  size = 'md',
  showLabel = true,
  className = '',
}: UrgencyIndicatorProps) {
  const getUrgencyConfig = () => {
    switch (urgency) {
      case 'low':
        return {
          label: 'Faible',
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          icon: Clock,
        };
      case 'medium':
        return {
          label: 'Moyenne',
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200',
          icon: Clock,
        };
      case 'high':
        return {
          label: 'Élevée',
          color: 'bg-orange-500',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200',
          icon: AlertTriangle,
        };
      case 'urgent':
        return {
          label: 'Urgent',
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Inconnu',
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          icon: Clock,
        };
    }
  };

  const config = getUrgencyConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'p-1',
      dot: 'w-2 h-2',
      icon: 'w-3 h-3',
      text: 'text-xs',
      padding: 'px-2 py-1',
    },
    md: {
      container: 'p-2',
      dot: 'w-3 h-3',
      icon: 'w-4 h-4',
      text: 'text-sm',
      padding: 'px-3 py-1.5',
    },
    lg: {
      container: 'p-3',
      dot: 'w-4 h-4',
      icon: 'w-5 h-5',
      text: 'text-base',
      padding: 'px-4 py-2',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center gap-2 ${config.bgColor} ${config.borderColor} border rounded-lg ${currentSize.padding} ${className}`}
    >
      {/* Indicateur visuel de l'urgence */}
      <div className={`${currentSize.dot} ${config.color} rounded-full animate-pulse`}></div>

      {/* Icône */}
      <Icon className={`${currentSize.icon} ${config.textColor}`} />

      {/* Label si demandé */}
      {showLabel && (
        <span className={`font-medium ${config.textColor} ${currentSize.text}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Composant spécialisé pour les badges urgents
export function UrgentBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold ${className}`}
    >
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      🔴 URGENT
    </div>
  );
}
