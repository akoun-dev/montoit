import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Building2, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationItems } from '@/shared/hooks/useNavigationItems';
import { BadgeIndicator } from '@/shared/ui/BadgeIndicator';
import { useAuth } from '@/app/providers/AuthProvider';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface AgencySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgencySidebar({ isOpen, onClose }: AgencySidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { signOut } = useAuth();
  const { agentItems, bottomItems } = useNavigationItems();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/connexion');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/agency') {
      return currentPath === '/agency' || currentPath === '/agences/dashboard';
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">MonToit Pro</h1>
              <p className="text-xs text-neutral-500">Espace Agence</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>
        </div>

        {/* Navigation - filtered by permissions with dynamic badges */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {agentItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                      active
                        ? 'bg-primary-50 text-primary-600 border border-primary-100'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active ? 'text-primary-500' : '')} />
                    <span className="flex-1">{item.label}</span>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <BadgeIndicator
                        count={item.badgeCount}
                        color={item.badgeColor}
                        pulse={item.badgePulse}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Separator */}
          <div className="my-4 border-t border-neutral-100" />

          {/* Bottom Items */}
          <ul className="space-y-1">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                      active
                        ? 'bg-primary-50 text-primary-600 border border-primary-100'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active ? 'text-primary-500' : '')} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with CTA */}
        <div className="p-4 border-t border-neutral-100">
          <div className="bg-primary-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-primary-700 mb-1">Gérer vos mandats</p>
            <p className="text-xs text-primary-600 mb-3">Créez un nouveau mandat de gestion</p>
            <Link
              to="/agences/mandats/nouveau"
              className="block text-center text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 py-2 px-4 rounded-lg transition-colors"
            >
              Nouveau mandat
            </Link>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 px-4 rounded-lg transition-colors border border-red-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
