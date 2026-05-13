import { useState, type ReactNode } from 'react';
import { Menu, Bell, MessageSquare } from 'lucide-react';
import TenantSidebar from './TenantSidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link } from 'react-router-dom';
import { useMenuCounters } from '@/hooks/useMenuCounters';
import OnboardingWrapper from '@/features/onboarding/OnboardingWrapper';

interface TenantDashboardLayoutProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  description?: string;
}

export default function TenantDashboardLayout({ children, title, icon, description }: TenantDashboardLayoutProps) {
  const { user: _user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { counters } = useMenuCounters();

  return (
    <div className="flex h-dvh bg-neutral-50 overflow-hidden lg:h-screen">
      {/* Sidebar */}
      <TenantSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile Header - fixed to prevent scroll issues on mobile */}
        <header className="lg:hidden flex-shrink-0 bg-[#2C1810] px-3 py-2 sm:px-4 sm:py-3 shadow-lg shadow-black/10 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </button>
              {icon && <span className="flex-shrink-0 text-white">{icon}</span>}
              <div className="min-w-0">
                {title && <h1 className="text-base sm:text-lg font-semibold text-white truncate leading-tight">{title}</h1>}
                {description && <p className="text-[11px] text-[#E8D4C5] truncate leading-tight">{description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 ml-2">
              <Link
                to="/locataire/messages"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors relative touch-manipulation"
                aria-label="Messages"
              >
                <MessageSquare className="h-5 w-5 text-white" />
                {counters.unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {counters.unreadMessages > 9 ? '9+' : counters.unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/locataire/notifications"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors relative touch-manipulation"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-white" />
                {counters.unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {counters.unreadNotifications > 9 ? '9+' : counters.unreadNotifications}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto" id="main-content">
          <OnboardingWrapper>
            <div className="w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6 pb-10 sm:pb-12">
              {children}
            </div>
          </OnboardingWrapper>
        </main>
      </div>
    </div>
  );
}
