import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AgencySidebar from './AgencySidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import OnboardingWrapper from '@/features/onboarding/OnboardingWrapper';

interface AgencyDashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
}

/**
 * Layout principal pour l'espace agence.
 * Affiche la sidebar dédiée et occupe toute la hauteur de l'écran.
 */
export default function AgencyDashboardLayout({ children, title }: AgencyDashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setPendingNotifications] = useState(0);

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
    <div className="flex min-h-[100svh] bg-neutral-50 overflow-hidden lg:h-screen">
      <AgencySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header mobile uniquement */}
        <header className="lg:hidden flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6 text-neutral-700" />
            </button>
            {title && <h1 className="text-lg font-semibold text-neutral-900 truncate">{title}</h1>}
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 min-h-0 overflow-auto">
          <OnboardingWrapper>
            <div className="w-full px-4 py-6">{children || <Outlet />}</div>
          </OnboardingWrapper>
        </main>
      </div>
    </div>
  );
}
