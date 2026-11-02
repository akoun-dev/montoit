import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  breadcrumbs?: Array<{ label: string; href: string }>;
  icon?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  showBackButton = false,
  breadcrumbs,
  icon,
}: PageHeaderProps) {
  return (
    <div className="premium-header relative min-h-[320px] md:min-h-[360px] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23E8D4C5' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F16522]/10 via-transparent to-[#E8D4C5]/5"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col justify-center min-h-[320px] md:min-h-[360px]">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-6 animate-fade-in" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="flex items-center gap-1 text-[#E8D4C5]/80 hover:text-white transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Accueil</span>
                </Link>
              </li>
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-[#E8D4C5]/50">/</span>
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-white font-semibold">{crumb.label}</span>
                  ) : (
                    <Link
                      to={crumb.href}
                      className="text-[#E8D4C5]/80 hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-[#E8D4C5] hover:text-white transition-colors mb-6 animate-fade-in"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Retour</span>
          </button>
        )}

        {/* Header Content */}
        <div className="text-center max-w-3xl mx-auto">
          {icon && (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F16522] rounded-2xl shadow-lg mb-6 animate-scale-in">
              {icon}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight animate-slide-up">
            {title}
          </h1>

          {subtitle && (
            <p className="text-lg md:text-xl text-[#E8D4C5] animate-slide-up stagger-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
