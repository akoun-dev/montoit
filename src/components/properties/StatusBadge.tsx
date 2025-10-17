import { PropertyStatus } from '@/types';
import { StatusBadge as StatusBadgeUI } from '@/components/ui/status-badge';

interface StatusBadgeProps {
  status: PropertyStatus | string;
  variant?: 'default' | 'compact';
}

export const StatusBadge = ({ status, variant = 'default' }: StatusBadgeProps) => {
  return (
    <StatusBadgeUI 
      status={status}
      size={variant === 'compact' ? 'sm' : 'md'}
      animate={status === 'en_attente'}
    />
  );
};
