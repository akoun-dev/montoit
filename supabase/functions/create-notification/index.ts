/**
 * Edge Function: Generic Notification
 *
 * Gère tous les types de notifications :
 * - Applications : new_application, application_accepted, application_rejected
 * - Payments : payment_received, rent_due, rent_overdue, payment_failed
 * - Maintenance : maintenance_requested, maintenance_updated, maintenance_completed
 * - Messages : new_message
 * - Contracts : contract_ready, contract_signed, lease_expiry, lease_renewal
 *
 * Utilise le service role pour contourner les RLS policies de la table notifications.
 *
 * Usage:
 * POST /functions/v1/create-notification
 * Body: {
 *   action: 'new_application' | 'application_accepted' | 'application_rejected' |
 *          'payment_received' | 'rent_due' | 'rent_overdue' | 'payment_failed' |
 *          'maintenance_requested' | 'new_message' | 'contract_ready' | 'lease_expiry',
 *   recipient_id: string,
 *   recipient_name?: string,
 *   title?: string,
 *   message: string,
 *   data?: Record<string, unknown>,
 *   action_url?: string,
 *   action_text?: string
 * }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationAction =
  | 'new_application'
  | 'application_accepted'
  | 'application_rejected'
  | 'payment_received'
  | 'rent_due'
  | 'rent_overdue'
  | 'payment_failed'
  | 'maintenance_requested'
  | 'maintenance_updated'
  | 'maintenance_completed'
  | 'maintenance_rejected'
  | 'new_message'
  | 'contract_ready'
  | 'contract_signed'
  | 'lease_expiry'
  | 'lease_renewal';

interface NotificationRequest {
  action: NotificationAction;
  recipient_id: string;
  recipient_name?: string;
  title?: string;
  message: string;
  data?: Record<string, unknown>;
  action_url?: string;
  action_text?: string;
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
      title,
      message,
      data,
      action_url,
      action_text
    } = await req.json() as NotificationRequest;

    console.log(`[create-notification] Creating notification:`, {
      action,
      recipient_id,
      title,
    });

    // Validate required fields
    if (!action || !recipient_id || !message) {
      throw new Error('Missing required fields: action, recipient_id, message');
    }

    // Déterminer le type de notification et le titre par défaut selon l'action
    let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
    let defaultTitle = title;

    if (!defaultTitle) {
      switch (action) {
        case 'new_application':
          defaultTitle = '📄 Nouvelle candidature';
          notificationType = 'info';
          break;
        case 'application_accepted':
          defaultTitle = '✅ Candidature acceptée';
          notificationType = 'success';
          break;
        case 'application_rejected':
          defaultTitle = '❌ Candidature refusée';
          notificationType = 'error';
          break;
        case 'payment_received':
          defaultTitle = '💰 Paiement reçu';
          notificationType = 'success';
          break;
        case 'rent_due':
          defaultTitle = '📅 Loyer dû';
          notificationType = 'warning';
          break;
        case 'rent_overdue':
          defaultTitle = '⚠️ Loyer en retard';
          notificationType = 'error';
          break;
        case 'payment_failed':
          defaultTitle = '❌ Paiement échoué';
          notificationType = 'error';
          break;
        case 'maintenance_requested':
          defaultTitle = '🔧 Demande de maintenance';
          notificationType = 'info';
          break;
        case 'maintenance_updated':
          defaultTitle = '🔧 Maintenance mise à jour';
          notificationType = 'info';
          break;
        case 'maintenance_completed':
          defaultTitle = '✅ Maintenance terminée';
          notificationType = 'success';
          break;
        case 'maintenance_rejected':
          defaultTitle = '❌ Maintenance refusée';
          notificationType = 'error';
          break;
        case 'new_message':
          defaultTitle = '💬 Nouveau message';
          notificationType = 'info';
          break;
        case 'contract_ready':
          defaultTitle = '📄 Contrat prêt à signer';
          notificationType = 'info';
          break;
        case 'contract_signed':
          defaultTitle = '✅ Contrat signé';
          notificationType = 'success';
          break;
        case 'lease_expiry':
          defaultTitle = '📅 Bail expiré';
          notificationType = 'warning';
          break;
        case 'lease_renewal':
          defaultTitle = '🔄 Renouvellement de bail';
          notificationType = 'info';
          break;
      }
    }

    // Insérer la notification avec le service role
    const { notificationData, error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: recipient_id,
        type: notificationType,
        title: defaultTitle,
        message,
        data: {
          action,
          ...data,
        },
        action_url: action_url,
        action_text: action_text || 'Voir',
        sent_via_in_app: true,
        is_read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('[create-notification] Error inserting notification:', notificationError);
      throw notificationError;
    }

    console.log('[create-notification] Notification created successfully:', notificationData.id);

    return new Response(
      JSON.stringify({
        success: true,
        notification: notificationData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[create-notification] Error:', error);
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
