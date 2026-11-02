/**
 * Page Layout with Breadcrumb
 * Mon Toit - Navigation Cognitive
 *
 * Wrapper pour toutes les pages avec breadcrumb automatique
 */

import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  noBreadcrumb?: boolean;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Layout de page avec breadcrumb
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  breadcrumbs,
  noBreadcrumb = false,
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div className={`page-layout ${className}`}>
      {/* Container principal */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        {!noBreadcrumb && <Breadcrumb items={breadcrumbs} />}

        {/* Header de page (optionnel) */}
        {(title || actions) && (
          <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              {title && <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        )}

        {/* Contenu de la page */}
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
};

/**
 * Layout de page avec sidebar
 */
interface PageLayoutWithSidebarProps extends PageLayoutProps {
  sidebar: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
}

export const PageLayoutWithSidebar: React.FC<PageLayoutWithSidebarProps> = ({
  children,
  sidebar,
  sidebarPosition = 'right',
  ...props
}) => {
  return (
    <PageLayout {...props}>
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${
          sidebarPosition === 'left' ? 'lg:flex-row-reverse' : ''
        }`}
      >
        {/* Sidebar */}
        <aside
          className={`lg:col-span-3 ${
            sidebarPosition === 'left' ? 'lg:order-first' : 'lg:order-last'
          }`}
        >
          {sidebar}
        </aside>

        {/* Contenu principal */}
        <main className="lg:col-span-9">{children}</main>
      </div>
    </PageLayout>
  );
};

/**
 * Layout de page avec tabs
 */
interface PageLayoutWithTabsProps extends PageLayoutProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const PageLayoutWithTabs: React.FC<PageLayoutWithTabsProps> = ({
  children,
  tabs,
  activeTab,
  onTabChange,
  ...props
}) => {
  return (
    <PageLayout {...props}>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap
                transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`
                  px-2 py-0.5 rounded-full text-xs font-semibold
                  ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }
                `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu du tab actif */}
      <div>{children}</div>
    </PageLayout>
  );
};

/**
 * Layout de page avec carte centrée
 */
interface PageLayoutCenteredProps extends Omit<PageLayoutProps, 'className'> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  card?: boolean;
}

export const PageLayoutCentered: React.FC<PageLayoutCenteredProps> = ({
  children,
  maxWidth = 'lg',
  card = false,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <PageLayout {...props} className="min-h-[calc(100vh-200px)] flex items-center">
      <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto`}>
        {card ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">{children}</div>
        ) : (
          children
        )}
      </div>
    </PageLayout>
  );
};

/**
 * Layout de page avec grille
 */
interface PageLayoutGridProps extends PageLayoutProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

export const PageLayoutGrid: React.FC<PageLayoutGridProps> = ({
  children,
  columns = 3,
  gap = 'md',
  ...props
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <PageLayout {...props}>
      <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]}`}>{children}</div>
    </PageLayout>
  );
};

export default PageLayout;
