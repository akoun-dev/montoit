import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Signature',
};

interface MonArtisanWebhook {
  event_type: 'quote_received' | 'artisan_assigned' | 'job_started' | 'job_completed' | 'job_cancelled';
  job_reference: string;
  request_id: string;
  data: any;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookSecret = Deno.env.get('MONARTISAN_WEBHOOK_SECRET');
    const signature = req.headers.get('X-Webhook-Signature');

    if (webhookSecret && signature) {
      console.log('Vérification signature webhook Mon Artisan');
    }

    const webhookData: MonArtisanWebhook = await req.json();

    const { data: jobRequest, error: fetchError } = await supabase
      .from('monartisan_job_requests')
      .select('*, maintenance_request:maintenance_requests(*)')
      .eq('monartisan_job_reference', webhookData.job_reference)
      .single();

    if (fetchError || !jobRequest) {
      console.error('Demande introuvable:', webhookData.job_reference);
      return new Response(
        JSON.stringify({ error: 'Demande introuvable' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    switch (webhookData.event_type) {
      case 'quote_received': {
        const { data: contractor } = await supabase
          .from('monartisan_contractors')
          .select('*')
          .eq('monartisan_id', webhookData.data.contractor_id)
          .single();

        const { data: quote, error: quoteError } = await supabase
          .from('monartisan_quotes')
          .insert({
            job_request_id: jobRequest.id,
            contractor_id: contractor?.id,
            monartisan_quote_id: webhookData.data.quote_id,
            quote_amount: webhookData.data.amount,
            quote_details: webhookData.data.details,
            estimated_duration_hours: webhookData.data.duration_hours,
            proposed_start_date: webhookData.data.start_date,
            valid_until: webhookData.data.valid_until,
            contractor_notes: webhookData.data.notes,
            api_data: webhookData.data,
          })
          .select()
          .single();

        if (!quoteError) {
          await supabase
            .from('monartisan_job_requests')
            .update({
              status: 'quotes_received',
              quotes_received_count: jobRequest.quotes_received_count + 1,
            })
            .eq('id', jobRequest.id);

          await supabase.from('notifications').insert({
            user_id: jobRequest.requester_id,
            type: 'maintenance_quote_received',
            title: 'Nouveau devis reçu',
            message: `Vous avez reçu un devis de ${webhookData.data.contractor_name} pour ${webhookData.data.amount} FCFA`,
            data: { quote_id: quote.id, amount: webhookData.data.amount },
          });
        }
        break;
      }

      case 'artisan_assigned': {
        const { data: contractor } = await supabase
          .from('monartisan_contractors')
          .select('*')
          .eq('monartisan_id', webhookData.data.contractor_id)
          .single();

        await supabase
          .from('monartisan_job_requests')
          .update({
            status: 'artisan_assigned',
            assigned_contractor_id: contractor?.id,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', jobRequest.id);

        await supabase.from('notifications').insert({
          user_id: jobRequest.requester_id,
          type: 'maintenance_artisan_assigned',
          title: 'Artisan assigné',
          message: `${webhookData.data.contractor_name} a été assigné à votre demande`,
          data: { contractor_name: webhookData.data.contractor_name },
        });
        break;
      }

      case 'job_started': {
        await supabase
          .from('monartisan_job_requests')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', jobRequest.id);

        await supabase
          .from('maintenance_requests')
          .update({ status: 'in_progress' })
          .eq('id', jobRequest.maintenance_request_id);

        await supabase.from('notifications').insert({
          user_id: jobRequest.requester_id,
          type: 'maintenance_started',
          title: 'Travaux commencés',
          message: 'L\'artisan a commencé les travaux de maintenance',
          data: { job_request_id: jobRequest.id },
        });
        break;
      }

      case 'job_completed': {
        await supabase
          .from('monartisan_job_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobRequest.id);

        await supabase
          .from('maintenance_requests')
          .update({ status: 'resolved' })
          .eq('id', jobRequest.maintenance_request_id);

        await supabase.from('notifications').insert({
          user_id: jobRequest.requester_id,
          type: 'maintenance_completed',
          title: 'Travaux terminés',
          message: 'Les travaux de maintenance ont été complétés. Merci de confirmer.',
          data: { job_request_id: jobRequest.id },
        });
        break;
      }

      case 'job_cancelled': {
        await supabase
          .from('monartisan_job_requests')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: webhookData.data.reason,
          })
          .eq('id', jobRequest.id);

        await supabase.from('notifications').insert({
          user_id: jobRequest.requester_id,
          type: 'maintenance_cancelled',
          title: 'Demande annulée',
          message: `Demande annulée: ${webhookData.data.reason}`,
          data: { reason: webhookData.data.reason },
        });
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook traité avec succès' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur traitement webhook Mon Artisan:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur serveur',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
