import { ReactNode } from 'react';
import { ArrowLeft, Bell, Search } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/utils';

export interface PageAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface TrustAgentPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
  actions?: PageAction[];
  badges?: Array<{ label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }>;
  showBackButton?: boolean;
  onBack?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  rightContent?: ReactNode;
  className?: string;
}

export function TrustAgentPageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions = [],
  badges = [],
  showBackButton = false,
  onBack,
  notificationCount,
  onNotificationClick,
  showSearch = false,
  onSearch,
  searchPlaceholder = 'Rechercher...',
  rightContent,
  className = '',
}: TrustAgentPageHeaderProps) {
  return (
    <header className={cn('bg-white border-b border-gray-200', className)}>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        {/* Breadcrumb Row */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-2 text-sm mb-3">
            {showBackButton && (
              <button
                onClick={onBack}
                className="p-1 rounded hover:bg-gray-100 transition-colors mr-1"
              >
                <ArrowLeft className="h-4 w-4 text-gray-500" />
              </button>
            )}
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-gray-400">/</span>
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <button
                    onClick={crumb.onClick}
                    className="text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Main Row: Title/Subtitle/Badges - Actions/Search */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: Title, Subtitle, Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {!breadcrumbs && showBackButton && (
                <Button
                  variant="ghost"
                  size="small"
                  className="p-2 h-auto w-auto flex-shrink-0"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-gray-500 mt-1">{subtitle}</p>
                )}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {badges.map((badge, index) => (
                      <Badge key={index} variant={badge.variant || 'default'}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions, Search, Notifications */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Search */}
            {showSearch && onSearch && (
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
                />
              </div>
            )}

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'primary'}
                  size="small"
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  loading={action.loading}
                >
                  {action.icon && <span className="mr-1.5">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Notifications */}
            {onNotificationClick && (
              <button
                onClick={onNotificationClick}
                className="relative inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {notificationCount && notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center font-medium">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  </span>
                )}
              </button>
            )}

            {/* Custom Right Content */}
            {rightContent}
          </div>
        </div>

        {/* Mobile Actions Row */}
        {actions.length > 0 && (
          <div className="flex sm:hidden gap-2 mt-4">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'primary'}
                size="small"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                loading={action.loading}
                className="flex-1"
              >
                {action.icon && action.label ? (
                  <>
                    <span className="mr-1.5">{action.icon}</span>
                    {action.label}
                  </>
                ) : action.icon ? (
                  action.icon
                ) : (
                  action.label
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
