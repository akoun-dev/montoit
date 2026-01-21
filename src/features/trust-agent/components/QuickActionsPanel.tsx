import { useState } from 'react';
import {
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  Phone,
  Mail,
  ArrowUp,
  Download,
  Zap,
  ChevronRight,
} from 'lucide-react';

interface QuickActionButton {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'indigo';
  count?: number;
  urgent?: boolean;
  action: () => void;
}

interface QuickActionsPanelProps {
  actions?: QuickActionButton[];
  className?: string;
}

export default function QuickActionsPanel({ actions, className = '' }: QuickActionsPanelProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // Actions par défaut - handlers à implémenter
  const defaultActions: QuickActionButton[] = [
    {
      id: 'send_proposal',
      label: 'Envoyer proposition',
      icon: Send,
      color: 'blue',
      count: 4,
      action: () => {
        /* TODO: Implement send proposal */
      },
    },
    {
      id: 'contact_parties',
      label: 'Contacter parties',
      icon: MessageSquare,
      color: 'green',
      count: 7,
      action: () => {
        /* TODO: Implement contact parties */
      },
    },
    {
      id: 'escalate_dispute',
      label: 'Escalader litige',
      icon: ArrowUp,
      color: 'red',
      count: 2,
      urgent: true,
      action: () => {
        /* TODO: Implement escalate dispute */
      },
    },
    {
      id: 'mark_resolved',
      label: 'Marquer résolu',
      icon: CheckCircle,
      color: 'purple',
      count: 5,
      action: () => {
        /* TODO: Implement mark resolved */
      },
    },
    {
      id: 'schedule_meeting',
      label: 'Programmer réunion',
      icon: Clock,
      color: 'indigo',
      count: 3,
      action: () => {
        /* TODO: Implement schedule meeting */
      },
    },
    {
      id: 'generate_report',
      label: 'Générer rapport',
      icon: FileText,
      color: 'orange',
      action: () => {
        /* TODO: Implement generate report */
      },
    },
  ];

  const actionList = actions || defaultActions;

  const getColorClasses = (color: string, urgent = false) => {
    const classes = {
      blue: 'text-blue-600 hover:bg-blue-50 border-blue-200',
      green: 'text-green-600 hover:bg-green-50 border-green-200',
      red: urgent
        ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-300'
        : 'text-red-600 hover:bg-red-50 border-red-200',
      purple: 'text-purple-600 hover:bg-purple-50 border-purple-200',
      orange: 'text-orange-600 hover:bg-orange-50 border-orange-200',
      indigo: 'text-indigo-600 hover:bg-indigo-50 border-indigo-200',
    };
    return classes[color as keyof typeof classes] || classes['blue'];
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-gray-900">Actions Rapides</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {actionList.filter((a) => a.count && a.count > 0).length} en attente
        </span>
      </div>

      <div className="space-y-3">
        {actionList.map((action) => {
          const Icon = action.icon;
          const colorClasses = getColorClasses(action.color, action.urgent);

          return (
            <button
              key={action.id}
              onClick={action.action}
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
              className={`
                w-full flex items-center justify-between p-4 rounded-lg border-2 
                transition-all duration-200 hover:shadow-md
                ${colorClasses}
                ${action.urgent ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {action.urgent && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  )}
                </div>
                <div className="text-left">
                  <span className="font-medium block">{action.label}</span>
                  {hoveredAction === action.id && action.count && action.count > 0 && (
                    <span className="text-xs opacity-75">{action.count} élément(s) en attente</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {action.count && action.count > 0 && (
                  <span
                    className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${action.urgent ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'}
                  `}
                  >
                    {action.count}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 opacity-50" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Section actions spéciales */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Actions spécialisées</h4>
        <div className="grid grid-cols-2 gap-3">
          <SpecialActionButton
            icon={UserCheck}
            label="Validation rapide"
            color="text-green-600"
            onClick={() => {
              /* TODO: Implement quick validation */
            }}
          />
          <SpecialActionButton
            icon={Phone}
            label="Appel urgence"
            color="text-red-600"
            onClick={() => {
              /* TODO: Implement emergency call */
            }}
          />
          <SpecialActionButton
            icon={Mail}
            label="Email modèle"
            color="text-blue-600"
            onClick={() => {
              /* TODO: Implement template email */
            }}
          />
          <SpecialActionButton
            icon={Download}
            label="Export données"
            color="text-purple-600"
            onClick={() => {
              /* TODO: Implement data export */
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SpecialActionButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200
        hover:border-gray-300 hover:shadow-sm transition-all
      `}
    >
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
}
