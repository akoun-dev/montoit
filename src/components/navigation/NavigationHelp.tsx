import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationHelpProps {
  backTo?: string;
  backLabel?: string;
  showHome?: boolean;
}

export const NavigationHelp = ({ 
  backTo, 
  backLabel = "Retour", 
  showHome = true 
}: NavigationHelpProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {backTo && (
        <Button variant="ghost" size="sm" asChild>
          <Link to={backTo} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      )}
      {showHome && (
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
        </Button>
      )}
    </div>
  );
};
