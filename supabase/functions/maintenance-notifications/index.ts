/**
 * Edge Function: Maintenance Notifications
 *
 * Gère les notifications liées aux demandes de maintenance :
 * - maintenance_requested : Nouvelle demande de maintenance (propriétaire)
 * - maintenance_updated : Maintenance mise à jour (locataire)
 * - maintenance_completed : Maintenance terminée (locataire)
 * - maintenance_rejected : Maintenance refusée (locataire)
 *
 * Utilise le service role pour contourner les RLS policies de la table notifications.
 *
 * Usage:
 * POST /functions/v1/maintenance-notifications
 * Body: {
 *   action: 'maintenance_requested' | 'maintenance_updated' | 'maintenance_completed' | 'maintenance_rejected',
 *   recipient_id: string,
 *   recipient_name?: string,
 *   property_title?: string,
 *   request_type?: string,
 *   urgency?: string,
 *   description?: string,
 *   message?: string,
 *   data?: Record<string, unknown>
 * }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MaintenanceNotificationAction =
  | 'maintenance_requested'
  | 'maintenance_updated'
  | 'maintenance_completed'
  | 'maintenance_rejected';

interface MaintenanceNotificationRequest {
  action: MaintenanceNotificationAction;
  recipient_id: string;
  recipient_name?: string;
  property_title?: string;
  request_type?: string;
  urgency?: string;
  description?: string;
  message?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      action,
      recipient_id,
      recipient_name: _recipient_name,
      property_title,
      request_type,
      urgency,
      description,
      message,
      data
    } = await req.json() as MaintenanceNotificationRequest;

    console.log(`[maintenance-notifications] Creating notification:`, {
      action,
      recipient_id,
      property_title,
      request_type,
    });

    // Validate required fields
    if (!action || !recipient_id) {
      throw new Error('Missing required fields: action, recipient_id');
    }

    // Déterminer le type de notification et le titre par défaut selon l'action
    let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
    let defaultTitle = '';
    let defaultActionUrl = '';
    let defaultActionText = 'Voir';

    switch (action) {
      case 'maintenance_requested':
        defaultTitle = `🔧 Nouvelle demande de maintenance${property_title ? ` - ${property_title}` : ''}`;
        notificationType = urgency === 'high' ? 'error' : urgency === 'medium' ? 'warning' : 'info';
        defaultActionUrl = '/proprietaire/maintenance';
        defaultActionText = 'Voir les demandes';
        break;

      case 'maintenance_updated':
        defaultTitle = `🔧 Mise à jour de la demande${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'info';
        defaultActionUrl = '/locataire/maintenance';
        defaultActionText = 'Voir la demande';
        break;

      case 'maintenance_completed':
        defaultTitle = `✅ Maintenance terminée${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'success';
        defaultActionUrl = '/locataire/maintenance';
        defaultActionText = 'Voir la demande';
        break;

      case 'maintenance_rejected':
        defaultTitle = `❌ Demande de maintenance refusée${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'error';
        defaultActionUrl = '/locataire/maintenance';
        defaultActionText = 'Voir la demande';
        break;
    }

    // Utiliser le message personnalisé ou générer un message par défaut
    const notificationMessage = message || (() => {
      const urgencyLabels: Record<string, string> = {
        low: 'Basse',
        medium: 'Moyenne',
        high: 'Haute',
      };

      switch (action) {
        case 'maintenance_requested':
          return `Nouvelle demande de maintenance${request_type ? ` : ${request_type}` : ''}${urgency ? ` (Priorité: ${urgencyLabels[urgency] || urgency})` : ''}${description ? `. ${description}` : '.'}`;

        case 'maintenance_updated':
          return `Votre demande de maintenance${request_type ? ` (${request_type})` : ''} a été mise à jour${property_title ? ` pour "${property_title}"` : ''}.`;

        case 'maintenance_completed':
          return `Votre demande de maintenance${request_type ? ` (${request_type})` : ''} a été complétée${property_title ? ` pour "${property_title}"` : ''}.`;

        case 'maintenance_rejected':
          return `Votre demande de maintenance${request_type ? ` (${request_type})` : ''} a été refusée${property_title ? ` pour "${property_title}"` : ''}${description ? `. Raison: ${description}` : '.'}`;

        default:
          return '';
      }
    })();

    // Insérer la notification avec le service role
    const { notificationData, error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: recipient_id,
        type: notificationType,
        title: defaultTitle,
        message: notificationMessage,
        data: {
          action,
          property_title,
          request_type,
          urgency,
          description,
          ...data,
        },
        action_url: defaultActionUrl,
        action_text: defaultActionText,
        sent_via_in_app: true,
        is_read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('[maintenance-notifications] Error inserting notification:', notificationError);
      throw notificationError;
    }

    console.log('[maintenance-notifications] Notification created successfully:', notificationData.id);

    return new Response(
      JSON.stringify({
        success: true,
        notification: notificationData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[maintenance-notifications] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
