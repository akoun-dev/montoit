import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ValidationMetricsProps {
  stats: {
    activeDisputes: number;
    resolvedDisputes: number;
    avgResolutionTime: number;
    satisfactionScore: number;
    pendingValidations: number;
    underReview: number;
    escalationRate: number;
    successRate: number;
  };
  period?: 'today' | 'week' | 'month';
}

export default function ValidationMetrics({ stats, period = 'month' }: ValidationMetricsProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = hours / 24;
      return `${days.toFixed(1)}j`;
    }
  };
  // Use formatTime if needed in future
  void formatTime;

  const metrics = [
    {
      key: 'successRate',
      label: 'Taux de résolution',
      value: stats.successRate,
      unit: '%',
      color: '#10b981',
      bgColor: 'bg-green-50',
      icon: TrendingUp,
      change: '+5%',
      trend: 'up' as const,
    },
    {
      key: 'avgResolutionTime',
      label: 'Temps moyen',
      value: stats.avgResolutionTime,
      unit: 'j',
      color: '#f59e0b',
      bgColor: 'bg-yellow-50',
      icon: Minus,
      change: '-0.3j',
      trend: 'down' as const,
    },
    {
      key: 'satisfactionScore',
      label: 'Satisfaction',
      value: stats.satisfactionScore,
      unit: '/5',
      color: '#8b5cf6',
      bgColor: 'bg-purple-50',
      icon: TrendingUp,
      change: '+0.2',
      trend: 'up' as const,
    },
    {
      key: 'escalationRate',
      label: "Taux d'escalade",
      value: stats.escalationRate,
      unit: '%',
      color: '#ef4444',
      bgColor: 'bg-red-50',
      icon: TrendingDown,
      change: '+2%',
      trend: 'up' as const,
    },
  ];

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (trend: 'up' | 'down', isGood: boolean) => {
    if (trend === 'up' && isGood) return 'text-green-600';
    if (trend === 'up' && !isGood) return 'text-red-600';
    if (trend === 'down' && isGood) return 'text-green-600';
    return 'text-red-600';
  };

  const isPositiveTrend = (key: string, _trend: 'up' | 'down') => {
    switch (key) {
      case 'successRate':
      case 'satisfactionScore':
        return true;
      case 'avgResolutionTime':
      case 'escalationRate':
        return false;
      default:
        return true;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const TrendIcon = getTrendIcon(metric.trend);
        const positiveTrend = isPositiveTrend(metric.key, metric.trend);
        const trendColor = getTrendColor(metric.trend, positiveTrend);

        return (
          <div
            key={metric.key}
            className={`bg-white rounded-lg shadow-md p-6 transition-all duration-200 cursor-pointer hover:shadow-lg ${metric.bgColor}`}
            onMouseEnter={() => setHoveredMetric(metric.key)}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <Icon className="w-6 h-6" style={{ color: metric.color }} />
              </div>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{metric.change}</span>
              </div>
            </div>

            {/* Graphique circulaire principal */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Cercle de fond */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Cercle de progression */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={metric.color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={
                      metric.key === 'successRate' || metric.key === 'satisfactionScore'
                        ? `${2 * Math.PI * 40 * (1 - metric.value / (metric.key === 'satisfactionScore' ? 5 : 100))}`
                        : `${2 * Math.PI * 40 * (1 - metric.value / 100)}`
                    }
                    className="transition-all duration-1000 ease-out"
                    style={{
                      strokeLinecap: 'round',
                    }}
                  />
                </svg>

                {/* Valeur au centre */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-xl font-bold text-gray-900">{metric.value}</span>
                    <span className="text-sm text-gray-600">{metric.unit}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="font-medium text-gray-900 mb-1">{metric.label}</h3>
              <p className="text-sm text-gray-600">
                {period === 'today' && "Aujourd'hui"}
                {period === 'week' && 'Cette semaine'}
                {period === 'month' && 'Ce mois'}
              </p>
            </div>

            {/* Indicateur de tendance détaillé au hover */}
            {hoveredMetric === metric.key && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Comparé à la période précédente</p>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColor} ${metric.bgColor}`}
                  >
                    <TrendIcon className="w-3 h-3" />
                    {metric.change}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Composant spécialisé pour les KPIs principaux
export function KeyMetricsCards({ stats }: { stats: any }) {
  const keyCards = [
    {
      label: 'Litiges actifs',
      value: stats.activeDisputes,
      icon: '📋',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Litiges résolus',
      value: stats.resolvedDisputes,
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Validations en attente',
      value: stats.pendingValidations,
      icon: '⏳',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'En examen',
      value: stats.underReview,
      icon: '👁️',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {keyCards.map((card, index) => (
        <div key={index} className={`bg-white rounded-lg shadow-md p-6 ${card.bgColor}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-2xl`}>{card.icon}</div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
          <p className="text-sm text-gray-600">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
