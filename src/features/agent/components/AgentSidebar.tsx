import { Link, useLocation } from 'react-router-dom';
import { X, Building2, Home, Calendar, Users, FileText, MessageSquare, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

const navItems: NavItem[] = [
  { href: '/agent/dashboard', label: 'Tableau de bord', icon: Home },
  { href: '/agent/proprietes', label: 'Mes propriétés', icon: Home },
  { href: '/agent/visites', label: 'Visites', icon: Calendar },
  { href: '/agent/candidatures', label: 'Candidatures', icon: Users },
  { href: '/agent/contrats', label: 'Contrats', icon: FileText },
  { href: '/agent/messages', label: 'Messages', icon: MessageSquare },
];

const bottomItems: NavItem[] = [
  { href: '/profil', label: 'Mon profil', icon: Settings },
  { href: '/connexion', label: 'Déconnexion', icon: LogOut },
];

export default function AgentSidebar({ isOpen, onClose }: AgentSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (href: string) => {
    if (href === '/agent') {
      return currentPath === '/agent' || currentPath === '/agent/dashboard';
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
            <div className="w-10 h-10 bg-[#F16522] rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">MonToit</h1>
              <p className="text-xs text-neutral-500">Espace Agent</p>
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
                        ? 'bg-[#F16522]/10 text-[#F16522] border border-[#F16522]/20'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active ? 'text-[#F16522]' : '')} />
                    <span className="flex-1">{item.label}</span>
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
                        ? 'bg-[#F16522]/10 text-[#F16522] border border-[#F16522]/20'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active ? 'text-[#F16522]' : '')} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with info */}
        <div className="p-4 border-t border-neutral-100">
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-sm font-medium text-neutral-700 mb-1">Besoin d'aide ?</p>
            <p className="text-xs text-neutral-500 mb-3">Contactez votre agence pour assistance</p>
            <Link
              to="/agent/messages"
              className="block text-center text-sm font-semibold text-white bg-[#F16522] hover:bg-[#D14E12] py-2 px-4 rounded-lg transition-colors"
            >
              Contacter l'agence
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
