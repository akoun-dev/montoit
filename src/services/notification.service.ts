/**
 * Service de notifications pour le système de tiers de confiance
 *
 * Gère l'envoi de notifications via différents canaux (email, SMS, in-app)
 * pour les décisions de vérification et autres événements importants.
 */

import { supabase } from '@/integrations/supabase/client';
import { getTemplate, renderTemplate } from './notificationTemplates';
import type {
  Notification,
  NotificationChannel,
  NotificationPreference,
  NotificationQueue,
  NotificationTemplate,
} from '@/types/notification.types';

/**
 * Service de gestion des notifications
 */
export const notificationService = {
  /**
   * Envoyer une notification basée sur un template
   */
  async sendNotification(options: {
    userId: string;
    templateCode: string;
    channels: NotificationChannel[];
    data: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    scheduledFor?: Date;
  }): Promise<Notification> {
    const { userId, templateCode, channels, data, priority = 'normal', scheduledFor } = options;

    // Récupérer le template
    const template = getTemplate(templateCode);
    if (!template) {
      throw new Error(`Template non trouvé: ${templateCode}`);
    }

    // Vérifier les préférences de l'utilisateur
    const preferences = await this.getUserPreferences(userId);
    const enabledChannels = this.filterEnabledChannels(channels, preferences, template.category);

    if (enabledChannels.length === 0) {
      throw new Error('Aucun canal activé pour cette notification');
    }

    // Créer la notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        template_code: templateCode,
        channels: enabledChannels,
        data,
        status: scheduledFor ? 'pending' : 'sent',
        priority: priority || template.priority,
        scheduled_for: scheduledFor?.toISOString(),
        sent_at: scheduledFor ? null : new Date().toISOString(),
        read_channels: [],
      })
      .select()
      .single();

    if (error) throw error;

    // Si pas de programmation, envoyer immédiatement
    if (!scheduledFor) {
      await this.processNotification(notification.id, enabledChannels, template, data);
    } else {
      // Ajouter à la file d'attente
      await this.queueNotification(notification.id, enabledChannels, scheduledFor);
    }

    return notification as Notification;
  },

  /**
   * Envoyer une notification de décision de vérification
   */
  async sendVerificationDecisionNotification(options: {
    userId: string;
    dossierType: 'tenant' | 'owner' | 'agency';
    decision: 'approved' | 'rejected';
    dossierId: string;
    reason?: string;
    trustScore?: number;
    validityDurationMonths?: number;
  }): Promise<void> {
    const { userId, dossierType, decision, dossierId, reason, trustScore, validityDurationMonths } = options;

    // Récupérer le profil de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('Profil non trouvé');

    const templateCode = `${dossierType}_verification_${decision}`;
    const data: Record<string, unknown> = {
      full_name: profile.full_name || 'Utilisateur',
      decision_date: new Date().toLocaleDateString('fr-FR'),
      application_id: dossierId,
      trust_score: trustScore || 0,
      rejection_reason: reason || '',
      rejected_docs: reason || '',
      validity_duration_months: validityDurationMonths,
      valid_until: validityDurationMonths
        ? new Date(Date.now() + validityDurationMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
        : undefined,
    };

    await this.sendNotification({
      userId,
      templateCode,
      channels: decision === 'approved' ? ['email', 'sms', 'in_app'] : ['email', 'in_app'],
      data,
      priority: 'high',
    });
  },

  /**
   * Envoyer une notification de demande de documents complémentaires
   */
  async sendAdditionalDocumentsRequest(options: {
    userId: string;
    dossierId: string;
    requiredDocuments: string[];
    deadline: Date;
  }): Promise<void> {
    const { userId, dossierId, requiredDocuments, deadline } = options;

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const documentsList = requiredDocuments.map((doc) => `- ${doc}`).join('\n');

    await this.sendNotification({
      userId,
      templateCode: 'additional_documents_requested',
      channels: ['email', 'in_app'],
      data: {
        full_name: profile?.full_name || 'Utilisateur',
        required_documents: documentsList,
        deadline: deadline.toLocaleDateString('fr-FR'),
        application_id: dossierId,
      },
      priority: 'high',
    });
  },

  /**
   * Envoyer une notification d'expiration de vérification
   */
  async sendVerificationExpiryNotification(options: {
    userId: string;
    verificationType: string;
    daysLeft: number;
    verificationId: string;
  }): Promise<void> {
    const { userId, verificationType, daysLeft, verificationId } = options;

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const templateCode = daysLeft <= 0 ? 'verification_expired' : 'verification_expiring_soon';

    await this.sendNotification({
      userId,
      templateCode,
      channels: ['email', 'in_app'],
      data: {
        full_name: profile?.full_name || 'Utilisateur',
        verification_type: verificationType,
        days_left: String(Math.max(0, daysLeft)),
        expired_since: String(Math.abs(daysLeft)),
        verification_id: verificationId,
      },
      priority: 'high',
    });
  },

  /**
   * Envoyer une notification de nouvelle demande de visite au propriétaire
   */
  async sendVisitRequestedNotification(options: {
    ownerId: string;
    propertyId: string;
    propertyTitle: string;
    visitDate: string;
    visitTime: string;
    visitType: string;
    tenantId: string;
  }): Promise<void> {
    const { ownerId, propertyTitle, visitDate, visitTime, visitType, tenantId } = options;

    // Récupérer les profils
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ownerId)
      .single();

    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', tenantId)
      .single();

    // Récupérer l'adresse de la propriété
    const { data: property } = await supabase
      .from('properties')
      .select('address, city')
      .eq('id', propertyId)
      .single();

    // Formatter l'adresse
    let propertyAddress = property?.city || 'Adresse non renseignée';
    if (property?.address) {
      try {
        const { formatAddress } = await import('@/shared/utils/address');
        propertyAddress = formatAddress(property.address);
      } catch {
        // Ignore formatting errors
      }
    }

    // Formatter la date et l'heure
    const formattedDate = new Date(visitDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Labels des types de visite
    const visitTypeLabels: Record<string, string> = {
      in_person: 'Sur place',
      video_call: 'Visio',
      virtual: 'Virtuelle',
    };

    await this.sendNotification({
      userId: ownerId,
      templateCode: 'new_visit_requested',
      channels: ['email', 'in_app'],
      data: {
        owner_name: ownerProfile?.full_name || 'Propriétaire',
        property_title: propertyTitle,
        visit_date: formattedDate,
        visit_time: visitTime,
        visit_type_label: visitTypeLabels[visitType] || visitType,
        tenant_name: tenantProfile?.full_name || 'Candidat',
        tenant_phone: tenantProfile?.phone || 'Non renseigné',
        tenant_email: tenantProfile?.email || 'Non renseigné',
        property_address: propertyAddress,
      },
      priority: 'high',
    });
  },

  /**
   * Envoyer une notification de visite confirmée au locataire
   */
  async sendVisitConfirmedNotification(options: {
    tenantId: string;
    propertyTitle: string;
    visitDate: string;
    visitTime: string;
    propertyAddress: string;
  }): Promise<void> {
    const { tenantId, propertyTitle, visitDate, visitTime, propertyAddress } = options;

    // Récupérer le profil du locataire
    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', tenantId)
      .single();

    // Formatter la date
    const formattedDate = new Date(visitDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await this.sendNotification({
      userId: tenantId,
      templateCode: 'visit_confirmed',
      channels: ['email', 'in_app'],
      data: {
        tenant_name: tenantProfile?.full_name || 'Locataire',
        property_title: propertyTitle,
        visit_date: formattedDate,
        visit_time: visitTime,
        property_address: propertyAddress,
      },
      priority: 'high',
    });
  },

  /**
   * Envoyer une notification de visite annulée au locataire
   */
  async sendVisitCancelledNotification(options: {
    tenantId: string;
    propertyTitle: string;
    visitDate: string;
    visitTime: string;
    cancellationReason?: string;
  }): Promise<void> {
    const { tenantId, propertyTitle, visitDate, visitTime, cancellationReason } = options;

    // Récupérer le profil du locataire
    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', tenantId)
      .single();

    // Formatter la date
    const formattedDate = new Date(visitDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await this.sendNotification({
      userId: tenantId,
      templateCode: 'visit_cancelled',
      channels: ['email', 'in_app'],
      data: {
        tenant_name: tenantProfile?.full_name || 'Locataire',
        property_title: propertyTitle,
        visit_date: formattedDate,
        visit_time: visitTime,
        cancellation_reason: cancellationReason || '',
      },
      priority: 'normal',
    });
  },

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string, channels: NotificationChannel[]): Promise<void> {
    const { data: current } = await supabase
      .from('notifications')
      .select('read_channels')
      .eq('id', notificationId)
      .single();

    const existingChannels = (current?.read_channels as NotificationChannel[]) || [];
    const newChannels = [...new Set([...existingChannels, ...channels])];

    const { error } = await supabase
      .from('notifications')
      .update({
        read_channels: newChannels,
        read_at: newChannels.length > 0 ? new Date().toISOString() : null,
      })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      channel?: NotificationChannel;
    }
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.contains('channels', options.channel || 'in_app');
      // Note: filtrer côté client pour read_channels car contains ne marche pas bien pour ça
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    let notifications = (data || []) as Notification[];

    // Filtrer les non lues si demandé
    if (options?.unreadOnly && options.channel) {
      notifications = notifications.filter(
        (n) => !n.read_channels.includes(options.channel as NotificationChannel)
      );
    }

    return notifications;
  },

  /**
   * Récupérer les préférences de notification d'un utilisateur
   * Structure existante en base (ancienne structure)
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // Préférences par défaut
      return {
        user_id: userId,
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        categories: {
          verification_result: true,
          document_request: true,
          approval_needed: true,
          payment: true,
          contract: true,
          message: true,
          system: true,
          profile: true,
        },
      };
    }

    // Convertir l'ancienne structure vers la nouvelle structure attendue
    const oldPrefs = data as {
      email_notifications?: boolean;
      sms_notifications?: boolean;
      push_notifications?: boolean;
      in_app_notifications?: boolean;
      payment_notifications?: boolean;
      application_notifications?: boolean;
      message_notifications?: boolean;
      lease_notifications?: boolean;
      preferences?: Json;
    };

    // Extraire les catégories du champ preferences jsonb si disponible
    const categories: Record<string, boolean> = {
      verification_result: true,
      document_request: true,
      approval_needed: true,
      payment: true,
      contract: true,
      message: true,
      system: true,
      profile: true,
    };

    if (oldPrefs.preferences && typeof oldPrefs.preferences === 'object') {
      const prefs = oldPrefs.preferences as Record<string, unknown>;
      if (prefs.verification_result !== undefined) categories.verification_result = prefs.verification_result as boolean;
      if (prefs.document_request !== undefined) categories.document_request = prefs.document_request as boolean;
      if (prefs.payment !== undefined) categories.payment = prefs.payment as boolean;
      if (prefs.contract !== undefined) categories.contract = prefs.contract as boolean;
      if (prefs.message !== undefined) categories.message = prefs.message as boolean;
    }

    // Utiliser les colonnes spécifiques comme fallback
    return {
      user_id: userId,
      email_enabled: oldPrefs.email_notifications ?? true,
      sms_enabled: oldPrefs.sms_notifications ?? false,
      push_enabled: oldPrefs.push_notifications ?? true,
      categories: {
        ...categories,
        payment: oldPrefs.payment_notifications ?? categories.payment,
        application: oldPrefs.application_notifications ?? categories.approval_needed,
        message: oldPrefs.message_notifications ?? categories.message,
        lease: oldPrefs.lease_notifications ?? categories.contract,
      },
    };
  },

  /**
   * Mettre à jour les préférences de notification
   * Fonctionne avec l'ancienne structure en base
   */
  async updateUserPreferences(
    userId: string,
    prefs: Partial<Omit<NotificationPreference, 'user_id'>>
  ): Promise<void> {
    // Préparer les données pour l'ancienne structure
    const updateData: Record<string, unknown> = {
      user_id: userId,
    };

    // Mettre à jour les colonnes globales
    if (prefs.email_enabled !== undefined) {
      updateData.email_notifications = prefs.email_enabled;
    }
    if (prefs.sms_enabled !== undefined) {
      updateData.sms_notifications = prefs.sms_enabled;
    }
    if (prefs.push_enabled !== undefined) {
      updateData.push_notifications = prefs.push_enabled;
    }

    // Mettre à jour les colonnes spécifiques et le JSONB preferences
    if (prefs.categories) {
      updateData.payment_notifications = prefs.categories.payment;
      updateData.application_notifications = prefs.categories.approval_needed ?? prefs.categories.application;
      updateData.message_notifications = prefs.categories.message;
      updateData.lease_notifications = prefs.categories.contract ?? prefs.categories.lease;

      // Mettre à jour le champ preferences jsonb pour compatibilité future
      updateData.preferences = prefs.categories;
    }

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(updateData);

    if (error) throw error;
  },

  /**
   * Filtrer les canaux activés selon les préférences
   */
  filterEnabledChannels(
    channels: NotificationChannel[],
    preferences: NotificationPreference,
    category: string
  ): NotificationChannel[] {
    return channels.filter((channel) => {
      // Vérifier si le canal est activé globalement
      if (channel === 'email' && !preferences.email_enabled) return false;
      if (channel === 'sms' && !preferences.sms_enabled) return false;
      if (channel === 'push' && !preferences.push_enabled) return false;

      // Vérifier si la catégorie est activée
      // Mapping des catégories vers les colonnes de l'ancienne structure
      let categoryEnabled = true;
      if (category === 'verification_result') {
        categoryEnabled = preferences.categories?.verification_result ?? true;
      } else if (category === 'document_request') {
        categoryEnabled = preferences.categories?.document_request ?? true;
      } else if (category === 'approval_needed' || category === 'application') {
        categoryEnabled = preferences.categories?.approval_needed ?? preferences.categories?.application ?? true;
      } else if (category === 'payment') {
        categoryEnabled = preferences.categories?.payment ?? true;
      } else if (category === 'contract' || category === 'lease') {
        categoryEnabled = preferences.categories?.contract ?? preferences.categories?.lease ?? true;
      } else if (category === 'message') {
        categoryEnabled = preferences.categories?.message ?? true;
      }

      return categoryEnabled !== false;
    });
  },

  /**
   * Traiter l'envoi d'une notification via les différents canaux
   */
  async processNotification(
    notificationId: string,
    channels: NotificationChannel[],
    template: NotificationTemplate,
    data: Record<string, unknown>
  ): Promise<void> {
    const renderedContent = renderTemplate(template, data);

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmail(notificationId, template.subject, renderedContent, data);
            break;
          case 'sms':
            await this.sendSMS(notificationId, renderedContent, data);
            break;
          case 'in_app':
            // Les notifications in-app sont stockées dans la table notifications
            break;
          case 'push':
            await this.sendPushNotification(notificationId, template.subject, renderedContent);
            break;
        }
      } catch (error) {
        console.error(`Erreur lors de l'envoi via ${channel}:`, error);
        // Marquer le canal en échec dans la queue
        await this.markChannelFailed(notificationId, channel, error);
      }
    }
  },

  /**
   * Envoyer un email
   */
  async sendEmail(
    _notificationId: string,
    _subject: string,
    _content: string,
    _data: Record<string, unknown>
  ): Promise<void> {
    // Récupérer l'email de l'utilisateur
    const { data: notification } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', _notificationId)
      .single();

    if (!notification) throw new Error('Notification non trouvée');

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', notification.user_id)
      .single();

    if (!profile?.email) throw new Error('Email non trouvé');

    // Utiliser Resend ou le service d'email configuré
    const { resend } = await import('@/integrations/resend/client');

    if (!resend) {
      console.warn('Resend non configuré, email non envoyé');
      return;
    }

    await resend.emails.send({
      from: 'MonToit <noreply@montoit.ci>',
      to: profile.email,
      subject: _subject,
      text: _content,
    });
  },

  /**
   * Envoyer un SMS
   */
  async sendSMS(
    _notificationId: string,
    _content: string,
    _data: Record<string, unknown>
  ): Promise<void> {
    const { data: notification } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', _notificationId)
      .single();

    if (!notification) throw new Error('Notification non trouvée');

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', notification.user_id)
      .single();

    if (!profile?.phone) throw new Error('Téléphone non trouvé');

    // Utiliser Azure Communication Services ou le service SMS configuré
    // Pour l'instant, juste logguer
    console.log(`SMS à ${profile.phone}: ${_content.substring(0, 100)}...`);
  },

  /**
   * Envoyer une notification push
   */
  async sendPushNotification(
    notificationId: string,
    title: string,
    content: string
  ): Promise<void> {
    // Implémentation des push notifications (via Firebase ou autre)
    console.log(`Push notification: ${title} - ${content.substring(0, 50)}...`);
  },

  /**
   * Ajouter une notification à la file d'attente
   */
  async queueNotification(
    notificationId: string,
    channels: NotificationChannel[],
    scheduledFor: Date
  ): Promise<void> {
    // Créer les entrées de queue pour chaque canal
    for (const channel of channels) {
      await supabase.from('notification_queue').insert({
        notification_id: notificationId,
        status: 'queued',
        attempts: 0,
        max_attempts: 3,
        next_attempt_at: scheduledFor.toISOString(),
        channel,
        created_at: new Date().toISOString(),
      });
    }
  },

  /**
   * Marquer un canal en échec
   */
  async markChannelFailed(
    notificationId: string,
    channel: NotificationChannel,
    error: unknown
  ): Promise<void> {
    await supabase
      .from('notification_queue')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq('notification_id', notificationId)
      .eq('channel', channel);
  },

  /**
   * Traiter les notifications programmées (cron job)
   */
  async processScheduledNotifications(): Promise<void> {
    const { data: queuedItems } = await supabase
      .from('notification_queue')
      .select('*, notification:notifications(*)')
      .eq('status', 'queued')
      .lte('next_attempt_at', new Date().toISOString())
      .limit(100);

    if (!queuedItems) return;

    for (const item of queuedItems as unknown as NotificationQueue & {
      notification: Notification;
    }[]) {
      try {
        // Mettre à jour le statut
        await supabase
          .from('notification_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        const template = getTemplate(item.notification.template_code);
        if (!template) continue;

        await this.processNotification(
          item.notification_id,
          [item.channel],
          template,
          item.notification.data
        );

        // Marquer comme envoyé
        await supabase
          .from('notification_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', item.id);
      } catch (error) {
        const attempts = (item.attempts || 0) + 1;

        if (attempts >= item.max_attempts) {
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              attempts,
              error_message: error instanceof Error ? error.message : String(error),
            })
            .eq('id', item.id);
        } else {
          // Réessayer plus tard
          const nextAttempt = new Date(Date.now() + 5 * 60 * 1000 * attempts); // 5, 10, 15 min...

          await supabase
            .from('notification_queue')
            .update({
              status: 'queued',
              attempts,
              next_attempt_at: nextAttempt.toISOString(),
            })
            .eq('id', item.id);
        }
      }
    }
  },
};

export default notificationService;
