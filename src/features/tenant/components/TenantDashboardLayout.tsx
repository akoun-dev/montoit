import { useState, useEffect } from 'react';
import { Menu, Home, Bell, MessageSquare } from 'lucide-react';
import TenantSidebar from './TenantSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link } from 'react-router-dom';

interface TenantDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function TenantDashboardLayout({ children, title }: TenantDashboardLayoutProps) {
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

    try {
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      setUnreadMessages(data?.length || 0);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <TenantSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadMessages={unreadMessages}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex-shrink-0 bg-white border-b border-neutral-200 px-3 py-2 sm:px-4 sm:py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-manipulation"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-700" />
              </button>
              {title && <h1 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">{title}</h1>}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 ml-2">
              <Link
                to="/locataire/messages"
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors relative touch-manipulation"
                aria-label="Messages"
              >
                <MessageSquare className="h-5 w-5 text-neutral-700" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/locataire/notifications"
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-manipulation"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-neutral-700" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto" id="main-content">
          <div className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
