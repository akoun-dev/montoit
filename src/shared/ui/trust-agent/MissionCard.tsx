import { ReactNode } from 'react';
import { Clock, MapPin, Calendar, AlertTriangle, ChevronRight, User } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

export interface MissionCardProps {
  title: string;
  type: string;
  typeIcon?: ReactNode;
  typeColor?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  statusLabel: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  urgencyLabel: string;
  property?: {
    title: string;
    address: string;
    city: string;
  };
  agent?: {
    name: string;
    phone?: string;
  };
  scheduledDate?: Date;
  progress?: number;
  onClick?: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  in_progress: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
};

const URGENCY_CONFIG = {
  low: { color: 'text-gray-500', bg: 'bg-gray-100' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-100' },
  high: { color: 'text-orange-600', bg: 'bg-orange-100' },
  urgent: { color: 'text-red-600', bg: 'bg-red-100' },
};

export function MissionCard({
  title,
  type,
  typeIcon,
  typeColor = 'bg-primary/10 text-primary-600',
  status,
  statusLabel,
  urgency,
  urgencyLabel,
  property,
  agent,
  scheduledDate,
  progress = 0,
  onClick,
  className = '',
}: MissionCardProps) {
  const statusConfig = STATUS_CONFIG[status];
  const urgencyConfig = URGENCY_CONFIG[urgency];

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 cursor-pointer',
        'hover:shadow-lg hover:border-primary-200 hover:-translate-y-0.5',
        urgency === 'urgent' && 'border-l-4 border-l-red-500',
        onClick && 'active:scale-[0.99]',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 rounded-t-xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className={cn('p-3 rounded-xl flex-shrink-0', typeColor)}>
          {typeIcon || <div className="w-6 h-6" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                {title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{type}</p>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Badge className={cn(statusConfig.bg, statusConfig.text, 'border-0')}>
                <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', statusConfig.dot)} />
                {statusLabel}
              </Badge>
              {urgency !== 'low' && (
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', urgencyConfig.bg, urgencyConfig.color)}>
                  {urgency === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                  {urgencyLabel}
                </span>
              )}
            </div>
          </div>

          {/* Property Info */}
          {property && (
            <div className="space-y-1.5 mt-3">
              <p className="text-sm font-medium text-gray-700">{property.title}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {property.address}, {property.city}
              </p>
            </div>
          )}

          {/* Assigned Agent */}
          {agent && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600">
              <User className="h-3.5 w-3.5" />
              <span>Assigné à <span className="font-medium">{agent.name}</span></span>
            </div>
          )}

          {/* Scheduled Date */}
          {scheduledDate && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              <Clock className="h-3 w-3" />
              <span>
                Planifiée le {scheduledDate.toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Progress Indicator */}
          {progress > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{progress}%</span>
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
