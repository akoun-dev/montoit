/**
 * NotificationBell - Cloche de notification pour l'admin
 *
 * Affiche une icône de cloche avec un badge de compteur
 * Ouvre un dropdown avec la liste des notifications
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCircle, User, FileText, AlertTriangle, Server, Shield, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAdminNotifications } from '@/features/admin/hooks/useAdminNotifications';
import { FormatService } from '@/services/format/formatService';

const iconMap = {
  new_user: User,
  document_pending: FileText,
  document_fraud: AlertTriangle,
  service_down: Server,
  quota_exceeded: AlertCircle,
  security_alert: Shield,
  dispute_created: AlertTriangle,
  payment_failed: CreditCard,
  system_error: AlertCircle,
  feature_flag_change: CheckCircle,
};

const colorMap = {
  new_user: 'text-blue-600 bg-blue-50',
  document_pending: 'text-amber-600 bg-amber-50',
  document_fraud: 'text-red-600 bg-red-50',
  service_down: 'text-red-600 bg-red-50',
  quota_exceeded: 'text-orange-600 bg-orange-50',
  security_alert: 'text-red-600 bg-red-50',
  dispute_created: 'text-amber-600 bg-amber-50',
  payment_failed: 'text-red-600 bg-red-50',
  system_error: 'text-red-600 bg-red-50',
  feature_flag_change: 'text-purple-600 bg-purple-50',
};

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useAdminNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-[#FAF7F4] transition-colors"
        aria-label={`Notifications (${unreadCount} non lues)`}
      >
        <Bell className="w-5 h-5 text-[#6B5A4E]" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#F16522] text-white text-[10px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-[#EFEBE9] shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#EFEBE9] flex items-center justify-between">
            <h3 className="font-semibold text-[#2C1810]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#F16522] hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#6B5A4E]">
                <Bell className="w-12 h-12 mx-auto mb-3 text-[#EFEBE9]" />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => {
                const Icon = iconMap[notification.type] || Bell;
                const colors = colorMap[notification.type] || 'text-gray-600 bg-gray-50';
                const isUnread = !notification.read_at;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'px-4 py-3 border-b border-[#EFEBE9] last:border-b-0 cursor-pointer hover:bg-[#FAF7F4] transition-colors relative',
                      isUnread && 'bg-[#FFF5F0]'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Indicateur de non lu */}
                    {isUnread && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#F16522] rounded-full" />
                    )}

                    <div className="flex items-start gap-3 pl-4">
                      {/* Icon */}
                      <div className={cn('p-2 rounded-lg flex-shrink-0', colors)}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C1810] truncate">
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-[#6B5A4E] mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-[#6B5A4E]/60 mt-1">
                          {FormatService.formatRelativeTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer - Voir tout */}
          {notifications.length > 10 && (
            <div className="px-4 py-3 border-t border-[#EFEBE9] text-center">
              <button
                onClick={() => window.location.href = '/admin/notifications'}
                className="text-sm text-[#F16522] hover:underline"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
