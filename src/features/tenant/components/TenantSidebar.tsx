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
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/app/providers/AuthProvider';

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

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">MonToit</h1>
              <p className="text-xs text-neutral-500">Espace Locataire</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>
        </div>

        {/* Navigation */}
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
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
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

        {/* Footer */}
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
