import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Home,
  Settings,
  BarChart3,
  FileText,
  Calendar,
  PlusCircle,
  Users,
  FilePlus2,
  MessageSquare,
  Search,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ROUTES } from '@/shared/config/routes.config';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/agences/dashboard', icon: Building2 },
  { label: 'Mes biens', href: '/agences/biens', icon: Home },
  { label: 'Mes mandats', href: '/agences/mandats', icon: FileText },
  { label: 'Mes candidatures', href: '/agences/candidatures', icon: Users },
  { label: 'Mes contrats', href: ROUTES.AGENCY_CONTRACTS.LIST, icon: FileText },
  { label: 'Créer un contrat', href: ROUTES.AGENCY_CONTRACTS.CREATE.split(':')[0], icon: FilePlus2 },
  { label: 'Visites', href: '/agences/visites', icon: CalendarIcon },
  { label: 'Calendrier', href: '/agences/calendrier', icon: Calendar },
  { label: 'Analytics', href: '/agences/analytics', icon: BarChart3 },
];

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

export default function Sidebar({ isOpen, onClose, currentPath }: SidebarProps) {
  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(`${href}/`) || currentPath.startsWith(href);

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-72 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <Link to="/agences/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">MonToit Pro</h2>
              <p className="text-xs text-neutral-500">Espace Agence</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Fermer la navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
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
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-neutral-100" />

          <ul className="space-y-1">
            <li>
              <Link
                to="/recherche"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                  isActive('/recherche')
                    ? 'bg-primary-50 text-primary-600 border border-primary-100'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                <Search
                  className={cn(
                    'h-5 w-5',
                    isActive('/recherche') ? 'text-primary-500' : 'text-neutral-400'
                  )}
                />
                <span>Rechercher</span>
              </Link>
            </li>
            <li>
              <Link
                to="/agences/profil"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                  isActive('/agences/profil')
                    ? 'bg-primary-50 text-primary-600 border border-primary-100'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                <Settings
                  className={cn(
                    'h-5 w-5',
                    isActive('/agences/profil') ? 'text-primary-500' : 'text-neutral-400'
                  )}
                />
                <span>Configurations</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
