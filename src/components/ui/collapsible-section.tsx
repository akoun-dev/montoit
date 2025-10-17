import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
  className?: string;
  storageKey?: string; // Pour sauvegarder l'état dans localStorage
}

export const CollapsibleSection = ({
  title,
  defaultOpen = false,
  badge,
  children,
  className,
  storageKey,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = React.useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : defaultOpen;
    }
    return defaultOpen;
  });

  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(isOpen));
    }
  }, [isOpen, storageKey]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("space-y-2", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 hover:bg-accent transition-colors group">
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
          <h3 className="text-base font-semibold">{title}</h3>
          {badge !== undefined && (
            <Badge variant="secondary" className="ml-2">
              {badge}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {isOpen ? "Masquer" : "Afficher"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-lg border bg-card p-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
