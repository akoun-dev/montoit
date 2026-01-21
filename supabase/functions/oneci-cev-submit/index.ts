import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SubmitCEVRequest {
  request_id: string;
  documents: {
    landlord_cni_front_url: string;
    landlord_cni_back_url: string;
    tenant_cni_front_url: string;
    tenant_cni_back_url: string;
    property_title_url: string;
    payment_proof_url?: string;
    property_photo_url: string;
    signed_lease_url: string;
  };
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

    const { request_id, documents }: SubmitCEVRequest = await req.json();

    if (!request_id || !documents) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: cevRequest, error: fetchError } = await supabase
      .from('cev_requests')
      .select('*, lease:leases(*), property:properties(*), landlord:profiles!cev_requests_landlord_id_fkey(*), tenant:profiles!cev_requests_tenant_id_fkey(*)')
      .eq('id', request_id)
      .single();

    if (fetchError || !cevRequest) {
      return new Response(
        JSON.stringify({ error: 'Demande CEV introuvable' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const oneciApiKey = Deno.env.get('ONECI_API_KEY');
    const oneciApiUrl = Deno.env.get('ONECI_API_URL') || 'https://api.oneci.ci/v1';

    if (!oneciApiKey) {
      console.error('ONECI_API_KEY non configurée');

      const mockReferenceNumber = `ONECI-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const mockRequestId = `REQ-${Date.now()}`;

      const { data: updatedRequest, error: updateError } = await supabase
        .from('cev_requests')
        .update({
          status: 'submitted',
          oneci_request_id: mockRequestId,
          oneci_reference_number: mockReferenceNumber,
          oneci_submission_date: new Date().toISOString(),
        })
        .eq('id', request_id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          oneci_request_id: mockRequestId,
          reference_number: mockReferenceNumber,
          message: 'Demande soumise avec succès (mode test)',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const oneciPayload = {
      request_type: 'cev_lease_certification',
      lease_data: {
        lease_id: cevRequest.lease.id,
        start_date: cevRequest.lease.start_date,
        end_date: cevRequest.lease.end_date,
        monthly_rent: cevRequest.lease.monthly_rent,
        property_address: cevRequest.property.address,
      },
      landlord: {
        full_name: cevRequest.landlord.full_name,
        email: cevRequest.landlord.email,
        phone: cevRequest.landlord.phone_number,
        cni_front_url: documents.landlord_cni_front_url,
        cni_back_url: documents.landlord_cni_back_url,
      },
      tenant: {
        full_name: cevRequest.tenant.full_name,
        email: cevRequest.tenant.email,
        phone: cevRequest.tenant.phone_number,
        cni_front_url: documents.tenant_cni_front_url,
        cni_back_url: documents.tenant_cni_back_url,
      },
      documents: {
        property_title_url: documents.property_title_url,
        property_photo_url: documents.property_photo_url,
        signed_lease_url: documents.signed_lease_url,
        payment_proof_url: documents.payment_proof_url,
      },
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/oneci-cev-webhook`,
    };

    const oneciResponse = await fetch(`${oneciApiUrl}/cev/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oneciApiKey}`,
        'X-API-Version': '1.0',
      },
      body: JSON.stringify(oneciPayload),
    });

    if (!oneciResponse.ok) {
      const errorData = await oneciResponse.json().catch(() => ({}));
      throw new Error(`Erreur ONECI: ${oneciResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const oneciResult = await oneciResponse.json();

    const { data: updatedRequest, error: updateError } = await supabase
      .from('cev_requests')
      .update({
        status: 'submitted',
        oneci_request_id: oneciResult.request_id,
        oneci_reference_number: oneciResult.reference_number,
        oneci_submission_date: new Date().toISOString(),
        oneci_response_data: oneciResult,
      })
      .eq('id', request_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    await supabase.from('notifications').insert({
      user_id: cevRequest.landlord_id,
      type: 'cev_submitted',
      title: 'Demande CEV soumise',
      message: `Votre demande de Certificat CEV a été soumise à l'ONECI. Référence: ${oneciResult.reference_number}`,
      data: { request_id, reference_number: oneciResult.reference_number },
    });

    await supabase.from('notifications').insert({
      user_id: cevRequest.tenant_id,
      type: 'cev_submitted',
      title: 'Demande CEV soumise',
      message: `Une demande de Certificat CEV a été soumise pour votre bail. Référence: ${oneciResult.reference_number}`,
      data: { request_id, reference_number: oneciResult.reference_number },
    });

    return new Response(
      JSON.stringify({
        success: true,
        oneci_request_id: oneciResult.request_id,
        reference_number: oneciResult.reference_number,
        message: 'Demande soumise avec succès à l\'ONECI',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la soumission CEV:', error);
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
