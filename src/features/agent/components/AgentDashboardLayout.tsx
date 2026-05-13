import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AgentSidebar from './AgentSidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Menu, LayoutDashboard, Building, MessageSquare, type LucideIcon } from 'lucide-react';

interface RouteMeta {
  prefix: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const ROUTE_METAS: RouteMeta[] = [
  { prefix: '/agent/dashboard', title: 'Tableau de bord', description: 'Vue d\'ensemble', icon: LayoutDashboard },
  { prefix: '/agent/proprietes', title: 'Propriétés', description: 'Gérez les propriétés', icon: Building },
  { prefix: '/agent/messages', title: 'Messages', description: 'Vos échanges', icon: MessageSquare },
];

const getRouteMeta = (pathname: string): RouteMeta => {
  const match = ROUTE_METAS.find(({ prefix }) => pathname.startsWith(prefix));
  return match ?? { prefix: '', title: 'Espace Agent', description: 'Bienvenue', icon: LayoutDashboard };
};

interface AgentDashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
  icon?: ReactNode;
  description?: string;
}

/**
 * Layout principal pour l'espace agent d'agence.
 * Affiche la sidebar dédiée et occupe toute la hauteur de l'écran.
 */
export default function AgentDashboardLayout({ children, title: propTitle, icon: propIcon, description: propDescription }: AgentDashboardLayoutProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = getRouteMeta(pathname);
  const IconComponent = meta.icon;
  const title = propTitle ?? meta.title;
  const icon = propIcon ?? (IconComponent ? <IconComponent className="h-5 w-5" /> : undefined);
  const description = propDescription ?? meta.description;
    
  const [_pendingNotifications, setPendingNotifications] = useState(0);

  const loadUnreadNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setPendingNotifications(data?.length || 0);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUnreadNotifications();
    }
  }, [user, loadUnreadNotifications]);

  return (
    <div className="flex h-dvh bg-neutral-50 overflow-hidden lg:h-screen">
      <AgentSidebar
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
          <div className="w-full px-4 py-6">{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
