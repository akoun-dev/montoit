import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, FileText, Users, Building, MessageSquare, Calendar, Bell, User, Settings, CreditCard, FolderOpen, Clock, BarChart3, type LucideIcon } from 'lucide-react';
import AgencySidebar from './AgencySidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import OnboardingWrapper from '@/features/onboarding/OnboardingWrapper';

interface RouteMeta {
  prefix: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const ROUTE_METAS: RouteMeta[] = [
  { prefix: '/agence/dashboard', title: 'Tableau de bord', description: 'Vue d\'ensemble', icon: LayoutDashboard },
  { prefix: '/agence/mandats', title: 'Mes Mandats', description: 'Gérez vos mandats', icon: FileText },
  { prefix: '/agence/biens', title: 'Mes Biens', description: 'Gérez les propriétés', icon: Building },
  { prefix: '/agence/ajouter-bien', title: 'Ajouter un bien', description: 'Publiez une annonce', icon: Building },
  { prefix: '/agence/contrats', title: 'Contrats', description: 'Gérez les contrats', icon: FileText },
  { prefix: '/agence/creer-contrat', title: 'Nouveau contrat', description: 'Créez un contrat', icon: FileText },
  { prefix: '/agence/candidatures', title: 'Candidatures', description: 'Gérez les candidatures', icon: Users },
  { prefix: '/agence/messages', title: 'Messages', description: 'Vos échanges', icon: MessageSquare },
  { prefix: '/agence/visites', title: 'Visites', description: 'Planifiez et gérez', icon: Calendar },
  { prefix: '/agence/paiements', title: 'Paiements', description: 'Suivez les paiements', icon: CreditCard },
  { prefix: '/agence/documents', title: 'Documents', description: 'Vos documents', icon: FolderOpen },
  { prefix: '/agence/rappels', title: 'Rappels', description: 'Vos rappels', icon: Clock },
  { prefix: '/agence/notifications', title: 'Notifications', description: 'Vos alertes', icon: Bell },
  { prefix: '/agence/profil', title: 'Mon Profil', description: 'Vos informations', icon: User },
  { prefix: '/agence/equipe', title: 'Équipe', description: 'Gérez votre équipe', icon: Users },
  { prefix: '/agence/analytics', title: 'Analytiques', description: 'Statistiques', icon: BarChart3 },
  { prefix: '/agence/calendrier', title: 'Calendrier', description: 'Votre agenda', icon: Calendar },
  { prefix: '/agence/commissions', title: 'Commissions', description: 'Gérez les commissions', icon: CreditCard },
  { prefix: '/agence/parametres', title: 'Paramètres', description: 'Préférences du compte', icon: Settings },
];

const getRouteMeta = (pathname: string): RouteMeta => {
  const match = ROUTE_METAS.find(({ prefix }) => pathname.startsWith(prefix));
  return match ?? { prefix: '', title: 'Espace Agence', description: 'Bienvenue', icon: LayoutDashboard };
};

interface AgencyDashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
  icon?: ReactNode;
  description?: string;
}

/**
 * Layout principal pour l'espace agence.
 * Affiche la sidebar dédiée et occupe toute la hauteur de l'écran.
 */
export default function AgencyDashboardLayout({ children, title: propTitle, icon: propIcon, description: propDescription }: AgencyDashboardLayoutProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setPendingNotifications] = useState(0);

  const meta = getRouteMeta(pathname);
  const IconComponent = meta.icon;
  const title = propTitle ?? meta.title;
  const icon = propIcon ?? (IconComponent ? <IconComponent className="h-5 w-5" /> : undefined);
  const description = propDescription ?? meta.description;

  useEffect(() => {
    if (user) {
      loadUnreadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUnreadNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setPendingNotifications(data?.length || 0);
    }
  };

  return (
    <div className="flex h-dvh bg-neutral-50 overflow-hidden lg:h-screen">
      <AgencySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header mobile uniquement */}
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

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto">
          <OnboardingWrapper>
            <div className="w-full px-4 py-6">{children || <Outlet />}</div>
          </OnboardingWrapper>
        </main>
      </div>
    </div>
  );
}
