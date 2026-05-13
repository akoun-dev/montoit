import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  Bell,
  Check,
  X,
  Archive,
  Search,
  Calendar,
  Home,
  MessageSquare,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Info,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'visit' | 'rent_due' | 'rent_overdue' | 'lease_expiry' | 'lease_renewal' | 'application' | 'message' | 'contract' | 'payment' | 'maintenance';
  category?: 'payment' | 'application' | 'lease' | 'message' | 'system' | 'property';
  title: string;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  read_at?: string;
  action_url?: string;
  action_text?: string;
}

const notificationConfig = {
  info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  success: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  warning: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  error: { icon: X, color: 'text-red-600', bgColor: 'bg-red-100' },
  system: { icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  visit: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  rent_due: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  rent_overdue: { icon: X, color: 'text-red-600', bgColor: 'bg-red-100' },
  lease_expiry: { icon: Calendar, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  lease_renewal: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  application: { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  message: { icon: MessageSquare, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  contract: { icon: FileText, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  payment: { icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' },
  maintenance: { icon: Home, color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

const categoryConfig = {
  payment: { label: 'Paiement', icon: CreditCard },
  application: { label: 'Candidature', icon: FileText },
  lease: { label: 'Location', icon: Home },
  message: { label: 'Message', icon: MessageSquare },
  system: { label: 'Système', icon: Bell },
  property: { label: 'Propriété', icon: Home },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();

      // Set up realtime subscription for notifications
      const channel = supabase
        .channel('notifications-realtime-tenant', {
          config: {
            presence: {
              key: user.id,
            },
          },
        })
        .on('postgres_changes', {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          switch (payload.eventType) {
            case 'INSERT': {
              // New notification - add to list
              const newNotification = payload.new as Notification;
              setNotifications((prev) => [newNotification, ...prev]);

              // Show toast notification
              toast.success(newNotification.title, {
                description: newNotification.message.substring(0, 100),
                action: {
                  label: 'Voir',
                  onClick: () => {
                    if (newNotification.action_url) {
                      window.location.href = newNotification.action_url;
                    }
                  },
                },
              });

              // Show browser notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/favicon.ico',
                  tag: newNotification.id,
                });
              }

              // Play sound for new notification
              try {
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(() => {}); // Ignore autoplay restrictions
              } catch (_e) {
                // Sound file might not exist, ignore error
              }
              break;
            }

            case 'UPDATE':
              // Notification updated (marked as read, archived, etc.)
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === payload.new.id ? { ...n, ...(payload.new as Notification) } : n
                )
              );
              break;

            case 'DELETE':
              // Notification deleted
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
              break;
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeConnected(false);
          }
        });

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      return () => {
        supabase.removeChannel(channel);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const filterNotifications = useCallback(() => {
    let filtered = [...notifications];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((n) => n.category === selectedCategory);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((n) => n.type === selectedType);
    }

    // Filter unread only
    if (showUnreadOnly) {
      filtered = filtered.filter((n) => !n.is_read);
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, selectedCategory, selectedType, showUnreadOnly]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    filterNotifications();
  }, [filterNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          !n.is_read ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - notificationDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return (
        "Aujourd'hui à " +
        notificationDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else if (diffDays === 1) {
      return (
        'Hier à ' +
        notificationDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return notificationDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Connexion requise</h2>
          <p className="text-neutral-600">Veuillez vous connecter pour voir vos notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop heading row */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 text-sm font-medium text-neutral-500">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Restez informé des dernières actualités
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            realtimeConnected
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {realtimeConnected ? (
              <><Wifi className="w-3.5 h-3.5" /><span>En direct</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5" /><span>Hors ligne</span></>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Mobile realtime + actions row */}
      <div className="lg:hidden flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
          realtimeConnected
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {realtimeConnected ? (
            <><Wifi className="w-3 h-3" /><span>En direct</span></>
          ) : (
            <><WifiOff className="w-3 h-3" /><span>Hors ligne</span></>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Check className="h-3 w-3" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-neutral-400" />
              <input
                type="text"
                className="w-full pl-9 sm:pl-10 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 min-w-0 sm:flex-none px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="all">Catégories</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="flex-1 min-w-0 sm:flex-none px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="all">Types</option>
              <option value="info">Information</option>
              <option value="success">Succès</option>
              <option value="warning">Attention</option>
              <option value="error">Erreur</option>
              <option value="system">Système</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                id="unread-only"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-neutral-300 rounded"
              />
              Non lues
            </label>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200">
          <h2 className="text-sm sm:text-lg font-semibold text-neutral-900">
            {filteredNotifications.length} notification
            {filteredNotifications.length > 1 ? 's' : ''}
          </h2>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-xl font-semibold text-neutral-900 mb-2">
              {searchTerm ||
              selectedCategory !== 'all' ||
              selectedType !== 'all' ||
              showUnreadOnly
                ? 'Aucune notification trouvée'
                : 'Aucune notification'}
            </h3>
            <p className="text-sm sm:text-base text-neutral-600">
              {searchTerm ||
              selectedCategory !== 'all' ||
              selectedType !== 'all' ||
              showUnreadOnly
                ? 'Essayez de modifier vos filtres'
                : "Vous n'avez pas de notifications pour le moment"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredNotifications.map((notification) => {
              const config = notificationConfig[notification.type] || notificationConfig.info;
              const Icon = config.icon;
              const categoryConfigItem = notification.category ? categoryConfig[notification.category] : null;
              const CategoryIcon = categoryConfigItem ? categoryConfigItem.icon : null;
              return (
                <div
                  key={notification.id}
                  className={`p-3 sm:p-6 hover:bg-neutral-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex items-start gap-2 sm:gap-4 min-w-0">
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${config.bgColor}`}
                      >
                        <Icon
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                          <h3
                            className={`text-xs sm:text-sm text-neutral-900 ${
                              !notification.is_read ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {CategoryIcon && (
                            <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-neutral-100 text-neutral-700">
                              <CategoryIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              {categoryConfigItem?.label || 'Notification'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-neutral-600 mb-1.5 sm:mb-2 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-neutral-500">
                          <span className="flex items-center">
                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                            {formatDate(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="text-blue-600 font-medium">Non lue</span>
                          )}
                        </div>
                        {notification.action_url && (
                          <div className="mt-2 sm:mt-3">
                            <a
                              href={notification.action_url}
                              className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-primary-500 text-white text-[11px] sm:text-sm rounded-lg hover:bg-primary-600 transition font-medium"
                            >
                              {notification.action_text || 'Voir les détails'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1.5 sm:p-2 text-neutral-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                          title="Marquer comme lu"
                        >
                          <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => archiveNotification(notification.id)}
                        className="p-1.5 sm:p-2 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg hover:bg-neutral-100"
                        title="Archiver"
                      >
                        <Archive className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
