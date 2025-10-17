import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PanoramaNavigationProps {
  panoramas: Array<{ url: string; title?: string }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
}

export const PanoramaNavigation = ({
  panoramas,
  currentIndex,
  onNavigate,
  className
}: PanoramaNavigationProps) => {
  if (panoramas.length <= 1) return null;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < panoramas.length - 1;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <Button
        size="sm"
        variant="secondary"
        disabled={!hasPrevious}
        onClick={() => onNavigate(currentIndex - 1)}
        className="shadow-lg"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Précédent
      </Button>

      <div className="flex items-center gap-2">
        {panoramas.map((_, index) => (
          <button
            key={index}
            onClick={() => onNavigate(index)}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              index === currentIndex
                ? "bg-primary w-8"
                : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
            )}
            aria-label={`Vue ${index + 1}`}
          />
        ))}
      </div>

      <Button
        size="sm"
        variant="secondary"
        disabled={!hasNext}
        onClick={() => onNavigate(currentIndex + 1)}
        className="shadow-lg"
      >
        Suivant
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
