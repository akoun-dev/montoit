/**
 * Types pour le système de notifications
 */

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory =
  | 'verification_result'
  | 'document_request'
  | 'approval_needed'
  | 'payment'
  | 'contract'
  | 'message'
  | 'system'
  | 'profile';

export interface NotificationTemplate {
  id: string;
  code: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  subject: string;
  template_fr: string;
  template_html_fr?: string;
  variables: string[];
}

export interface Notification {
  id: string;
  user_id: string;
  template_code: string;
  channels: NotificationChannel[];
  data: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  priority: NotificationPriority;
  scheduled_for?: string;
  sent_at?: string;
  failed_at?: string;
  error_message?: string;
  created_at: string;
  read_at?: string;
  read_channels: NotificationChannel[];
}

export interface NotificationPreference {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  quiet_hours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
}

export interface NotificationQueue {
  id: string;
  notification_id: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  attempts: number;
  max_attempts: number;
  next_attempt_at?: string;
  channel: NotificationChannel;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}
