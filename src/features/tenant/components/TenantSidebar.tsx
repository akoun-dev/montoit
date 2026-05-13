/**
 * Sidebar pour les locataires - même structure que les propriétaires
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  User,
  FileText,
  Users,
  MessageSquare,
  Search,
  X,
  LogOut,
  Key,
  CreditCard,
  Calendar,
  Wrench,
  Heart,
  Folder,
  Bell,
  Star,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEffect, useRef } from 'react';
import { useMenuCounters } from '@/hooks/useMenuCounters';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface TenantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navSections = [
  {
    title: 'Accueil',
    items: [
      { label: 'Tableau de bord', href: '/locataire/dashboard', icon: LayoutDashboard },
      { label: 'Mon Espace', href: '/locataire/mon-espace', icon: Home },
      { label: 'Chercher un bien', href: '/recherche', icon: Search },
      { label: 'Mes favoris', href: '/locataire/favoris', icon: Heart },
    ],
  },
  {
    title: 'Location',
    items: [
      { label: 'Mes Candidatures', href: '/locataire/mes-candidatures', icon: Users, counterKey: 'pendingApplications' as const },
      { label: 'Mes Visites', href: '/locataire/mes-visites', icon: Calendar, counterKey: 'pendingVisits' as const },
      { label: 'Mes Contrats', href: '/locataire/mes-contrats', icon: FileText },
      { label: 'Mes Paiements', href: '/locataire/mes-paiements', icon: CreditCard },
    ],
  },

  {
    title: 'Messages',
    items: [
      { label: 'Mes messages', href: '/locataire/messages', icon: MessageSquare, counterKey: 'unreadMessages' as const },
      { label: 'Mes notifications', href: '/locataire/notifications', icon: Bell, counterKey: 'unreadNotifications' as const },
    ],
  },  
  {
    title: 'Compte',
    items: [
      { label: 'Mes avis', href: '/locataire/avis', icon: Star },
      { label: 'Maintenance', href: '/locataire/maintenance', icon: Wrench },
      { label: 'Historique', href: '/locataire/profil/historique-locations', icon: Folder },
      { label: 'Paramètres', href: '/locataire/parametres', icon: Settings },
    ],
  },

];


export default function TenantSidebar({ isOpen, onClose }: TenantSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { counters } = useMenuCounters();
  const currentPath = location.pathname;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);

  const displayName = profile?.full_name?.trim() || 'Locataire';

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

  // Swipe gesture support
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

      if (diff > 50 && isOpen) {
        onClose();
        touchStartRef.current = null;
      }
    };

    const handleEnd = () => {
      touchStartRef.current = null;
    };

    sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
    sidebar.addEventListener('touchmove', handleTouchMove, { passive: true });
    sidebar.addEventListener('touchend', handleEnd);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
      sidebar.removeEventListener('touchend', handleEnd);
    };
  }, [isOpen, onClose]);

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Focus trap
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

    firstElement?.focus();

    sidebar.addEventListener('keydown', handleTab);
    return () => sidebar.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <>
      {/* Mobile Overlay */}
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
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-out lg:translate-x-0 lg:z-30 flex flex-col',
          'lg:w-72 lg:static lg:transform-none',
          'w-[85%] max-w-[320px]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isOpen && 'lg:shadow-none shadow-2xl'
        )}
        aria-label="Menu de navigation latéral"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neutral-100 bg-gradient-to-r from-[#FFF5EE] via-white to-white">
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

        {/* User Card */}
        <div className="px-3 sm:px-4 pt-4">
          <div className="rounded-2xl border border-[#F1E7DE] bg-gradient-to-br from-white to-[#FFF6EF] p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F16522]/10 text-[#F16522] flex items-center justify-center font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2C1810] truncate">{displayName}</p>
                <p className="text-xs text-[#8B7355] truncate">Locataire</p>
              </div>
            </div>
            <Link
              to="/locataire/profil"
              onClick={onClose}
              className="block mt-3 text-xs font-semibold text-[#2C1810] bg-white border border-[#EFE3D8] rounded-lg px-3 py-2 text-center hover:border-[#F16522] hover:text-[#F16522] transition-colors"
            >
              Mon Profil
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] uppercase tracking-wider text-[#A69B95] px-3 mb-2">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all relative',
                          active
                            ? 'bg-[#FFF2E6] text-[#D95318]'
                            : 'text-[#5C4A3D] hover:bg-[#FAF4EE] hover:text-[#2C1810]'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-[#F16522] transition-opacity',
                            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                          )}
                        />
                        <Icon className={cn('h-5 w-5', active ? 'text-[#F16522]' : '')} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.counterKey && counters[item.counterKey] > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                            {counters[item.counterKey] > 99 ? '99+' : counters[item.counterKey]}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-100">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-2 px-3 sm:px-4 rounded-lg transition-colors border border-red-200 min-h-[44px] touch-manipulation"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
