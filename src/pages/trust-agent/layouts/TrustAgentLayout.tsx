import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Menu,
  X,
  Shield,
  Bell,
  UserCheck,
  Home,
  History,
  Calendar,
  LogOut,
  Building,
  Scale,
  BarChart3,
  FileCheck,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/shared/ui/Button';
import { useUnreadNotificationCount } from '@/features/trust-agent/hooks/useTrustAgentNotifications';

// Navigation groups for better organization
const navGroups = [
  {
    id: 'main',
    label: 'Principal',
    items: [
      { path: '/trust-agent/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/trust-agent/calendar', label: 'Calendrier', icon: Calendar },
      { path: '/trust-agent/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    id: 'missions',
    label: 'Missions & Tâches',
    items: [
      { path: '/trust-agent/missions', label: 'Mes Missions', icon: ClipboardList },
      { path: '/trust-agent/dossiers', label: 'Validation Dossiers', icon: FileCheck },
    ],
  },
  {
    id: 'certifications',
    label: 'Certifications',
    items: [
      { path: '/trust-agent/certifications/users', label: 'Utilisateurs', icon: UserCheck },
      {
        path: '/trust-agent/certifications/properties',
        label: 'Certification Propriétés',
        icon: Home,
      },
    ],
  },
  {
    id: 'management',
    label: 'Gestion',
    items: [
      { path: '/trust-agent/disputes', label: 'Litiges', icon: Scale },
      { path: '/trust-agent/properties', label: 'Gestion Propriétés', icon: Building },
      { path: '/trust-agent/agents', label: 'Équipe Agents', icon: Users },
    ],
  },
  {
    id: 'reports',
    label: 'Rapports & Analyses',
    items: [
      { path: '/trust-agent/stats', label: 'Statistiques', icon: TrendingUp },
      { path: '/trust-agent/reports', label: 'Rapports', icon: BarChart3 },
      { path: '/trust-agent/history', label: 'Historique', icon: History },
    ],
  },
];

export default function TrustAgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { count: unreadCount } = useUnreadNotificationCount();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="small"
              className="p-2 h-auto w-auto"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Trust Agent</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="small"
              className="p-2 h-auto w-auto relative"
              onClick={() => navigate('/trust-agent/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-200">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Trust Agent</h1>
              <p className="text-xs text-gray-500">Espace de vérification</p>
            </div>
          </div>

          {/* Navigation with Groups */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.id);
              const hasActiveItem = group.items.some((item) => isActive(item.path));

              return (
                <div key={group.id} className="mb-4">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors',
                      'text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600',
                      hasActiveItem && !isCollapsed && 'text-gray-600'
                    )}
                  >
                    <span>{group.label}</span>
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Group Items */}
                  {!isCollapsed && (
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
                              active
                                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-200'
                                : 'text-gray-700 hover:bg-gray-100'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5 flex-shrink-0',
                                active ? 'text-white' : 'text-gray-500'
                              )}
                            />
                            <span className="font-medium">{item.label}</span>
                            {active && (
                              <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100/50 border border-primary-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.user_metadata?.full_name || 'Agent Vérifié'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <p className="text-xs text-gray-600">Actif</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 ease-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Trust Agent</span>
            </div>
            <Button
              variant="ghost"
              size="small"
              className="p-2 h-auto w-auto"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {navGroups.map((group) => (
              <div key={group.id} className="mb-4">
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
                        active
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          active ? 'text-white' : 'text-gray-500'
                        )}
                      />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
