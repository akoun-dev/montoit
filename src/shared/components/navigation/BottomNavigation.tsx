import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUnreadCount } from '@/hooks/messaging/useUnreadCount';

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
  badge?: number;
  requiresAuth?: boolean;
  allowedUserTypes?: Array<'proprietaire' | 'agence' | 'locataire'>;
}

export default function BottomNavigation() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { count: unreadCount } = useUnreadCount();

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const navItems: NavItem[] = [
    { icon: Home, label: 'Accueil', href: '/' },
    { icon: Search, label: 'Recherche', href: '/recherche' },
    {
      icon: PlusCircle,
      label: 'Publier',
      href: '/ajouter-propriete',
      allowedUserTypes: ['proprietaire', 'agence'],
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      href: '/messages',
      badge: unreadCount,
      requiresAuth: true,
    },
    { icon: User, label: 'Profil', href: user ? '/profil' : '/connexion' },
  ];

  // Hide on certain pages
  const hiddenRoutes = ['/connexion', '/inscription', '/completer-profil'];
  if (hiddenRoutes.some((route) => location.pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-[#EFEBE9] shadow-[0_-4px_20px_rgba(44,24,16,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="navigation"
      aria-label="Navigation principale mobile"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          // Hide auth-required items for non-authenticated users
          if (item.requiresAuth && !user) return null;
          // Hide items restricted to specific user types
          if (item.allowedUserTypes && profile?.user_type && !item.allowedUserTypes.includes(profile.user_type as any)) return null;

          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 ${
                active ? 'text-[#F16522]' : 'text-[#A69B95] hover:text-[#6B5A4E]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={`h-6 w-6 transition-transform duration-200 ${
                    active ? 'scale-110' : ''
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {/* Badge for unread messages */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium transition-all duration-200 ${
                  active ? 'font-semibold' : ''
                }`}
              >
                {item.label}
              </span>
              {/* Active indicator */}
              {active && <div className="absolute bottom-1 w-8 h-1 bg-[#F16522] rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
