import { ReactNode } from "react";
import { LazyIllustration } from "@/components/illustrations/LazyIllustration";
import { getIllustrationPath, cn } from "@/lib/utils";
import { type IllustrationKey } from "@/assets/illustrations/ivorian/illustrationPaths";

interface IllustratedSectionProps {
  illustration: IllustrationKey;
  title: string;
  description?: string | ReactNode;
  side?: "left" | "right";
  animate?: boolean;
  children?: ReactNode;
  className?: string;
}

export const IllustratedSection = ({
  illustration,
  title,
  description,
  side = "left",
  animate = true,
  children,
  className
}: IllustratedSectionProps) => {
  const illustrationPath = getIllustrationPath(illustration);

  return (
    <div className={cn(
      "grid md:grid-cols-2 gap-8 items-center",
      className
    )}>
      {side === "left" && (
        <LazyIllustration
          src={illustrationPath}
          alt={title}
          className="w-full h-[300px] md:h-[400px] rounded-2xl"
          animate={animate}
        />
      )}
      
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        {description && (
          typeof description === "string" ? (
            <p className="text-lg text-muted-foreground">{description}</p>
          ) : description
        )}
        {children}
      </div>

      {side === "right" && (
        <LazyIllustration
          src={illustrationPath}
          alt={title}
          className="w-full h-[300px] md:h-[400px] rounded-2xl"
          animate={animate}
        />
      )}
    </div>
  );
};
