import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateJobRequest {
  maintenance_request_id: string;
  job_type: string;
  job_description: string;
  urgency_level: 'low' | 'medium' | 'high' | 'emergency';
  preferred_date?: string;
  preferred_time_slot?: string;
  budget_max?: number;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header manquant');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentification invalide');
    }

    const requestData: CreateJobRequest = await req.json();

    const { data: maintenanceRequest, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(
          id,
          title,
          address,
          city,
          latitude,
          longitude,
          owner:profiles!properties_owner_id_fkey(id, full_name, email, phone_number)
        ),
        tenant:profiles!maintenance_requests_tenant_id_fkey(id, full_name, email, phone_number)
      `)
      .eq('id', requestData.maintenance_request_id)
      .single();

    if (fetchError || !maintenanceRequest) {
      throw new Error('Demande de maintenance introuvable');
    }

    const monartisanApiKey = Deno.env.get('MONARTISAN_API_KEY');
    const monartisanPhone = Deno.env.get('MONARTISAN_PHONE') || '0707000722';
    const monartisanApiUrl = Deno.env.get('MONARTISAN_API_URL') || 'https://api.monartisan.ci/v1';

    if (!monartisanApiKey) {
      console.warn('MONARTISAN_API_KEY non configurée - mode test');

      const mockJobReference = `MA-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const mockRequestId = `REQ-${Date.now()}`;

      const { data: jobRequest, error: insertError } = await supabase
        .from('monartisan_job_requests')
        .insert({
          maintenance_request_id: requestData.maintenance_request_id,
          property_id: maintenanceRequest.property.id,
          requester_id: user.id,
          job_type: requestData.job_type,
          job_description: requestData.job_description,
          urgency_level: requestData.urgency_level,
          property_address: maintenanceRequest.property.address,
          property_city: maintenanceRequest.property.city,
          property_coordinates: {
            lat: maintenanceRequest.property.latitude,
            lng: maintenanceRequest.property.longitude,
          },
          preferred_date: requestData.preferred_date,
          preferred_time_slot: requestData.preferred_time_slot,
          budget_max: requestData.budget_max,
          status: 'submitted',
          monartisan_request_id: mockRequestId,
          monartisan_job_reference: mockJobReference,
          submitted_at: new Date().toISOString(),
          artisans_contacted_count: 3,
          api_response: {
            success: true,
            mode: 'test',
            message: 'Demande soumise en mode test',
          },
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Erreur création demande: ${insertError.message}`);
      }

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'maintenance_artisan_requested',
        title: 'Demande envoyée à Mon Artisan',
        message: `Votre demande a été soumise. Référence: ${mockJobReference}`,
        data: { job_request_id: jobRequest.id, reference: mockJobReference },
      });

      if (maintenanceRequest.property.owner.id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: maintenanceRequest.property.owner.id,
          type: 'maintenance_artisan_requested',
          title: 'Artisan demandé pour maintenance',
          message: `Une demande d'artisan a été envoyée via Mon Artisan pour: ${maintenanceRequest.description}`,
          data: { job_request_id: jobRequest.id, reference: mockJobReference },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          job_request: jobRequest,
          reference: mockJobReference,
          message: 'Demande soumise avec succès (mode test)',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const monartisanPayload = {
      phone: monartisanPhone,
      job_type: requestData.job_type,
      description: requestData.job_description,
      urgency: requestData.urgency_level,
      location: {
        address: maintenanceRequest.property.address,
        city: maintenanceRequest.property.city,
        coordinates: {
          latitude: maintenanceRequest.property.latitude,
          longitude: maintenanceRequest.property.longitude,
        },
      },
      client: {
        name: maintenanceRequest.tenant?.full_name || maintenanceRequest.property.owner.full_name,
        email: maintenanceRequest.tenant?.email || maintenanceRequest.property.owner.email,
        phone: maintenanceRequest.tenant?.phone_number || maintenanceRequest.property.owner.phone_number,
      },
      preferences: {
        preferred_date: requestData.preferred_date,
        time_slot: requestData.preferred_time_slot,
        max_budget: requestData.budget_max,
      },
    };

    const monartisanResponse = await fetch(`${monartisanApiUrl}/jobs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${monartisanApiKey}`,
        'X-Client-ID': monartisanPhone,
      },
      body: JSON.stringify(monartisanPayload),
    });

    if (!monartisanResponse.ok) {
      const errorData = await monartisanResponse.json().catch(() => ({}));
      throw new Error(`Erreur Mon Artisan: ${monartisanResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const monartisanResult = await monartisanResponse.json();

    const { data: jobRequest, error: insertError } = await supabase
      .from('monartisan_job_requests')
      .insert({
        maintenance_request_id: requestData.maintenance_request_id,
        property_id: maintenanceRequest.property.id,
        requester_id: user.id,
        job_type: requestData.job_type,
        job_description: requestData.job_description,
        urgency_level: requestData.urgency_level,
        property_address: maintenanceRequest.property.address,
        property_city: maintenanceRequest.property.city,
        property_coordinates: {
          lat: maintenanceRequest.property.latitude,
          lng: maintenanceRequest.property.longitude,
        },
        preferred_date: requestData.preferred_date,
        preferred_time_slot: requestData.preferred_time_slot,
        budget_max: requestData.budget_max,
        status: 'submitted',
        monartisan_request_id: monartisanResult.request_id,
        monartisan_job_reference: monartisanResult.job_reference,
        submitted_at: new Date().toISOString(),
        artisans_contacted_count: monartisanResult.artisans_notified || 0,
        api_response: monartisanResult,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur création demande: ${insertError.message}`);
    }

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'maintenance_artisan_requested',
      title: 'Demande envoyée à Mon Artisan',
      message: `Votre demande a été soumise. ${monartisanResult.artisans_notified || 0} artisans notifiés. Référence: ${monartisanResult.job_reference}`,
      data: { job_request_id: jobRequest.id, reference: monartisanResult.job_reference },
    });

    return new Response(
      JSON.stringify({
        success: true,
        job_request: jobRequest,
        reference: monartisanResult.job_reference,
        artisans_notified: monartisanResult.artisans_notified,
        message: 'Demande soumise avec succès à Mon Artisan',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la création de la demande Mon Artisan:', error);
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
