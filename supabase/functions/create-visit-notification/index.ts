/**
 * Edge Function: Visit Notification
 *
 * Gère tous les types de notifications liées aux visites :
 * - new : Nouvelle demande de visite (au propriétaire)
 * - confirmed : VISITE CONFIRMÉE (au locataire)
 * - cancelled : Visite annulée (au locataire)
 *
 * Utilise le service role pour contourner les RLS policies de la table notifications.
 *
 * Usage:
 * POST /functions/v1/create-visit-notification
 * Body: {
 *   action: 'new' | 'confirmed' | 'cancelled',
 *   tenant_id: string,
 *   owner_id?: string,
 *   property_id?: string,
 *   property_title: string,
 *   visit_date: string,
 *   visit_time: string,
 *   visit_type?: string,
 *   property_address?: string,
 *   cancellation_reason?: string
 * }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationAction = 'new' | 'confirmed' | 'cancelled';

interface VisitNotificationRequest {
  action: NotificationAction;
  tenant_id: string;
  owner_id?: string;
  property_id?: string;
  property_title: string;
  visit_date: string;
  visit_time: string;
  visit_type?: string;
  property_address?: string;
  cancellation_reason?: string;
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
      tenant_id,
      owner_id,
      property_id,
      property_title,
      visit_date,
      visit_time,
      visit_type,
      property_address,
      cancellation_reason
    } = await req.json() as VisitNotificationRequest;

    console.log(`[visit-notification] Creating notification for action:`, {
      action,
      tenant_id,
      owner_id,
      property_title,
      visit_date,
      visit_time,
    });

    // Validate required fields
    if (!action || !property_title || !visit_date || !visit_time) {
      throw new Error('Missing required fields: action, property_title, visit_date, visit_time');
    }

    if (action === 'new' && !owner_id) {
      throw new Error('owner_id is required for new visit notifications');
    }

    if ((action === 'confirmed' || action === 'cancelled') && !tenant_id) {
      throw new Error('tenant_id is required for confirmed/cancelled notifications');
    }

    const formattedDate = new Date(visit_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Déterminer le destinataire et le contenu selon l'action
    let recipientId: string;
    let title: string;
    let message: string;
    let actionUrl: string;
    let actionText: string;

    switch (action) {
      case 'new': {
        // Notification au propriétaire pour une nouvelle demande
        recipientId = owner_id!;

        // Récupérer les infos du locataire
        const { data: tenantProfile } = await supabaseClient
          .from('profiles')
          .select('full_name, phone')
          .eq('id', tenant_id)
          .single();

        const visitTypeLabels: Record<string, string> = {
          in_person: 'Sur place',
          video_call: 'Visio',
          virtual: 'Virtuelle',
        };
        const visitTypeLabel = visit_type ? visitTypeLabels[visit_type] || visit_type : 'Sur place';

        title = '📅 Nouvelle demande de visite';
        message = `Demande de visite pour "${property_title}" le ${formattedDate} à ${visit_time}. Type: ${visitTypeLabel}. Candidat: ${tenantProfile?.full_name || 'N/A'} - ${tenantProfile?.phone || 'N/A'}`;
        actionUrl = '/proprietaire/visites';
        actionText = 'Voir les visites';
        break;
      }

      case 'confirmed': {
        // Notification au locataire pour confirmation
        recipientId = tenant_id;

        const { data: tenantProfile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', tenant_id)
          .single();

        const tenantName = tenantProfile?.full_name || 'Locataire';

        title = 'VISITE CONFIRMÉE';
        message = `Bonjour ${tenantName}, votre visite pour "${property_title}" a été confirmée par le propriétaire. Date : ${formattedDate} à ${visit_time}.${property_address ? ` Adresse : ${property_address}` : ''}`;
        actionUrl = '/locataire/mes-visites';
        actionText = 'Voir mes visites';
        break;
      }

      case 'cancelled': {
        // Notification au locataire pour annulation
        recipientId = tenant_id;

        const { data: tenantProfile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', tenant_id)
          .single();

        const tenantName = tenantProfile?.full_name || 'Locataire';

        title = '❌ Visite annulée';
        message = `Bonjour ${tenantName}, votre visite pour "${property_title}" prévue le ${formattedDate} à ${visit_time} a été annulée par le propriétaire.`;
        if (cancellation_reason) {
          message += ` Motif : ${cancellation_reason}`;
        }
        actionUrl = '/locataire/mes-visites';
        actionText = 'Voir mes visites';
        break;
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Insérer la notification avec le service role
    const { data: notification, error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'visit',
        title,
        message,
        data: {
          property_id,
          property_title,
          visit_date: formattedDate,
          visit_time,
          visit_type,
          property_address,
          action,
          tenant_id,
          owner_id,
          cancellation_reason,
        },
        action_url: actionUrl,
        action_text: actionText,
        sent_via_in_app: true,
        is_read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('[visit-notification] Error inserting notification:', notificationError);
      throw notificationError;
    }

    console.log('[visit-notification] Notification created successfully:', notification.id);

    return new Response(
      JSON.stringify({
        success: true,
        notification
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[visit-notification] Error:', error);
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
