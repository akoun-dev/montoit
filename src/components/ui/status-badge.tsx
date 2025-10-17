import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_VARIANTS, STATUS_ICONS, PROPERTY_STATUS_LABELS } from "@/constants";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all duration-300 animate-badge-appear",
  {
    variants: {
      variant: {
        success: "bg-status-success text-status-success-foreground border-status-success/30 hover:shadow-[0_0_12px_rgba(34,197,94,0.4)]",
        warning: "bg-status-warning text-status-warning-foreground border-status-warning/30 hover:shadow-[0_0_12px_rgba(251,146,60,0.4)] animate-pulse-soft",
        danger: "bg-status-danger text-status-danger-foreground border-status-danger/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]",
        info: "bg-status-info text-status-info-foreground border-status-info/30 hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]",
        neutral: "bg-status-neutral text-status-neutral-foreground border-status-neutral/30 hover:shadow-[0_0_12px_rgba(107,114,128,0.4)]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

const STATUS_TOOLTIPS: Record<string, string> = {
  disponible: "Disponible à la location",
  loué: "Déjà loué",
  loue: "Déjà loué",
  en_attente: "En cours de validation",
  retiré: "Retiré de la plateforme",
  retire: "Retiré de la plateforme",
  refuse: "Refusé par la modération",
};

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: string;
  showIcon?: boolean;
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  variant,
  size = "md",
  showIcon = true,
  showLabel = true,
  animate = false,
  className,
}: StatusBadgeProps) {
  const semanticVariant = variant || (STATUS_VARIANTS[status] as any) || "neutral";
  const Icon = STATUS_ICONS[status];
  const label = PROPERTY_STATUS_LABELS[status] || status;
  const tooltip = STATUS_TOOLTIPS[status] || label;

  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              statusBadgeVariants({ variant: semanticVariant as any, size }),
              animate && status === "en_attente" && "animate-pulse-soft",
              "hover:scale-105",
              className
            )}
            aria-label={`Statut : ${tooltip}`}
          >
            {showIcon && Icon && <Icon className={iconSize} />}
            {showLabel && <span>{label}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
