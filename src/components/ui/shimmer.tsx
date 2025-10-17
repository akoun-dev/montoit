import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
}

export const Shimmer = ({ className }: ShimmerProps) => (
  <div className={cn("relative overflow-hidden bg-muted rounded", className)}>
    <div className="shimmer-effect absolute inset-0" />
  </div>
);
