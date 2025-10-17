import * as React from "react";
import { cn } from "@/lib/utils";

interface StickyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  offsetTop?: string; // e.g., "top-16" or "top-24"
  blur?: boolean;
}

export const StickyHeader = React.forwardRef<HTMLDivElement, StickyHeaderProps>(
  ({ children, offsetTop = "top-16", blur = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "sticky z-20 border-b bg-background transition-all duration-200",
          offsetTop,
          blur && "backdrop-blur-sm bg-background/95",
          className
        )}
        {...props}
      >
        <div className="container mx-auto px-4 py-3">
          {children}
        </div>
      </div>
    );
  }
);
StickyHeader.displayName = "StickyHeader";
