import { Link, useLocation } from 'react-router-dom';
import { Home, Map, PlusCircle, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * Bottom Navigation Bar pour mobile
 * - Navigation fixe en bas de l'écran
 * - 5 items principaux
 * - Active state visible
 * - Safe area support
 * - Animations au tap
 */
export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { 
      icon: Home, 
      label: 'Accueil', 
      path: '/',
      color: 'text-blue-600'
    },
    { 
      icon: Map, 
      label: 'Carte', 
      path: '/carte-intelligente',
      color: 'text-green-600'
    },
    { 
      icon: PlusCircle, 
      label: 'Publier', 
      path: '/publier',
      color: 'text-orange-600',
      special: true // Bouton central plus gros
    },
    { 
      icon: Heart, 
      label: 'Favoris', 
      path: '/favoris',
      color: 'text-red-600'
    },
    { 
      icon: User, 
      label: 'Profil', 
      path: '/profil',
      color: 'text-purple-600'
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border z-50 pb-safe shadow-lg md:hidden"
      role="navigation"
      aria-label="Navigation principale mobile"
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-colors",
                "active:scale-95 transition-transform duration-150",
                active ? item.color : "text-muted-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Indicateur actif */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-current rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icône */}
              <div className={cn(
                "relative transition-all duration-200",
                item.special && "scale-110"
              )}>
                {item.special && (
                  <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 -z-10" />
                )}
                <Icon 
                  className={cn(
                    "transition-all duration-200",
                    active ? "h-6 w-6" : "h-5 w-5",
                    item.special && "h-7 w-7"
                  )} 
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>

              {/* Label */}
              <span className={cn(
                "text-xs mt-1 font-medium transition-all duration-200",
                active ? "opacity-100 scale-100" : "opacity-70 scale-95"
              )}>
                {item.label}
              </span>

              {/* Badge notification (exemple pour Favoris) */}
              {item.path === '/favoris' && (
                <div className="absolute top-2 right-4 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

