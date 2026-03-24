import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import OwnerSidebar from './OwnerSidebar';
import { useAuth } from '@/app/providers/AuthProvider';
import { useMenuCounters } from '@/hooks/useMenuCounters';

interface OwnerDashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
}

export default function OwnerDashboardLayout({ children, title }: OwnerDashboardLayoutProps) {
  const { user: _user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { counters: _counters } = useMenuCounters();

  return (
    <div className="flex min-h-[100svh] bg-neutral-50 overflow-hidden lg:h-screen">
      <OwnerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
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

        <main className="flex-1 min-h-0 overflow-auto">
          <div className="w-full px-3 sm:px-4 lg:px-8 xl:px-12 py-4 lg:py-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
