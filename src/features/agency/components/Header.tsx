import React from 'react';
import {
  Menu,
  Bell,
  Search,
  Settings,
  Download,
  User,
  LogOut,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  agencyName: string;
  agencyLogo?: string;
  pendingNotifications?: number;
  userEmail?: string;
  onExport?: () => void;
  onTimeRangeChange?: (range: string) => void;
  selectedTimeRange?: string;
}

const timeRangeOptions = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
];

export default function Header({
  onToggleSidebar,
  sidebarOpen: _sidebarOpen,
  agencyName,
  agencyLogo,
  pendingNotifications = 0,
  userEmail,
  onExport,
  onTimeRangeChange,
  selectedTimeRange = 'month',
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = React.useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Barre de recherche centrale */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher propriétés, agents, commissions..."
                className="w-full pl-12 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          {/* Actions header */}
          <div className="flex items-center space-x-3">
            {/* Sélecteur de période */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors"
              >
                <span>
                  {timeRangeOptions.find((option) => option.value === selectedTimeRange)?.label ||
                    'Ce mois'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showTimeRangeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                  {timeRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onTimeRangeChange?.(option.value);
                        setShowTimeRangeDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 transition-colors ${
                        selectedTimeRange === option.value
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-neutral-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton exporter */}
            <button
              onClick={onExport}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>

            {/* Notifications */}
            <button
              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {pendingNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold animate-pulse">
                  {pendingNotifications > 9 ? '9+' : pendingNotifications}
                </span>
              )}
            </button>

            {/* Aide */}
            <button
              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label="Aide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Paramètres */}
            <button
              className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Menu utilisateur */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-sm">
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-neutral-200">
                    <p className="font-medium text-neutral-900 text-sm">
                      {userEmail || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-neutral-500">Administrateur</p>
                  </div>

                  <div className="p-1">
                    <a
                      href="/agence/profile"
                      className="flex items-center space-x-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Mon profil</span>
                    </a>
                    <a
                      href="/agence/settings"
                      className="flex items-center space-x-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Paramètres</span>
                    </a>
                    <hr className="my-1 border-neutral-200" />
                    <button className="flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left">
                      <LogOut className="w-4 h-4" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
