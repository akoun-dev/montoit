import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Heart,
  Calendar,
  FileText,
  MessageCircle,
  User,
  Key,
  Menu,
  X,
  ChevronRight,
  LogOut,
  CreditCard,
  Settings,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/shared/ui/Button';
import { useUnreadCount } from '@/hooks/messaging/useUnreadCount';

// Navigation groups pour locataire
const navGroups = [
  {
    id: 'main',
    label: 'Espace Locataire',
    items: [
      { path: '/locataire/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/locataire/recherche', label: 'Recherche', icon: Search },
      { path: '/locataire/favoris', label: 'Favoris', icon: Heart },
    ],
  },
  {
    id: 'rentals',
    label: 'Mes Locations',
    items: [
      { path: '/locataire/dashboard', label: 'Locations en cours', icon: Key },
      { path: '/locataire/mes-visites', label: 'Visites programmées', icon: Calendar },
      { path: '/locataire/mes-contrats', label: 'Mes contrats', icon: FileText },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [
      { path: '/locataire/messages', label: 'Messages', icon: MessageCircle },
    ],
  },
  {
    id: 'account',
    label: 'Mon Compte',
    items: [
      { path: '/locataire/profil', label: 'Mon profil', icon: User },
      { path: '/locataire/paiements', label: 'Mes paiements', icon: CreditCard },
      { path: '/locataire/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

export default function TenantLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { count: unreadCount } = useUnreadCount();

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
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-[#EFEBE9] sticky top-0 z-50">
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
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#F16522] to-[#d9571d]">
                <Key className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-[#2C1810]">Mon Toit</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="small"
              className="p-2 h-auto w-auto relative"
              onClick={() => navigate('/locataire/messages')}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white border-r border-[#EFEBE9]">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-[#EFEBE9]">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#F16522] to-[#d9571d] shadow-lg shadow-orange-200">
              <Key className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[#2C1810] text-lg">Espace Locataire</h1>
              <p className="text-xs text-[#6B5A4E]">Trouvez votre logement idéal</p>
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
                      'text-xs font-semibold text-[#A69B95] uppercase tracking-wider hover:text-[#6B5A4E]',
                      hasActiveItem && !isCollapsed && 'text-[#6B5A4E]'
                    )}
                  >
                    <span>{group.label}</span>
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4 rotate-90" />
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
                                ? 'bg-gradient-to-r from-[#F16522] to-[#d9571d] text-white shadow-md shadow-orange-200'
                                : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5 flex-shrink-0',
                                active ? 'text-white' : 'text-[#6B5A4E]'
                              )}
                            />
                            <span className="font-medium">{item.label}</span>
                            {item.path === '/locataire/messages' && unreadCount > 0 && (
                              <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
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
          <div className="px-4 py-4 border-t border-[#EFEBE9] space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#FFF5F0] to-[#FAF7F4] border border-[#EFEBE9]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F16522] to-[#d9571d] flex items-center justify-center shadow-sm">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2C1810] truncate">
                  {profile?.full_name || 'Locataire'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <p className="text-xs text-[#6B5A4E]">Actif</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-[#6B5A4E] hover:text-red-600 hover:bg-red-50"
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
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#EFEBE9]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#F16522] to-[#d9571d]">
                <Key className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-[#2C1810]">Espace Locataire</span>
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
                <p className="px-3 py-2 text-xs font-semibold text-[#A69B95] uppercase tracking-wider">
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
                          ? 'bg-gradient-to-r from-[#F16522] to-[#d9571d] text-white shadow-md'
                          : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          active ? 'text-white' : 'text-[#6B5A4E]'
                        )}
                      />
                      <span className="font-medium">{item.label}</span>
                      {item.path === '/locataire/messages' && unreadCount > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-[#EFEBE9]">
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
