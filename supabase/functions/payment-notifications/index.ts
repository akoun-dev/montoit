/**
 * Edge Function: Payment Notifications
 *
 * Gère les notifications liées aux paiements :
 * - payment_received : Paiement reçu (propriétaire)
 * - rent_due : Loyer dû (locataire)
 * - rent_overdue : Loyer en retard (locataire)
 * - payment_failed : Paiement échoué (locataire)
 *
 * Utilise le service role pour contourner les RLS policies de la table notifications.
 *
 * Usage:
 * POST /functions/v1/payment-notifications
 * Body: {
 *   action: 'payment_received' | 'rent_due' | 'rent_overdue' | 'payment_failed',
 *   recipient_id: string,
 *   recipient_name?: string,
 *   property_title?: string,
 *   amount?: number,
 *   due_date?: string,
 *   payment_method?: string,
 *   message: string,
 *   data?: Record<string, unknown>
 * }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentNotificationAction =
  | 'payment_received'
  | 'rent_due'
  | 'rent_overdue'
  | 'payment_failed';

interface PaymentNotificationRequest {
  action: PaymentNotificationAction;
  recipient_id: string;
  recipient_name?: string;
  property_title?: string;
  amount?: number;
  due_date?: string;
  payment_method?: string;
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
      amount,
      due_date,
      payment_method,
      message,
      data
    } = await req.json() as PaymentNotificationRequest;

    console.log(`[payment-notifications] Creating notification:`, {
      action,
      recipient_id,
      property_title,
      amount,
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

    // Formatter le montant
    const formattedAmount = amount ? `${amount.toLocaleString('fr-FR')} FCFA` : '';

    switch (action) {
      case 'payment_received':
        defaultTitle = `💰 Paiement reçu${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'success';
        defaultActionUrl = '/proprietaire/paiements';
        defaultActionText = 'Voir les paiements';
        break;

      case 'rent_due':
        defaultTitle = `📅 Loyer à payer${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'warning';
        defaultActionUrl = '/locataire/paiements';
        defaultActionText = 'Payer maintenant';
        break;

      case 'rent_overdue':
        defaultTitle = `⚠️ Loyer en retard${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'error';
        defaultActionUrl = '/locataire/paiements';
        defaultActionText = 'Payer maintenant';
        break;

      case 'payment_failed':
        defaultTitle = `❌ Paiement échoué${property_title ? ` - ${property_title}` : ''}`;
        notificationType = 'error';
        defaultActionUrl = '/locataire/paiements';
        defaultActionText = 'Réessayer';
        break;
    }

    // Utiliser le message personnalisé ou générer un message par défaut
    const notificationMessage = message || (() => {
      switch (action) {
        case 'payment_received':
          return `Votre paiement de ${formattedAmount} a bien été reçu${property_title ? ` pour "${property_title}"` : ''}. Merci !`;
        case 'rent_due':
          return `Votre loyer de ${formattedAmount} est à payer${due_date ? ` pour le ${new Date(due_date).toLocaleDateString('fr-FR')}` : ''}. Effectuez le paiement pour éviter tout désagréément.`;
        case 'rent_overdue':
          return `Votre loyer de ${formattedAmount} est en retard${due_date ? ` depuis le ${new Date(due_date).toLocaleDateString('fr-FR')}` : ''}. Veuillez effectuer le paiement rapidement pour éviter des pénalités.`;
        case 'payment_failed':
          return `Votre paiement de ${formattedAmount} a échoué${payment_method ? ` (${payment_method})` : ''}. Veuillez réessayer ou utiliser un autre moyen de paiement.`;
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
          amount,
          due_date,
          payment_method,
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
      console.error('[payment-notifications] Error inserting notification:', notificationError);
      throw notificationError;
    }

    console.log('[payment-notifications] Notification created successfully:', notificationData.id);

    return new Response(
      JSON.stringify({
        success: true,
        notification: notificationData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[payment-notifications] Error:', error);
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
