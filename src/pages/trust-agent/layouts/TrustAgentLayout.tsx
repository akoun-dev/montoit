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
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';

const navItems = [
  { path: '/trust-agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/trust-agent/missions', label: 'Mes Missions', icon: ClipboardList },
  { path: '/trust-agent/calendar', label: 'Calendrier', icon: Calendar },
  { path: '/trust-agent/dossiers', label: 'Validation Dossiers', icon: FileCheck },
  { path: '/trust-agent/disputes', label: 'Litiges', icon: Scale },
  { path: '/trust-agent/certifications/users', label: 'Certifier Utilisateurs', icon: UserCheck },
  { path: '/trust-agent/certifications/properties', label: 'Certifier Propriétés', icon: Home },
  { path: '/trust-agent/properties', label: 'Gestion des Propriétés', icon: Building },
  { path: '/trust-agent/reports', label: 'Rapports', icon: BarChart3 },
  { path: '/trust-agent/history', label: 'Historique', icon: History },
];

export default function TrustAgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b sticky top-0 z-50">
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
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Trust Agent</span>
            </div>
          </div>
          <Button variant="ghost" size="small" className="p-2 h-auto w-auto">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Trust Agent</h1>
              <p className="text-xs text-muted-foreground">Mon Toit</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Agent Vérifié</p>
                <p className="text-xs text-muted-foreground">Actif</p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                En ligne
              </Badge>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
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
            className="lg:hidden fixed inset-0 z-50 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card transform transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Trust Agent</span>
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
          <nav className="px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile Footer */}
          <div className="px-4 py-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
