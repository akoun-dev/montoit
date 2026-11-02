import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'yellow';
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  details?: Array<{
    label: string;
    value: string | number;
  }>;
  className?: string;
  onClick?: () => void;
}

const iconColorClasses = {
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-500',
  },
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-100',
    icon: 'text-orange-600',
    iconBg: 'bg-orange-500',
  },
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
    iconBg: 'bg-green-500',
  },
  red: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
    iconBg: 'bg-red-500',
  },
  yellow: {
    bg: 'bg-yellow-100',
    icon: 'text-yellow-600',
    iconBg: 'bg-yellow-500',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
  trend,
  details,
  className = '',
  onClick,
}: StatCardProps) {
  const colorClasses = iconColorClasses[iconColor];

  return (
    <div
      className={`card-scrapbook p-6 group hover:shadow-card-hover transition-all duration-300 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${colorClasses.bg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}
        >
          <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
        </div>

        {trend && (
          <div
            className={`flex items-center space-x-1 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={trend.isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
              />
            </svg>
            <span className="text-sm font-medium">
              {trend.isPositive ? '+' : ''}
              {trend.value}% {trend.period}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-3xl font-bold text-neutral-900 mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-sm text-neutral-600 font-medium">{subtitle}</p>}
        </div>

        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>

        {details && details.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-neutral-100">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">{detail.label}:</span>
                <span className="font-medium text-neutral-700">
                  {typeof detail.value === 'number' ? detail.value.toLocaleString() : detail.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Effet de survol subtil */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/5 to-primary-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

// Composant spécialisé pour les cartes de performance
export function PerformanceCard({
  title,
  currentValue,
  targetValue,
  icon: Icon,
  iconColor = 'blue',
  period = 'ce mois',
}: {
  title: string;
  currentValue: number;
  targetValue: number;
  icon: LucideIcon;
  iconColor?: 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'yellow';
  period?: string;
}) {
  const percentage = Math.min((currentValue / targetValue) * 100, 100);
  const colorClasses = iconColorClasses[iconColor];

  return (
    <div className="card-scrapbook p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses.bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-neutral-900">{currentValue.toLocaleString()}</p>
          <p className="text-sm text-neutral-600">
            sur {targetValue.toLocaleString()} {period}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">{title}</span>
          <span className="font-medium text-neutral-900">{percentage.toFixed(0)}%</span>
        </div>

        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className={`${colorClasses.iconBg} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
