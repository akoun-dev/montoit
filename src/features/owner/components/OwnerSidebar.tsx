import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  UserCircle2,
  FileText,
  Users,
  PlusCircle,
  FilePlus2,
  MessageSquare,
  Search,
  X,
  LogOut,
  Handshake,
  Building2,
  Calendar,
  Key,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROUTES } from '@/shared/config/routes.config';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface OwnerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadMessages?: number;
}

const navItems = [
  { label: 'Tableau de bord', href: '/proprietaire/dashboard', icon: LayoutDashboard },
  { label: 'Mes biens', href: '/proprietaire/mes-biens', icon: Building2 },
  { label: 'Mes contrats', href: ROUTES.CONTRACTS.LIST, icon: FileText },
  { label: 'Mes candidatures', href: '/proprietaire/candidatures', icon: Users },
  { label: 'Visites', href: '/proprietaire/visites', icon: Calendar },
  { label: 'Mes locataires', href: '/proprietaire/mes-locataires', icon: Key },
  { label: 'Mandats agence', href: '/proprietaire/mes-mandats', icon: Handshake },
  { label: 'Messages', href: '/proprietaire/messages', icon: MessageSquare, hasBadge: true },
  { label: 'Mon profil', href: '/proprietaire/profil', icon: UserCircle2 },
];

const bottomItems = [{ label: 'Rechercher', href: '/recherche', icon: Search }];

export function OwnerSidebar({ isOpen, onClose, unreadMessages = 0 }: OwnerSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (href: string) => {
    if (href === '/proprietaire/dashboard') {
      return currentPath === '/proprietaire/dashboard';
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

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">MonToit</h1>
              <p className="text-xs text-neutral-500">Espace Propriétaire</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
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
                    {item.hasBadge && unreadMessages > 0 && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-neutral-100" />

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

        <div className="p-4 border-t border-neutral-100">
          <div className="bg-primary-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-primary-700 mb-1">Besoin d'aide ?</p>
            <p className="text-xs text-primary-600 mb-3">Notre équipe est là pour vous</p>
            <Link
              to="/contact"
              className="block text-center text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 py-2 px-4 rounded-lg transition-colors"
            >
              Nous contacter
            </Link>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-2 px-4 rounded-lg transition-colors border border-red-200"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

export default OwnerSidebar;
