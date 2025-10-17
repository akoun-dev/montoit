import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHelpSystem } from '@/hooks/useHelpSystem';

interface ContextualTooltipProps {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
}

export const ContextualTooltip = ({ id, title, content, videoUrl }: ContextualTooltipProps) => {
  const { trackInteraction } = useHelpSystem();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
            onClick={() => trackInteraction('tooltip', id)}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm space-y-2" side="right">
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground">{content}</p>
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-block mt-1"
            >
              Voir la vidéo explicative →
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
