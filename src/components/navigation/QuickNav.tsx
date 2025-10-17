import { Link } from "react-router-dom";
import { Search, BookOpen, HelpCircle, Home } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickNavProps {
  variant?: "auth" | "dashboard" | "property";
}

export const QuickNav = ({ variant = "auth" }: QuickNavProps) => {
  const links = {
    auth: [
      { to: "/explorer", icon: Home, label: "Explorer les biens" },
      { to: "/guide", icon: BookOpen, label: "Comment ça marche" },
      { to: "/guide#aide", icon: HelpCircle, label: "Besoin d'aide ?" }
    ],
    dashboard: [
      { to: "/recherche", icon: Search, label: "Rechercher" },
      { to: "/explorer", icon: Home, label: "Explorer" },
      { to: "/guide", icon: BookOpen, label: "Guide" }
    ],
    property: [
      { to: "/recherche", icon: Search, label: "Autres biens" },
      { to: "/dashboard", icon: Home, label: "Mon espace" },
      { to: "/guide", icon: HelpCircle, label: "Aide" }
    ]
  };

  const currentLinks = links[variant];

  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <p className="text-sm font-medium text-foreground/80 mb-3">Accès rapide</p>
      <div className="flex flex-wrap gap-2">
        {currentLinks.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background hover:bg-primary/10 text-sm font-medium text-foreground/70 hover:text-primary transition-smooth border border-border/50"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
};
