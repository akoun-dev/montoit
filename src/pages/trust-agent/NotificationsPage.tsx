/**
 * Page de notifications pour l'agent de confiance
 *
 * Affiche toutes les notifications avec filtres et actions rapides.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Scale,
  FileText,
  Home,
  CheckCircle2,
  Archive,
  Check,
  Filter,
  Trash2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sparkles,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { TrustAgentPageHeader, EmptyState } from '@/shared/ui/trust-agent';
import { cn } from '@/shared/lib/utils';
import { toast } from '@/hooks/shared/useSafeToast';
import {
  useTrustAgentNotifications,
  NOTIFICATION_TYPE_CONFIG,
} from '@/features/trust-agent/hooks/useTrustAgentNotifications';
import type { TrustAgentNotificationType } from '@/features/trust-agent/services/trustAgentNotifications.service';

// Configuration améliorée des icônes avec couleurs
const NOTIFICATION_ICONS: Record<TrustAgentNotificationType, { icon: React.ReactNode; bgGradient: string; iconColor: string }> = {
  new_mission: {
    icon: <Briefcase className="h-5 w-5" />,
    bgGradient: 'from-blue-500 to-blue-600',
    iconColor: 'text-blue-600',
  },
  mission_update: {
    icon: <RefreshCw className="h-5 w-5" />,
    bgGradient: 'from-purple-500 to-purple-600',
    iconColor: 'text-purple-600',
  },
  new_dispute: {
    icon: <Scale className="h-5 w-5" />,
    bgGradient: 'from-red-500 to-red-600',
    iconColor: 'text-red-600',
  },
  dispute_update: {
    icon: <AlertTriangle className="h-5 w-5" />,
    bgGradient: 'from-orange-500 to-orange-600',
    iconColor: 'text-orange-600',
  },
  new_dossier: {
    icon: <FileText className="h-5 w-5" />,
    bgGradient: 'from-amber-500 to-amber-600',
    iconColor: 'text-amber-600',
  },
  dossier_approved: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    bgGradient: 'from-green-500 to-green-600',
    iconColor: 'text-green-600',
  },
  property_certified: {
    icon: <Sparkles className="h-5 w-5" />,
    bgGradient: 'from-teal-500 to-teal-600',
    iconColor: 'text-teal-600',
  },
};

// Options de filtres avec icônes colorées
const TYPE_FILTERS = [
  { value: 'all' as const, label: 'Toutes', icon: <Bell className="h-4 w-4" />, color: 'bg-gray-100 text-gray-700' },
  { value: 'new_mission' as const, label: 'Missions', icon: <Briefcase className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'mission_update' as const, label: 'Suivi missions', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'new_dispute' as const, label: 'Litiges', icon: <Scale className="h-4 w-4" />, color: 'bg-red-100 text-red-700' },
  { value: 'dispute_update' as const, label: 'Suivi litiges', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700' },
  { value: 'new_dossier' as const, label: 'Dossiers', icon: <FileText className="h-4 w-4" />, color: 'bg-amber-100 text-amber-700' },
  { value: 'dossier_approved' as const, label: 'Validations', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-100 text-green-700' },
  { value: 'property_certified' as const, label: 'Certifications', icon: <Home className="h-4 w-4" />, color: 'bg-teal-100 text-teal-700' },
];

const READ_FILTERS = [
  { value: 'all' as const, label: 'Toutes', icon: <Bell className="h-4 w-4" /> },
  { value: false as const, label: 'Non lues', icon: <Zap className="h-4 w-4" /> },
  { value: true as const, label: 'Lues', icon: <Check className="h-4 w-4" /> },
];

// Formatage du temps relatif
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Badge de priorité
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const config = {
    urgent: { label: 'Urgent', className: 'bg-red-500 text-white border-0 animate-pulse' },
    high: { label: 'Important', className: 'bg-orange-500 text-white border-0' },
    medium: { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-0' },
    low: { label: 'Info', className: 'bg-gray-100 text-gray-600 border-0' },
  }[priority] || { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-0' };

  return (
    <Badge className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TrustAgentNotificationType | 'all'>('all');
  const [readFilter, setReadFilter] = useState<boolean | 'all'>('all');

  const {
    notifications,
    groupedNotifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    archive,
    archiveAllRead,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isArchiving,
    isArchivingAll,
    refresh,
  } = useTrustAgentNotifications({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    read: readFilter !== 'all' ? readFilter : undefined,
  });

  // Filtrer les notifications groupées
  const filteredGroups = useMemo(() => {
    const groups: Record<string, typeof notifications> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    if (readFilter === false) {
      Object.keys(groupedNotifications).forEach((key) => {
        groups[key] = groupedNotifications[key as keyof typeof groupedNotifications].filter((n) => !n.read_at);
      });
    } else if (readFilter === true) {
      Object.keys(groupedNotifications).forEach((key) => {
        groups[key] = groupedNotifications[key as keyof typeof groupedNotifications].filter((n) => !!n.read_at);
      });
    } else {
      groups.today = groupedNotifications.today;
      groups.yesterday = groupedNotifications.yesterday;
      groups.week = groupedNotifications.week;
      groups.older = groupedNotifications.older;
    }

    return groups;
  }, [groupedNotifications, readFilter]);

  const hasNotifications = Object.values(filteredGroups).some((group) => group.length > 0);

  // Navigation vers l'entité concernée
  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    const { entity_type, entity_id } = notification;
    if (!entity_type || !entity_id) return;

    switch (entity_type) {
      case 'mission':
        navigate(`/trust-agent/missions/${entity_id}`);
        break;
      case 'dispute':
        navigate(`/trust-agent/disputes/${entity_id}`);
        break;
      case 'property':
        navigate(`/trust-agent/properties/${entity_id}`);
        break;
      case 'dossier':
        navigate(`/trust-agent/dossiers/${entity_id}`);
        break;
      default:
        break;
    }
  };

  const handleQuickMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markAsRead(notificationId);
  };

  const handleQuickArchive = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    archive(notificationId);
  };

  // Groupe labels avec icônes
  const GROUP_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    today: { label: "Aujourd'hui", icon: <Zap className="h-4 w-4" /> },
    yesterday: { label: 'Hier', icon: <Clock className="h-4 w-4" /> },
    week: { label: 'Cette semaine', icon: <CalendarIcon className="h-4 w-4" /> },
    older: { label: 'Plus ancien', icon: <Archive className="h-4 w-4" /> },
  };

  const stats = [
    { label: 'Non lues', value: unreadCount, variant: unreadCount > 0 ? 'warning' : 'secondary' },
    { label: 'Total', value: notifications.length, variant: 'default' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TrustAgentPageHeader
        title="Notifications"
        subtitle="Restez informé de vos missions, litiges et certifications"
        badges={stats.map((s) => ({ label: `${s.value} ${s.label}`, variant: s.variant as any }))}
        actions={[
          {
            label: 'Actualiser',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: () => {
              refresh();
              toast.success('Notifications actualisées');
            },
            variant: 'outline',
          },
          {
            label: 'Tout marquer comme lu',
            icon: <Check className="h-4 w-4" />,
            onClick: () => markAllAsRead(),
            disabled: unreadCount === 0 || isMarkingAllAsRead,
            loading: isMarkingAllAsRead,
            variant: 'outline',
          },
          {
            label: 'Archiver les lues',
            icon: <Archive className="h-4 w-4" />,
            onClick: () => archiveAllRead(),
            disabled: isArchivingAll || notifications.filter((n) => n.read_at).length === 0,
            loading: isArchivingAll,
            variant: 'outline',
          },
        ]}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Filters */}
        <Card className="mb-8 shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Type filter */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-semibold text-gray-700">Type de notification</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TYPE_FILTERS.map((filter) => {
                    const isActive = typeFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        onClick={() => setTypeFilter(filter.value)}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                          'hover:shadow-md hover:scale-105',
                          isActive
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300'
                        )}
                      >
                        <span className={cn(isActive && 'text-white')}>{filter.icon}</span>
                        {filter.label}
                        {isActive && (
                          <ChevronRight className="h-4 w-4 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Read status filter */}
              <div className="lg:w-56">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-semibold text-gray-700">État de lecture</span>
                </div>
                <div className="flex flex-col gap-2">
                  {READ_FILTERS.map((filter) => {
                    const isActive = readFilter === filter.value;
                    return (
                      <button
                        key={String(filter.value)}
                        onClick={() => setReadFilter(filter.value)}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                          'hover:shadow-md',
                          isActive
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300'
                        )}
                      >
                        {filter.icon}
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : !hasNotifications ? (
          <EmptyState
            icon={
              <div className="relative">
                <Bell className="h-16 w-16 text-gray-300" />
                {typeFilter !== 'all' || readFilter !== 'all' ? (
                  <Info className="h-6 w-6 text-gray-400 absolute -bottom-1 -right-1 bg-white rounded-full p-1" />
                ) : null}
              </div>
            }
            title={typeFilter !== 'all' || readFilter !== 'all' ? 'Aucune notification trouvée' : 'Aucune notification'}
            description={
              typeFilter !== 'all' || readFilter !== 'all'
                ? 'Essayez d\'ajuster vos filtres pour voir plus de résultats'
                : 'Vous n\'avez aucune notification pour le moment. Revenez plus tard !'
            }
            variant="filter"
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredGroups).map(([groupKey, groupNotifications]) =>
              groupNotifications.length > 0 ? (
                <div key={groupKey}>
                  {/* Group Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100">
                      {GROUP_LABELS[groupKey].icon}
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      {GROUP_LABELS[groupKey].label}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {groupNotifications.length}
                    </span>
                  </div>

                  {/* Notifications in group */}
                  <div className="space-y-3">
                    {groupNotifications.map((notification) => {
                      const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type];
                      const iconConfig = NOTIFICATION_ICONS[notification.type];
                      const isUnread = !notification.read_at;

                      return (
                        <Card
                          key={notification.id}
                          clickable
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
                            isUnread && 'border-l-4 border-l-primary-500 bg-gradient-to-r from-primary-50/50 to-transparent',
                            !isUnread && 'opacity-80 hover:opacity-100'
                          )}
                        >
                          <CardContent className="p-0">
                            <div className="p-5">
                              <div className="flex items-start gap-4">
                                {/* Icon with gradient background */}
                                <div
                                  className={cn(
                                    'p-3 rounded-2xl flex-shrink-0 shadow-lg',
                                    'bg-gradient-to-br',
                                    iconConfig.bgGradient
                                  )}
                                >
                                  <div className="text-white">
                                    {iconConfig.icon}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-base">
                                          {notification.title}
                                        </h4>
                                        {isUnread && (
                                          <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500" />
                                          </span>
                                        )}
                                        <PriorityBadge priority={notification.priority} />
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                                        {notification.message}
                                      </p>
                                    </div>

                                    {/* Time */}
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-xs text-gray-500 font-medium">
                                        {formatRelativeTime(notification.created_at)}
                                      </span>
                                      <Badge
                                        className={cn(
                                          'text-xs',
                                          typeConfig.color
                                        )}
                                      >
                                        {typeConfig.label}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {isUnread && (
                                    <button
                                      onClick={(e) => handleQuickMarkAsRead(e, notification.id)}
                                      disabled={isMarkingAsRead}
                                      className="p-2.5 rounded-xl hover:bg-green-50 hover:text-green-600 transition-all duration-200 group"
                                      title="Marquer comme lu"
                                    >
                                      <Check className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleQuickArchive(e, notification.id)}
                                    disabled={isArchiving}
                                    className="p-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                                    title="Archiver"
                                  >
                                    <Archive className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Calendar icon pour l'import
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
    <line x1={16} y1={2} x2={16} y2={6} />
    <line x1={8} y1={2} x2={8} y2={6} />
    <line x1={3} y1={10} x2={21} y2={10} />
  </svg>
);
