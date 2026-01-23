import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Users,
  FileText,
  CreditCard,
  Calendar,
  Wrench,
  Award,
  Heart,
  MessageSquare,
  Search,
  X,
  Home,
  LogOut,
  Folder,
  Bell,
  Menu,
  Star,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/app/providers/AuthProvider';
import { useRef, useEffect } from 'react';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface TenantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadMessages?: number;
}

const navItems = [
  { label: 'Tableau de bord', href: '/locataire/dashboard', icon: LayoutDashboard },
  { label: 'Mon Espace', href: '/locataire/mon-espace', icon: Home },
  { label: 'Rechercher', href: '/recherche', icon: Search },
  { label: 'Mes Favoris', href: '/locataire/favoris', icon: Heart },
  { label: 'Mes Candidatures', href: '/locataire/mes-candidatures', icon: Users },
  { label: 'Mes Visites', href: '/locataire/mes-visites', icon: Calendar },
  { label: 'Mes Avis', href: '/locataire/avis', icon: Star },
  { label: 'Mes Contrats', href: '/locataire/mes-contrats', icon: FileText },
  { label: 'Mes Paiements', href: '/locataire/mes-paiements', icon: CreditCard },
  { label: 'Maintenance', href: '/locataire/maintenance', icon: Wrench },
  { label: 'Historique', href: '/locataire/profil/historique-locations', icon: Folder },
  { label: 'Messages', href: '/locataire/messages', icon: MessageSquare, hasBadge: true },
  { label: 'Notifications', href: '/locataire/notifications', icon: Bell },
  { label: 'Mon Profil', href: '/locataire/profil', icon: User },
  { label: 'Mon Score', href: '/locataire/mon-score', icon: Award },
];

const bottomItems = [{ label: 'Rechercher', href: '/recherche', icon: Search }];

export default function TenantSidebar({ isOpen, onClose, unreadMessages = 0 }: TenantSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentPath = location.pathname;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);

  const isActive = (href: string) => {
    if (href === '/locataire/dashboard') {
      return currentPath === '/locataire/dashboard' || currentPath === '/';
    }
    return currentPath.startsWith(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  // Swipe gesture support for closing sidebar on mobile
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartRef.current === null) return;
      const touchX = e.touches[0].clientX;
      const diff = touchStartRef.current - touchX;

      // Swipe left to close
      if (diff > 50 && isOpen) {
        onClose();
        touchStartRef.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
    sidebar.addEventListener('touchmove', handleTouchMove, { passive: true });
    sidebar.addEventListener('touchend', handleTouchEnd);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
      sidebar.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const focusableElements = sidebar.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when sidebar opens
    firstElement?.focus();

    sidebar.addEventListener('keydown', handleTab);
    return () => sidebar.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <>
      {/* Mobile Overlay with blur effect */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-out lg:translate-x-0 lg:z-30',
          // Desktop: always visible, full width
          'lg:w-72 lg:static lg:transform-none',
          // Mobile: slide-in from left, reduced width for better visibility
          'w-[85%] max-w-[320px]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Add shadow on mobile when open
          isOpen && 'lg:shadow-none shadow-2xl'
        )}
        aria-label="Menu de navigation latéral"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neutral-100">
          <Link to="/" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-neutral-900">MonToit</h1>
              <p className="text-[10px] sm:text-xs text-neutral-500">Espace Locataire</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2.5 hover:bg-neutral-100 rounded-lg transition-colors touch-manipulation"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all min-h-[44px] touch-manipulation',
                      active
                        ? 'bg-primary-50 text-primary-600 border border-primary-100'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-primary-500' : '')} />
                    <span className="flex-1 truncate text-sm">{item.label}</span>
                    {item.hasBadge && unreadMessages > 0 && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse flex-shrink-0">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Separator */}
          <div className="my-3 sm:my-4 border-t border-neutral-100" />

          {/* Bottom Items */}
          <ul className="space-y-0.5">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all min-h-[44px] touch-manipulation',
                      active
                        ? 'bg-primary-50 text-primary-600 border border-primary-100'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-primary-500' : '')} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-100">
          <div className="bg-primary-50 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm font-medium text-primary-700 mb-0.5 sm:mb-1">Besoin d'aide ?</p>
            <p className="text-[10px] sm:text-xs text-primary-600 mb-2 sm:mb-3">Notre équipe est là pour vous</p>
            <Link
              to="/contact"
              onClick={onClose}
              className="block text-center text-xs sm:text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 py-2 px-3 sm:px-4 rounded-lg transition-colors touch-manipulation"
            >
              Nous contacter
            </Link>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 px-3 sm:px-4 rounded-lg transition-colors border border-red-200 min-h-[44px] touch-manipulation"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
