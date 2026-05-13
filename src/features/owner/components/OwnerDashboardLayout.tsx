import { useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, Home, FileText, Users, Building, MessageSquare, Calendar, Bell, User, Settings, CreditCard, FolderOpen, Clock, type LucideIcon } from 'lucide-react';
import OwnerSidebar from './OwnerSidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { useMenuCounters } from '@/hooks/useMenuCounters';
import OnboardingWrapper from '@/features/onboarding/OnboardingWrapper';

interface RouteMeta {
  prefix: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const ROUTE_METAS: RouteMeta[] = [
  { prefix: '/proprietaire/dashboard', title: 'Tableau de bord', description: 'Vue d\'ensemble', icon: LayoutDashboard },
  { prefix: '/proprietaire/mes-biens', title: 'Mes Biens', description: 'Gérez vos propriétés', icon: Building },
  { prefix: '/proprietaire/ajouter-propriete', title: 'Ajouter un bien', description: 'Publiez une annonce', icon: Home },
  { prefix: '/proprietaire/contrats', title: 'Mes Contrats', description: 'Gérez vos contrats', icon: FileText },
  { prefix: '/proprietaire/creer-contrat', title: 'Nouveau contrat', description: 'Créez un contrat de location', icon: FileText },
  { prefix: '/proprietaire/candidatures', title: 'Candidatures', description: 'Gérez les candidatures', icon: Users },
  { prefix: '/proprietaire/messages', title: 'Messages', description: 'Vos échanges', icon: MessageSquare },
  { prefix: '/proprietaire/visites', title: 'Visites', description: 'Planifiez et gérez', icon: Calendar },
  { prefix: '/proprietaire/mes-locataires', title: 'Mes Locataires', description: 'Gérez vos locataires', icon: Users },
  { prefix: '/proprietaire/paiements', title: 'Paiements', description: 'Suivez les paiements', icon: CreditCard },
  { prefix: '/proprietaire/documents', title: 'Documents', description: 'Vos documents', icon: FolderOpen },
  { prefix: '/proprietaire/rappels', title: 'Rappels', description: 'Vos rappels', icon: Clock },
  { prefix: '/proprietaire/notifications', title: 'Notifications', description: 'Vos alertes', icon: Bell },
  { prefix: '/proprietaire/profil', title: 'Mon Profil', description: 'Vos informations', icon: User },
  { prefix: '/proprietaire/mes-mandats', title: 'Mes Mandats', description: 'Gérez vos mandats', icon: FileText },
  { prefix: '/proprietaire/parametres', title: 'Paramètres', description: 'Préférences du compte', icon: Settings },
];

const getRouteMeta = (pathname: string): RouteMeta => {
  const match = ROUTE_METAS.find(({ prefix }) => pathname.startsWith(prefix));
  return match ?? { prefix: '', title: 'Espace Propriétaire', description: 'Bienvenue', icon: LayoutDashboard };
};

interface OwnerDashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
  icon?: ReactNode;
  description?: string;
}

export default function OwnerDashboardLayout({ children, title: propTitle, icon: propIcon, description: propDescription }: OwnerDashboardLayoutProps) {
  const { user: _user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { counters: _counters } = useMenuCounters();

  const meta = getRouteMeta(pathname);
  const IconComponent = meta.icon;
  const title = propTitle ?? meta.title;
  const icon = propIcon ?? (IconComponent ? <IconComponent className="h-5 w-5" /> : undefined);
  const description = propDescription ?? meta.description;

  return (
    <div className="flex h-dvh bg-neutral-50 overflow-hidden lg:h-screen">
      <OwnerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="lg:hidden flex-shrink-0 bg-[#2C1810] px-3 py-2 sm:px-4 sm:py-3 shadow-lg shadow-black/10 z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
            {icon && <span className="flex-shrink-0 text-white">{icon}</span>}
            <div className="min-w-0 flex-1">
              {title && <h1 className="text-base sm:text-lg font-semibold text-white truncate leading-tight">{title}</h1>}
              {description && <p className="text-[11px] text-[#E8D4C5] truncate leading-tight">{description}</p>}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <OnboardingWrapper>
            <div className="w-full px-3 sm:px-4 lg:px-8 xl:px-12 py-4 lg:py-6">
              {children || <Outlet />}
            </div>
          </OnboardingWrapper>
        </main>
      </div>
    </div>
  );
}
