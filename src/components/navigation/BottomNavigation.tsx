import { Home, Search, Heart, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";
import { useFavoriteCount } from "@/hooks/useFavoriteCount";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
import { triggerHapticFeedback } from "@/utils/haptics";
import { useLongPress } from "@/hooks/useLongPress";
import { toast } from "@/hooks/use-toast";

interface NavItem {
  label: string;
  icon: typeof Home;
  path: string;
  ariaLabel: string;
  badge?: number;
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
}

// Composant séparé pour chaque bouton de navigation (optimisation)
const NavButton = memo(({ item, isActive }: NavButtonProps) => {
  const Icon = item.icon;
  
  // Feedback haptique cross-platform
  const handleClick = () => {
    triggerHapticFeedback('light');
  };

  // Long press handler for quick actions
  const handleLongPress = () => {
    if (item.path === '/messages') {
      toast({
        title: "Actions rapides",
        description: "Ouvrir un nouveau message",
      });
    }
  };

  const longPressProps = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delay: 500,
  });

  return (
    <Link
      to={item.path}
      {...longPressProps}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 relative min-h-[44px] min-w-[44px] group touch-feedback",
        isActive 
          ? "text-primary bg-primary/10" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted"
      )}
      aria-label={item.ariaLabel}
      aria-current={isActive ? "page" : undefined}
    >
      <div className="relative">
        <Icon 
          className={cn(
            "h-5 w-5 transition-all duration-200",
            isActive && "scale-110",
            !isActive && "group-hover:scale-105"
          )}
          aria-hidden="true"
        />
        
        {/* Badge de notification */}
        {item.badge && item.badge > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-4 min-w-4 px-1 flex items-center justify-center text-xs font-semibold animate-in zoom-in-50"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">{item.badge} notifications non lues</span>
            {item.badge > 99 ? "99+" : item.badge}
          </Badge>
        )}
      </div>
      
      <span 
        className={cn(
          "text-xs font-medium leading-none transition-all",
          isActive && "font-semibold"
        )}
      >
        {item.label}
      </span>
      
      {/* Indicateur d'état actif amélioré */}
      {isActive && (
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-t-full animate-in slide-in-from-bottom-1 duration-200" 
        />
      )}
    </Link>
  );
});

NavButton.displayName = "NavButton";

const BottomNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const newFavorites = useFavoriteCount();

  // Ne pas afficher sur desktop ou si l'utilisateur n'est pas connecté
  if (!isMobile || !user) return null;

  // Configuration des items de navigation avec badges réels
  const navItems: NavItem[] = useMemo(() => [
    {
      label: "Accueil",
      icon: Home,
      path: "/",
      ariaLabel: "Aller à l'accueil",
    },
    {
      label: "Recherche",
      icon: Search,
      path: "/recherche",
      ariaLabel: "Rechercher des propriétés",
    },
    {
      label: "Favoris",
      icon: Heart,
      path: "/favoris",
      ariaLabel: "Voir mes favoris",
      badge: newFavorites > 0 ? newFavorites : undefined,
    },
    {
      label: "Messages",
      icon: MessageSquare,
      path: "/messages",
      ariaLabel: "Messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      label: "Profil",
      icon: User,
      path: "/profil",
      ariaLabel: "Voir mon profil",
    },
  ], [unreadCount, newFavorites]);

  // Fonction pour déterminer si un item est actif
  const isActive = useMemo(() => {
    return (path: string) => {
      if (path === "/") return location.pathname === "/";
      return location.pathname.startsWith(path);
    };
  }, [location.pathname]);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "border-t border-border shadow-lg",
        "safe-area-inset-bottom",
        "animate-in slide-in-from-bottom-4 duration-300"
      )}
      aria-label="Navigation principale mobile"
      role="navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-screen-xl mx-auto">
        {navItems.map((item) => (
          <NavButton 
            key={item.path} 
            item={item} 
            isActive={isActive(item.path)} 
          />
        ))}
      </div>
      
      {/* Espace de sécurité pour les appareils avec encoche/barre d'accueil */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default memo(BottomNavigation);
