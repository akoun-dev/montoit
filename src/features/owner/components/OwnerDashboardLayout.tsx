import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import OwnerSidebar from './OwnerSidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface OwnerDashboardLayoutProps {
  children?: React.ReactNode;
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

    // Get unread count from conversations where user is a participant
    const { data, error } = await supabase
      .from('conversations')
      .select('unread_count_participant1, unread_count_participant2, participant1_id, participant2_id')
      .or('participant1_id.eq.' + user.id + ',participant2_id.eq.' + user.id);

    if (!error && data) {
      const totalUnread = data.reduce((sum, conv) => {
        if (conv.participant1_id === user.id) {
          return sum + (conv.unread_count_participant1 || 0);
        } else {
          return sum + (conv.unread_count_participant2 || 0);
        }
      }, 0);
      setUnreadMessages(totalUnread);
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
        <header className="lg:hidden flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-20">
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
          <div className="w-full px-3 sm:px-4 lg:px-8 xl:px-12 py-4 lg:py-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
