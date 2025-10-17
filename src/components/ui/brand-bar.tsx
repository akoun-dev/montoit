import { cn } from "@/lib/utils";

interface BrandBarProps {
  className?: string;
}

export const BrandBar = ({ className }: BrandBarProps) => {
  return (
    <div 
      className={cn(
        "h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary",
        "animate-gradient bg-[length:200%_auto]",
        className
      )}
      role="presentation"
      aria-hidden="true"
    />
  );
};
