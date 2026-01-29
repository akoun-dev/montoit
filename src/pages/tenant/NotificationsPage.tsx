import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import {
  Bell,
  Check,
  X,
  Archive,
  Filter,
  Search,
  Calendar,
  Home,
  MessageSquare,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  category: 'payment' | 'application' | 'lease' | 'message' | 'system' | 'property';
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

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, selectedCategory, selectedType, showUnreadOnly]);

  const loadNotifications = async () => {
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
  };

  const filterNotifications = () => {
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
  };

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
    <div>
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </h1>
                <p className="text-[#E8D4C5] mt-1">
                  Restez informé des dernières actualités concernant vos demandes
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 self-start"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Toutes les catégories</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Tous les types</option>
              <option value="info">Information</option>
              <option value="success">Succès</option>
              <option value="warning">Attention</option>
              <option value="error">Erreur</option>
              <option value="system">Système</option>
            </select>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="unread-only"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="unread-only" className="ml-2 text-sm text-gray-700">
                Non lues uniquement
              </label>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredNotifications.length} notification
              {filteredNotifications.length > 1 ? 's' : ''}
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ||
                selectedCategory !== 'all' ||
                selectedType !== 'all' ||
                showUnreadOnly
                  ? 'Aucune notification trouvée'
                  : 'Aucune notification'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ||
                selectedCategory !== 'all' ||
                selectedType !== 'all' ||
                showUnreadOnly
                  ? 'Essayez de modifier vos filtres'
                  : "Vous n'avez pas de notifications pour le moment"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const Icon = notificationConfig[notification.type].icon;
                const CategoryIcon = categoryConfig[notification.category].icon;
                return (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`p-2 rounded-lg ${notificationConfig[notification.type].bgColor}`}
                        >
                          <Icon
                            className={`w-5 h-5 ${notificationConfig[notification.type].color}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3
                              className={`text-sm font-medium text-gray-900 ${
                                !notification.is_read ? 'font-semibold' : ''
                              }`}
                            >
                              {notification.title}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {categoryConfig[notification.category].label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <span className="text-blue-600 font-medium">Non lue</span>
                            )}
                          </div>
                          {notification.action_url && (
                            <div className="mt-3">
                              <a
                                href={notification.action_url}
                                className="inline-flex items-center px-3 py-1 bg-primary-500 text-white text-sm rounded hover:bg-primary-600 transition"
                              >
                                {notification.action_text || 'Voir les détails'}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Marquer comme lu"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => archiveNotification(notification.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Archiver"
                        >
                          <Archive className="w-5 h-5" />
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
    </div>
  );
}
