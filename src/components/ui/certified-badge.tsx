import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

interface CertifiedBadgeProps {
  variant?: "default" | "compact";
  clickable?: boolean;
}

const CertifiedBadge = ({ variant = "default", clickable = true }: CertifiedBadgeProps) => {
  const content = (
    <div className="inline-flex items-center gap-2 bg-background border-2 border-secondary px-4 py-2 rounded-full shadow-card hover:shadow-primary transition-smooth">
      <Shield className="h-5 w-5 text-secondary fill-secondary/20" />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
          Certifié ANSUT
        </span>
        {variant === "default" && (
          <span className="text-xs text-muted-foreground">
            Plateforme sécurisée
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link to="/certification" className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
};

export default CertifiedBadge;
