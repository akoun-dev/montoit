import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProviderCard } from './ProviderCard';
import type { ServiceConfiguration } from '../hooks/useServiceConfigurations';

interface SortableProviderCardProps {
  provider: ServiceConfiguration;
  onToggle: (enabled: boolean) => void;
}

export function SortableProviderCard({ provider, onToggle }: SortableProviderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProviderCard
        provider={provider}
        onToggle={onToggle}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
