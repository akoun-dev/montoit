import { useState } from 'react';
import { Switch } from '@/shared/ui/switch';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui';
import { ChevronDown, ChevronUp, GripVertical, Settings, Check, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ServiceConfiguration } from '../hooks/useServiceConfigurations';

interface ProviderCardProps {
  provider: ServiceConfiguration;
  onToggle: (enabled: boolean) => void;
  onPriorityChange?: (newPriority: number) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function ProviderCard({
  provider,
  onToggle,
  isDragging,
  dragHandleProps,
}: ProviderCardProps) {
  const [showConfig, setShowConfig] = useState(false);

  const getProviderIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'brevo':
        return '📧';
      case 'intouch':
        return '📱';
      case 'resend':
        return '✉️';
      case 'sinch':
        return '💬';
      default:
        return '🔌';
    }
  };

  const getStatusColor = (enabled: boolean | null) => {
    return enabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500';
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-neutral-200 p-4 transition-all',
        isDragging && 'shadow-lg ring-2 ring-primary-500',
        !provider.is_enabled && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Priority Badge */}
        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">
          {provider.priority ?? '-'}
        </div>

        {/* Provider Icon & Name */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getProviderIcon(provider.provider)}</span>
            <span className="font-medium text-neutral-900">{provider.provider}</span>
            <Badge className={getStatusColor(provider.is_enabled)}>
              {provider.is_enabled ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Actif
                </>
              ) : (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Inactif
                </>
              )}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500">{provider.service_name}</p>
        </div>

        {/* Toggle Switch */}
        <Switch checked={provider.is_enabled ?? false} onCheckedChange={onToggle} />

        {/* Config Toggle */}
        <Button variant="ghost" size="small" onClick={() => setShowConfig(!showConfig)}>
          <Settings className="w-4 h-4 mr-1" />
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Config Details */}
      {showConfig && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">Configuration</h4>
          <pre className="bg-neutral-50 rounded-lg p-3 text-xs text-neutral-600 overflow-x-auto">
            {JSON.stringify(provider.config, null, 2)}
          </pre>
          <p className="text-xs text-neutral-400 mt-2">
            Dernière mise à jour:{' '}
            {provider.updated_at
              ? new Date(provider.updated_at).toLocaleDateString('fr-FR')
              : 'N/A'}
          </p>
        </div>
      )}
    </div>
  );
}
