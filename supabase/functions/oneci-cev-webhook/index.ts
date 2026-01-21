import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ONECIWebhookPayload {
  event_type: 'status_update' | 'cev_issued' | 'documents_requested' | 'rejected';
  request_id: string;
  reference_number: string;
  status: string;
  data?: {
    cev_number?: string;
    cev_document_url?: string;
    cev_qr_code?: string;
    cev_verification_url?: string;
    cev_issue_date?: string;
    cev_expiry_date?: string;
    rejection_reason?: string;
    rejection_details?: any;
    additional_documents_requested?: string[];
    additional_documents_deadline?: string;
  };
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

    const payload: ONECIWebhookPayload = await req.json();

    console.log('Webhook ONECI reçu:', payload);

    const { data: cevRequest, error: fetchError } = await supabase
      .from('cev_requests')
      .select('*, landlord:profiles!cev_requests_landlord_id_fkey(id, email, full_name), tenant:profiles!cev_requests_tenant_id_fkey(id, email, full_name)')
      .eq('oneci_reference_number', payload.reference_number)
      .single();

    if (fetchError || !cevRequest) {
      console.error('Demande CEV introuvable:', payload.reference_number);
      return new Response(
        JSON.stringify({ error: 'Demande CEV introuvable' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const updateData: any = {
      oneci_response_data: payload,
      oneci_review_date: new Date().toISOString(),
    };

    switch (payload.event_type) {
      case 'status_update':
        updateData.status = payload.status === 'reviewing' ? 'under_review' : payload.status;
        break;

      case 'cev_issued':
        updateData.status = 'issued';
        updateData.cev_number = payload.data?.cev_number;
        updateData.cev_document_url = payload.data?.cev_document_url;
        updateData.cev_qr_code = payload.data?.cev_qr_code;
        updateData.cev_verification_url = payload.data?.cev_verification_url;
        updateData.cev_issue_date = payload.data?.cev_issue_date || new Date().toISOString();
        updateData.cev_expiry_date = payload.data?.cev_expiry_date;
        break;

      case 'documents_requested':
        updateData.status = 'documents_requested';
        updateData.additional_documents_requested = payload.data?.additional_documents_requested;
        updateData.additional_documents_deadline = payload.data?.additional_documents_deadline;
        break;

      case 'rejected':
        updateData.status = 'rejected';
        updateData.rejection_reason = payload.data?.rejection_reason;
        updateData.rejection_details = payload.data?.rejection_details;
        break;
    }

    const { error: updateError } = await supabase
      .from('cev_requests')
      .update(updateData)
      .eq('id', cevRequest.id);

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = 'cev_update';

    switch (payload.event_type) {
      case 'status_update':
        notificationTitle = 'Mise à jour demande CEV';
        notificationMessage = `Le statut de votre demande CEV (${payload.reference_number}) a été mis à jour: ${payload.status}`;
        break;

      case 'cev_issued':
        notificationTitle = 'Certificat CEV émis';
        notificationMessage = `Votre Certificat Électronique Validé (CEV) a été émis avec succès ! Numéro: ${payload.data?.cev_number}`;
        notificationType = 'cev_issued';
        break;

      case 'documents_requested':
        notificationTitle = 'Documents additionnels requis';
        notificationMessage = `L'ONECI demande des documents supplémentaires pour votre demande CEV (${payload.reference_number}). Veuillez les soumettre avant le ${payload.data?.additional_documents_deadline}.`;
        notificationType = 'cev_documents_requested';
        break;

      case 'rejected':
        notificationTitle = 'Demande CEV rejetée';
        notificationMessage = `Votre demande CEV (${payload.reference_number}) a été rejetée. Raison: ${payload.data?.rejection_reason}`;
        notificationType = 'cev_rejected';
        break;
    }

    await supabase.from('notifications').insert([
      {
        user_id: cevRequest.landlord.id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: {
          request_id: cevRequest.id,
          reference_number: payload.reference_number,
          cev_number: payload.data?.cev_number,
        },
      },
      {
        user_id: cevRequest.tenant.id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: {
          request_id: cevRequest.id,
          reference_number: payload.reference_number,
          cev_number: payload.data?.cev_number,
        },
      },
    ]);

    if (payload.event_type === 'cev_issued') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: cevRequest.landlord.email,
          subject: 'Certificat CEV émis - MonToit',
          html: `
            <h2>Certificat CEV émis avec succès</h2>
            <p>Bonjour ${cevRequest.landlord.full_name},</p>
            <p>Votre Certificat Électronique Validé (CEV) a été émis avec succès par l'ONECI !</p>
            <p><strong>Numéro CEV:</strong> ${payload.data?.cev_number}</p>
            <p><strong>Date d'émission:</strong> ${new Date(payload.data?.cev_issue_date || '').toLocaleDateString('fr-FR')}</p>
            <p>Vous pouvez maintenant télécharger votre certificat depuis votre espace MonToit.</p>
            <p><a href="${supabaseUrl}/cev-request/${cevRequest.id}">Voir ma demande CEV</a></p>
          `,
        }),
      }).catch((error) => {
        console.error('Erreur envoi email:', error);
      });

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: cevRequest.tenant.email,
          subject: 'Certificat CEV émis - MonToit',
          html: `
            <h2>Certificat CEV émis avec succès</h2>
            <p>Bonjour ${cevRequest.tenant.full_name},</p>
            <p>Le Certificat Électronique Validé (CEV) pour votre bail a été émis avec succès par l'ONECI !</p>
            <p><strong>Numéro CEV:</strong> ${payload.data?.cev_number}</p>
            <p><strong>Date d'émission:</strong> ${new Date(payload.data?.cev_issue_date || '').toLocaleDateString('fr-FR')}</p>
            <p>Votre bail dispose maintenant d'une force légale complète.</p>
            <p><a href="${supabaseUrl}/cev-request/${cevRequest.id}">Voir les détails</a></p>
          `,
        }),
      }).catch((error) => {
        console.error('Erreur envoi email:', error);
      });
    }

    console.log(`Webhook traité avec succès pour ${payload.reference_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook traité avec succès',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur lors du traitement du webhook:', error);
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
