import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  X,
  Trash2,
  CheckCheck,
  Calendar,
  FileText,
  UserCheck,
  AlertCircle,
  Search,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types/notification.types';

// Configuration des icônes par type de notification
const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  new_visit_requested: Calendar,
  visit_confirmed: Calendar,
  visit_cancelled: Calendar,
  visit_reminder: Calendar,
  tenant_verification_approved: UserCheck,
  tenant_verification_rejected: AlertCircle,
  owner_verification_approved: UserCheck,
  owner_verification_rejected: AlertCircle,
  additional_documents_requested: FileText,
  verification_expiring_soon: AlertCircle,
  verification_expired: AlertCircle,
  document_approved: Check,
  document_rejected: X,
  new_rental_application: FileText,
  application_approved: Check,
  application_rejected: X,
  contract_signed: FileText,
  payment_received: Check,
  payment_overdue: AlertCircle,
  // Notifications de mandat
  mandate_created_agency: FileText,
  mandate_accepted: Check,
  mandate_refused: X,
  mandate_signed: FileText,
  mandate_terminated: AlertCircle,
  mandate_suspended: AlertCircle,
  mandate_reactivated: Check,
  default: Bell,
};

// Configuration des couleurs par type de notification
const NOTIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new_visit_requested: { bg: 'bg-[#F16522]/10', text: 'text-[#F16522]', border: 'border-[#F16522]/20' },
  visit_confirmed: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  visit_cancelled: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  visit_reminder: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  tenant_verification_approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  tenant_verification_rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  owner_verification_approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  owner_verification_rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  additional_documents_requested: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  verification_expiring_soon: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  verification_expired: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  document_approved: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  document_rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  new_rental_application: { bg: 'bg-[#F16522]/10', text: 'text-[#F16522]', border: 'border-[#F16522]/20' },
  application_approved: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  application_rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  contract_signed: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  payment_received: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  payment_overdue: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  // Notifications de mandat
  mandate_created_agency: { bg: 'bg-[#F16522]/10', text: 'text-[#F16522]', border: 'border-[#F16522]/20' },
  mandate_accepted: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  mandate_refused: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  mandate_signed: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  mandate_terminated: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  mandate_suspended: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  mandate_reactivated: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  default: { bg: 'bg-[#8B7466]/10', text: 'text-[#6B5A4E]', border: 'border-[#EFEBE9]' },
};

// Configuration des redirections par type de notification pour les agences
const NOTIFICATION_REDIRECTS: Record<string, (_data: Record<string, unknown>) => string> = {
  new_visit_requested: () => `/agences/visites`,
  visit_confirmed: () => `/agences/visites`,
  visit_cancelled: () => `/agences/visites`,
  visit_reminder: () => `/agences/visites`,
  tenant_verification_approved: () => `/agences/candidatures`,
  tenant_verification_rejected: () => `/agences/candidatures`,
  new_rental_application: () => `/agences/candidatures`,
  application_approved: () => `/agences/contrats`,
  application_rejected: () => `/agences/candidatures`,
  contract_signed: () => `/agences/contrats`,
  payment_received: () => `/agences/paiements`,
  payment_overdue: () => `/agences/paiements`,
  additional_documents_requested: () => `/agences/documents`,
  verification_expiring_soon: () => `/agences/profil`,
  verification_expired: () => `/agences/profil`,
  document_approved: () => `/agences/documents`,
  document_rejected: () => `/agences/documents`,
  // Notifications de mandat - rediriger vers la page des mandats
  mandate_created_agency: (data) => `/agences/mandats`,
  mandate_accepted: (data) => `/agences/mandats`,
  mandate_refused: (data) => `/agences/mandats`,
  mandate_signed: (data) => `/agences/mandats`,
  mandate_terminated: (data) => `/agences/mandats`,
  mandate_suspended: (data) => `/agences/mandats`,
  mandate_reactivated: (data) => `/agences/mandats`,
};

type NotificationFilter = 'all' | 'unread' | 'read';

export default function AgencyNotificationsPage() {
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
        .channel('notifications-list-agency')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
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
      console.error('Erreur lors du chargement des notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId, ['in_app']);
      setNotifications(prev =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_channels: [...(n.read_channels || []), 'in_app'], read_at: new Date().toISOString() }
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
      const unreadNotifications = notifications.filter((n) => !n.read_channels?.includes('in_app'));
      await Promise.all(
        unreadNotifications.map((n) =>
          notificationService.markAsRead(n.id, ['in_app'])
        )
      );
      setNotifications(prev =>
        prev.map((n) => ({
          ...n,
          read_channels: [...(n.read_channels || []), 'in_app'],
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
    const isRead = notification.read_channels?.includes('in_app');
    if (!isRead) {
      handleMarkAsRead(notification.id);
    }

    const redirectFn = NOTIFICATION_REDIRECTS[notification.template_code];
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
    const isRead = notif.read_channels?.includes('in_app');
    if (filter === 'unread' && isRead) return false;
    if (filter === 'read' && !isRead) return false;

    if (searchQuery) {
      const template = NOTIFICATION_ICONS[notif.template_code] ? NOTIFICATION_ICONS[notif.template_code] : Bell;
      const searchText = `${notif.template_code}`.toLowerCase();
      if (!searchText.includes(searchQuery.toLowerCase())) return false;
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read_channels?.includes('in_app')).length;
  const readCount = notifications.filter((n) => n.read_channels?.includes('in_app')).length;

  const getNotificationConfig = (type: string) => {
    const colors = NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.default;
    const Icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    return { colors, Icon };
  };

  return (
    <div className="min-h-[75vh] bg-[#FAF7F4] px-2 sm:px-4 pb-4 pt-6 lg:pt-2">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F16522]/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-[#F16522]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#6B5A4E] flex items-center gap-3">
                Centre de Notifications
                {unreadCount > 0 && (
                  <span className="bg-[#F16522] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </h1>
              <p className="text-[#8B7466]">Gérez toutes vos notifications d'agence</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            realtimeConnected
              ? 'bg-green-500/20 text-green-600'
              : 'bg-red-500/20 text-red-600'
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

      {/* Content */}
      <div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div
            className="bg-white rounded-[24px] p-5 border border-[#EFEBE9] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7466] mb-1">Total</p>
                <p className="text-2xl font-bold text-[#6B5A4E]">{notifications.length}</p>
              </div>
              <Bell className="h-10 w-10 text-[#8B7466]" />
            </div>
          </div>

          <div
            className="bg-white rounded-[24px] p-5 border border-[#EFEBE9] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('unread')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7466] mb-1">Non lues</p>
                <p className="text-2xl font-bold text-[#F16522]">{unreadCount}</p>
              </div>
              <div className="relative">
                <Bell className="h-10 w-10 text-[#F16522]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F16522] rounded-full text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-[24px] p-5 border border-[#EFEBE9] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter('read')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7466] mb-1">Lues</p>
                <p className="text-2xl font-bold text-green-600">{readCount}</p>
              </div>
              <Check className="h-10 w-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[24px] shadow-sm border border-[#EFEBE9] p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-[#F16522] text-white shadow-md'
                    : 'bg-[#FAF7F4] text-[#6B5A4E] hover:bg-[#EFEBE9]'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === 'unread'
                    ? 'bg-[#F16522] text-white shadow-md'
                    : 'bg-[#FAF7F4] text-[#6B5A4E] hover:bg-[#EFEBE9]'
                }`}
              >
                Non lues
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === 'read'
                    ? 'bg-[#F16522] text-white shadow-md'
                    : 'bg-[#FAF7F4] text-[#6B5A4E] hover:bg-[#EFEBE9]'
                }`}
              >
                Lues
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8B7466]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
              />
            </div>

            {selectedNotifications.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8B7466]">
                  {selectedNotifications.size} sélectionnée(s)
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4 inline mr-1" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="bg-white rounded-[24px] shadow-sm border border-[#EFEBE9] p-4 mb-4">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 text-[#F16522] hover:text-[#E55A1D] font-medium transition-colors"
            >
              <CheckCheck className="h-5 w-5" />
              Tout marquer comme lu
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-[24px] border border-[#EFEBE9] p-12 flex items-center justify-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-[#EFEBE9] p-12 text-center shadow-sm">
            <div className="bg-[#FAF7F4] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-10 w-10 text-[#8B7466]" />
            </div>
            <h3 className="text-lg font-bold text-[#6B5A4E] mb-2">Aucune notification</h3>
            <p className="text-[#8B7466]">
              {filter !== 'all'
                ? `Aucune notification ${filter === 'unread' ? 'non lue' : 'lue'}`
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden">
            <div className="divide-y divide-[#EFEBE9]">
              {filteredNotifications.map((notification) => {
                const isRead = notification.read_channels?.includes('in_app');
                const isSelected = selectedNotifications.has(notification.id);
                const { colors, Icon } = getNotificationConfig(notification.template_code);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#FAF7F4] transition-colors cursor-pointer ${
                      !isRead ? 'bg-[#F16522]/5' : ''
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
                        className="mt-1 h-4 w-4 rounded border-[#EFEBE9] text-[#F16522] focus:ring-[#F16522]"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>

                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4
                              className={`font-semibold text-[#6B5A4E] ${
                                !isRead ? 'text-[#F16522]' : ''
                              }`}
                            >
                              {notification.template_code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {!isRead && (
                                <span className="ml-2 w-2 h-2 bg-[#F16522] rounded-full inline-block"></span>
                              )}
                            </h4>
                            <p className="text-sm text-[#8B7466] mt-1">
                              {Object.values(notification.data || {}).slice(0, 2).join(' • ')}
                            </p>
                            <p className="text-xs text-[#8B7466] mt-2">
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
                                className="p-2 hover:bg-[#FAF7F4] rounded-xl transition-colors"
                                title="Marquer comme lu"
                              >
                                <Check className="h-4 w-4 text-[#8B7466]" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              className="p-2 hover:bg-[#FAF7F4] rounded-xl transition-colors"
                              title="Voir"
                            >
                              <ExternalLink className="h-4 w-4 text-[#8B7466]" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                              className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-[#8B7466] hover:text-red-500" />
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
