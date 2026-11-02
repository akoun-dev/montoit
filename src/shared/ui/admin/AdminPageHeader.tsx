/**
 * AdminPageHeader - En-tête standard pour les pages admin
 */

import { ReactNode } from 'react';
import { RefreshCw, Download } from 'lucide-react';

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  onRefresh,
  refreshing = false,
  showExport = false,
  onExport,
  breadcrumbs,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="w-4 h-4 text-[#6B5A4E] mx-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-sm text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-[#2C1810]">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-[#FFF5F0] rounded-xl">
              <Icon className="h-6 w-6 text-[#F16522]" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2C1810]">{title}</h1>
            {description && <p className="text-[#6B5A4E] mt-1">{description}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE9] text-[#6B5A4E] rounded-xl hover:border-[#F16522] hover:text-[#F16522] transition-colors disabled:opacity-50"
              aria-label="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          )}
          {showExport && onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE9] text-[#6B5A4E] rounded-xl hover:border-[#F16522] hover:text-[#F16522] transition-colors"
              aria-label="Exporter"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
