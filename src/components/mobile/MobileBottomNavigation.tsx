/**
 * Mobile Bottom Navigation Component for Mon Toit App
 *
 * This component provides a mobile-optimized bottom navigation bar
 * with haptic feedback and smooth transitions.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Map, MessageSquare, User, Plus, Heart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBottomNavigation, useMobileActionButtons } from '@/lib/mobileNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface BottomNavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  disabled?: boolean;
}

const defaultNavigationItems: BottomNavigationItem[] = [
  {
    id: 'home',
    label: 'Accueil',
    icon: Home,
    path: '/',
  },
  {
    id: 'search',
    label: 'Recherche',
    icon: Search,
    path: '/recherche',
  },
  {
    id: 'map',
    label: 'Carte',
    icon: Map,
    path: '/carte',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    badge: 0, // Will be updated dynamically
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: User,
    path: '/profil',
  },
];

interface MobileBottomNavigationProps {
  items?: BottomNavigationItem[];
  showAddButton?: boolean;
  addButtonPath?: string;
  className?: string;
}

export function MobileBottomNavigation({
  items = defaultNavigationItems,
  showAddButton = true,
  addButtonPath = '/ajouter-bien',
  className,
}: MobileBottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isVisible, activeTab, setActiveTab } = useBottomNavigation();
  const { actions, clearActions } = useMobileActionButtons();

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const handleNavigate = async (item: BottomNavigationItem, index: number) => {
    if (item.disabled) return;

    await setActiveTab(index);
    navigate(item.path);

    // Clear any floating actions when navigating
    clearActions();
  };

  const handleAddButton = async () => {
    navigate(addButtonPath);
    clearActions();
  };

  // Get current active index
  const activeIndex = items.findIndex(item => item.path === location.pathname);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border",
      "safe-area-bottom", // Add padding for iPhone notch
      className
    )}>
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === (activeIndex >= 0 ? activeIndex : activeTab);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item, index)}
              disabled={item.disabled}
              className={cn(
                "flex flex-col items-center justify-center min-w-[60px] max-w-[80px] py-2 px-1",
                "transition-all duration-200 ease-in-out",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium truncate transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Add Button */}
        {showAddButton && (
          <div className="flex flex-col items-center justify-center min-w-[60px] max-w-[80px] py-2 px-1">
            <Button
              onClick={handleAddButton}
              size="sm"
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <span className="text-xs mt-1 font-medium text-muted-foreground">
              Ajouter
            </span>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      {actions.length > 0 && (
        <div className="absolute bottom-20 right-4 flex flex-col gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              onClick={action.onPress}
              variant={action.variant === 'danger' ? 'destructive' :
                       action.variant === 'secondary' ? 'secondary' : 'default'}
              size="sm"
              className="min-w-[120px] justify-start gap-2 shadow-lg"
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mobile Safe Area Component
 */
export function MobileSafeArea({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      "pb-16", // Space for bottom navigation
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Mobile Layout Component
 */
export function MobileLayout({
  children,
  showBottomNavigation = true,
  navigationProps,
  className,
}: {
  children: React.ReactNode;
  showBottomNavigation?: boolean;
  navigationProps?: Partial<MobileBottomNavigationProps>;
  className?: string;
}) {
  return (
    <MobileSafeArea className={className}>
      <div className="flex flex-col min-h-screen">
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Bottom Navigation */}
        {showBottomNavigation && <MobileBottomNavigation {...navigationProps} />}
      </div>
    </MobileSafeArea>
  );
}

/**
 * Mobile Header Component
 */
export function MobileHeader({
  title,
  showBackButton = false,
  onBackPress,
  rightActions,
  className,
}: {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-background border-b border-border",
      "safe-area-top", // Add padding for iPhone notch
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackPress}
              className="h-8 w-8 p-0"
            >
              <span className="text-lg">←</span>
            </Button>
          )}
          <h1 className="text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
        </div>

        {rightActions && (
          <div className="flex items-center gap-2">
            {rightActions}
          </div>
        )}
      </div>
    </header>
  );
}