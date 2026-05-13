import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  Trash2,
  CheckCheck,
  Shield,
  AlertCircle,
  Search,
  ExternalLink,
  Wifi,
  WifiOff,
  Users,
  Activity,
  FileText,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types/notification.types';

// Configuration des icônes par type de notification pour l'admin
const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  user_role_changed: Users,
  new_user_registered: Users,
  verification_completed: Check,
  verification_failed: AlertCircle,
  system_alert: AlertCircle,
  security_alert: Shield,
  payment_issue: AlertCircle,
  service_status_change: Activity,
  configuration_updated: Settings,
  document_review_requested: FileText,
  default: Bell,
};

// Configuration des couleurs par type de notification
const NOTIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  user_role_changed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  new_user_registered: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  verification_completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  verification_failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  system_alert: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  security_alert: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  payment_issue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  service_status_change: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  configuration_updated: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  document_review_requested: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  default: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

// Configuration des redirections par type de notification pour l'admin
const NOTIFICATION_REDIRECTS: Record<string, (_data: Record<string, unknown>) => string> = {
  user_role_changed: (data) => `/admin/gestion-roles`,
  new_user_registered: () => `/admin/utilisateurs`,
  verification_completed: () => `/admin/validation-documents`,
  verification_failed: () => `/admin/validation-documents`,
  system_alert: () => `/admin/service-monitoring`,
  security_alert: () => `/admin/logs`,
  payment_issue: () => `/admin/transactions`,
  service_status_change: () => `/admin/service-monitoring`,
  configuration_updated: () => `/admin/regles-metier`,
  document_review_requested: (data) => `/admin/validation-documents`,
};

type NotificationFilter = 'all' | 'unread' | 'read' | 'high_priority';

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();

      // Set up realtime subscription pour mettre à jour la liste locale uniquement
      // Les toasts et notifications navigateur sont gérés par le NotificationProvider global
      const channel = supabase
        .channel('notifications-list-admin')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Admin notification list update:', payload.eventType);

            switch (payload.eventType) {
              case 'INSERT':
                setNotifications((prev) => [payload.new as Notification, ...prev]);
                break;
              case 'UPDATE':
                setNotifications((prev) =>
                  prev.map((n) =>
                    n.id === payload.new.id ? { ...n, ...(payload.new as Notification) } : n
                  )
                );
                break;
              case 'DELETE':
                setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
                break;
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeConnected(false);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications(user.id, {
        limit: 100,
      });
      setNotifications(data);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications admin:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
      setNotifications(prev =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      toast.success('Notification marquée comme lue');
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
      toast.error('Erreur lors du marquage');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unreadNotifications.map((n) =>
          supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', n.id)
        )
      );
      setNotifications(prev =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
      toast.error('Erreur lors du marquage');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.size === 0) return;
    try {
      await supabase
        .from('notifications')
        .delete()
        .in('id', Array.from(selectedNotifications));
      setNotifications((prev) =>
        prev.filter((n) => !selectedNotifications.has(n.id))
      );
      setSelectedNotifications(new Set());
      toast.success(`${selectedNotifications.size} notification(s) supprimée(s)`);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    const redirectFn = NOTIFICATION_REDIRECTS[notification.type];
    if (redirectFn) {
      const path = redirectFn(notification.data as Record<string, unknown>);
      navigate(path);
    } else if (notification.data?.action_url) {
      navigate(String(notification.data.action_url));
    } else if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread' && notif.is_read) return false;
    if (filter === 'read' && !notif.is_read) return false;
    if (filter === 'high_priority' && notif.priority !== 'high') return false;

    if (searchQuery) {
      const searchText = `${notif.title} ${notif.message}`.toLowerCase();
      if (!searchText.includes(searchQuery.toLowerCase())) return false;
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;
  const highPriorityCount = notifications.filter((n) => n.priority === 'high' && !n.is_read).length;

  const getNotificationConfig = (type: string) => {
    const colors = NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.default;
    const Icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    return { colors, Icon };
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-sm mb-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                  Notifications Admin
                  {unreadCount > 0 && (
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </h1>
                <p className="text-orange-100">Centre de notifications administrateur</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              realtimeConnected
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            }`}>
              {realtimeConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>En direct</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Hors ligne</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
              <Bell className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('unread')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Non lues</p>
                <p className="text-2xl font-bold text-orange-500">{unreadCount}</p>
              </div>
              <div className="relative">
                <Bell className="h-10 w-10 text-orange-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('high_priority')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Haute priorité</p>
                <p className="text-2xl font-bold text-red-500">{highPriorityCount}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('read')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Lues</p>
                <p className="text-2xl font-bold text-green-500">{readCount}</p>
              </div>
              <Check className="h-10 w-10 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Non lues
              </button>
              <button
                onClick={() => setFilter('high_priority')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'high_priority'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Haute priorité
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'read'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Lues
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {selectedNotifications.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedNotifications.size} sélectionnée(s)
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4 inline mr-1" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <CheckCheck className="h-5 w-5" />
              Tout marquer comme lu
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 flex items-center justify-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune notification</h3>
            <p className="text-gray-500">
              {filter !== 'all'
                ? `Aucune notification ${
                    filter === 'unread' ? 'non lue' : filter === 'high_priority' ? 'haute priorité' : 'lue'
                  }`
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => {
                const isRead = notification.is_read;
                const isSelected = selectedNotifications.has(notification.id);
                const { colors, Icon } = getNotificationConfig(notification.type);
                const isHighPriority = notification.priority === 'high';

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !isRead ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedNotifications((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(notification.id)) {
                              newSet.delete(notification.id);
                            } else {
                              newSet.add(notification.id);
                            }
                            return newSet;
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border flex-shrink-0 relative`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                        {isHighPriority && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                      </div>

                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4
                              className={`font-semibold text-gray-900 flex items-center gap-2 ${
                                !isRead ? 'text-orange-600' : ''
                              }`}
                            >
                              {notification.title}
                              {!isRead && (
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              )}
                              {isHighPriority && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                                  Urgent
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {format(new Date(notification.created_at), 'Pp', { locale: fr })}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Marquer comme lu"
                              >
                                <Check className="h-4 w-4 text-gray-500" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Voir"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
