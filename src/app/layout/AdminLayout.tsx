import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  AlertTriangle,
  Settings,
  Shield,
  Key,
  Activity,
  CheckCircle,
  TrendingUp,
  Bell,
  UserCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

const navigationItems = [
  {
    section: "Vue d'ensemble",
    items: [
      {
        name: 'Dashboard',
        href: '/admin/tableau-de-bord',
        icon: LayoutDashboard,
        color: 'text-blue-600',
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        color: 'text-purple-600',
      },
    ],
  },
  {
    section: 'Gestion Utilisateurs',
    items: [
      {
        name: 'Utilisateurs',
        href: '/admin/utilisateurs',
        icon: Users,
        color: 'text-green-600',
      },
      {
        name: 'Rôles & Permissions',
        href: '/admin/gestion-roles',
        icon: Shield,
        color: 'text-orange-600',
      },
      {
        name: 'Trust Agents',
        href: '/admin/trust-agents',
        icon: UserCheck,
        color: 'text-cyan-600',
      },
    ],
  },
  {
    section: 'Gestion Contenu',
    items: [
      {
        name: 'Propriétés',
        href: '/admin/properties',
        icon: Home,
        color: 'text-emerald-600',
      },
      {
        name: 'Transactions',
        href: '/admin/transactions',
        icon: FileText,
        color: 'text-indigo-600',
      },
      {
        name: 'CEV Management',
        href: '/admin/cev-management',
        icon: CheckCircle,
        color: 'text-teal-600',
      },
    ],
  },
  {
    section: 'Monitoring Système',
    items: [
      {
        name: 'Service Monitoring',
        href: '/admin/service-monitoring',
        icon: Activity,
        color: 'text-red-600',
      },
      {
        name: 'API Keys',
        href: '/admin/api-keys',
        icon: Key,
        color: 'text-yellow-600',
      },
      {
        name: 'Logs & Erreurs',
        href: '/admin/logs',
        icon: AlertTriangle,
        color: 'text-red-500',
      },
    ],
  },
  {
    section: 'Configuration',
    items: [
      {
        name: 'Règles Métier',
        href: '/admin/regles-metier',
        icon: Settings,
        color: 'text-orange-600',
      },
      {
        name: 'Service Providers',
        href: '/admin/service-providers',
        icon: TrendingUp,
        color: 'text-blue-500',
      },
      {
        name: 'Service Configuration',
        href: '/admin/service-configuration',
        icon: Settings,
        color: 'text-gray-600',
      },
      {
        name: 'Data Generator',
        href: '/admin/test-data-generator',
        icon: Eye,
        color: 'text-purple-500',
      },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-white shadow-xl border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* Header Admin */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
                  <p className="text-sm text-gray-500">Mon Toit Pro</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {navigationItems.map((section) => (
            <div key={section.section}>
              {!sidebarCollapsed && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {section.section}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.href)}
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-xl text-left transition-all duration-200 group ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? 'text-orange-600' : item.color} flex-shrink-0`}
                      />
                      {!sidebarCollapsed && <span className="ml-3 font-medium">{item.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer User */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                  <p className="text-xs text-gray-500 truncate">admin@montoit.com</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gérez votre plateforme immobilière en temps réel
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* Quick Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-500">En ligne</p>
                  <p className="font-semibold text-green-600">247</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Erreurs</p>
                  <p className="font-semibold text-red-600">3</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
