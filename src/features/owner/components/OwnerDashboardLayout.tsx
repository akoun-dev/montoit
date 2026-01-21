import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import OwnerSidebar from './OwnerSidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface OwnerDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function OwnerDashboardLayout({ children, title }: OwnerDashboardLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadMessages();
    }
  }, [user]);

  const loadUnreadMessages = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    if (!error) {
      setUnreadMessages(data?.length || 0);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <OwnerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadMessages={unreadMessages}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-72 overflow-hidden">
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

        <main className="flex-1 overflow-auto">
          <div className="w-full px-4 lg:px-10 xl:px-12 py-6">{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
