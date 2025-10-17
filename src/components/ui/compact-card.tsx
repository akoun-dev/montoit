import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const compactCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "shadow-sm",
        featured: "shadow-lg border-primary/20 bg-gradient-to-br from-card to-card/80",
        interactive: "shadow-sm hover:shadow-lg hover:scale-[1.01] cursor-pointer",
        stats: "shadow-md border-l-4 border-l-primary",
        elevated: "shadow-xl",
        flat: "shadow-none border-border/50",
      },
      density: {
        comfortable: "p-6",
        compact: "p-4",
        dense: "p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      density: "compact",
    },
  }
);

export interface CompactCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof compactCardVariants> {
  loading?: boolean;
}

const CompactCard = React.forwardRef<HTMLDivElement, CompactCardProps>(
  ({ className, variant, density, loading, children, ...props }, ref) => {
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(compactCardVariants({ variant, density }), className)}
          {...props}
        >
          <div className="space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(compactCardVariants({ variant, density }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CompactCard.displayName = "CompactCard";

const CompactCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inline?: boolean }
>(({ className, inline, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      inline ? "flex items-center justify-between" : "flex flex-col space-y-1",
      className
    )}
    {...props}
  />
));
CompactCardHeader.displayName = "CompactCardHeader";

const CompactCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CompactCardTitle.displayName = "CompactCardTitle";

const CompactCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
CompactCardDescription.displayName = "CompactCardDescription";

const CompactCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
));
CompactCardContent.displayName = "CompactCardContent";

const CompactCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-2", className)}
    {...props}
  />
));
CompactCardFooter.displayName = "CompactCardFooter";

export {
  CompactCard,
  CompactCardHeader,
  CompactCardFooter,
  CompactCardTitle,
  CompactCardDescription,
  CompactCardContent,
};
