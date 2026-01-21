import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  leaseId: string;
  type: string;
  recipientId?: string;
  daysRemaining?: number;
  signerName?: string;
}

interface LeaseDetails {
  id: string;
  contract_number: string;
  owner_id: string;
  tenant_id: string;
  property_id: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface PropertyDetails {
  title: string;
  city: string;
}

interface ProfileDetails {
  full_name: string;
  email: string;
}

const notificationConfig: Record<string, {
  title: (data: any) => string;
  message: (data: any) => string;
  actionUrl: (leaseId: string) => string;
  emailTemplate: string;
  emailSubject: (data: any) => string;
}> = {
  'lease_created': {
    title: () => '📋 Nouveau contrat de bail',
    message: (data) => `Un contrat de bail a été créé pour la propriété "${data.propertyTitle}". Veuillez le consulter et le signer.`,
    actionUrl: (leaseId) => `/signer-bail/${leaseId}`,
    emailTemplate: 'lease-created',
    emailSubject: () => '📋 Nouveau contrat de bail à signer - Mon Toit'
  },
  'lease_pending_signature': {
    title: () => '✍️ Signature en attente',
    message: (data) => `Votre signature est attendue pour le contrat ${data.contractNumber}`,
    actionUrl: (leaseId) => `/signer-bail/${leaseId}`,
    emailTemplate: 'lease-signature-required',
    emailSubject: (data) => `✍️ Votre signature est requise - Contrat ${data.contractNumber}`
  },
  'lease_signed_owner': {
    title: () => '✅ Le propriétaire a signé',
    message: (data) => `${data.signerName || 'Le propriétaire'} a signé le contrat ${data.contractNumber}. C'est maintenant à vous de signer.`,
    actionUrl: (leaseId) => `/signer-bail/${leaseId}`,
    emailTemplate: 'lease-signed-by-party',
    emailSubject: () => '✅ Le propriétaire a signé votre contrat - Mon Toit'
  },
  'lease_signed_tenant': {
    title: () => '✅ Le locataire a signé',
    message: (data) => `${data.signerName || 'Le locataire'} a signé le contrat ${data.contractNumber}.`,
    actionUrl: (leaseId) => `/contrat/${leaseId}`,
    emailTemplate: 'lease-signed-by-party',
    emailSubject: () => '✅ Le locataire a signé le contrat - Mon Toit'
  },
  'lease_active': {
    title: () => '🎉 Bail activé',
    message: (data) => `Le contrat ${data.contractNumber} est maintenant actif. Les deux parties ont signé.`,
    actionUrl: (leaseId) => `/contrat/${leaseId}`,
    emailTemplate: 'lease-activated',
    emailSubject: (data) => `🎉 Bail activé - ${data.propertyTitle}`
  },
  'lease_expiring_soon': {
    title: (data) => `⚠️ Bail expire dans ${data.daysRemaining} jour(s)`,
    message: (data) => `Le contrat ${data.contractNumber} pour "${data.propertyTitle}" expire le ${data.endDate}. Pensez à le renouveler.`,
    actionUrl: (leaseId) => `/contrat/${leaseId}`,
    emailTemplate: 'lease-expiring-soon',
    emailSubject: (data) => `⚠️ Votre bail expire dans ${data.daysRemaining} jour(s) - Mon Toit`
  },
  'lease_expired': {
    title: () => '⏰ Bail expiré',
    message: (data) => `Le contrat ${data.contractNumber} pour "${data.propertyTitle}" a expiré.`,
    actionUrl: (leaseId) => `/contrat/${leaseId}`,
    emailTemplate: 'lease-expired',
    emailSubject: () => '⏰ Votre bail a expiré - Mon Toit'
  },
  'lease_terminated': {
    title: () => '🚫 Bail résilié',
    message: (data) => `Le contrat ${data.contractNumber} pour "${data.propertyTitle}" a été résilié.`,
    actionUrl: (leaseId) => `/contrat/${leaseId}`,
    emailTemplate: 'lease-terminated',
    emailSubject: () => '🚫 Résiliation de bail - Mon Toit'
  },
  'lease_signature_reminder': {
    title: () => '🔔 Rappel de signature',
    message: (data) => `Rappel : Le contrat ${data.contractNumber} attend votre signature.`,
    actionUrl: (leaseId) => `/signer-bail/${leaseId}`,
    emailTemplate: 'lease-signature-required',
    emailSubject: (data) => `🔔 Rappel : Signez votre contrat ${data.contractNumber}`
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { leaseId, type, recipientId, daysRemaining, signerName } = await req.json() as NotificationRequest;

    console.log(`[send-lease-notifications] Processing ${type} for lease ${leaseId}`);

    if (!leaseId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing leaseId or type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = notificationConfig[type];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown notification type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lease details
    const { data: lease, error: leaseError } = await supabaseClient
      .from('lease_contracts')
      .select('id, contract_number, owner_id, tenant_id, property_id, monthly_rent, start_date, end_date, status')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      console.error('Error fetching lease:', leaseError);
      return new Response(
        JSON.stringify({ error: 'Lease not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch property details
    const { data: property } = await supabaseClient
      .from('properties')
      .select('title, city')
      .eq('id', lease.property_id)
      .single();

    // Determine recipients based on notification type
    let recipientIds: string[] = [];
    
    if (recipientId) {
      recipientIds = [recipientId];
    } else {
      switch (type) {
        case 'lease_created':
        case 'lease_pending_signature':
        case 'lease_signed_owner':
        case 'lease_signature_reminder':
          recipientIds = [lease.tenant_id];
          break;
        case 'lease_signed_tenant':
          recipientIds = [lease.owner_id];
          break;
        case 'lease_active':
        case 'lease_expiring_soon':
        case 'lease_expired':
        case 'lease_terminated':
          recipientIds = [lease.owner_id, lease.tenant_id];
          break;
      }
    }

    // Fetch recipient profiles
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', recipientIds);

    const notificationData = {
      contractNumber: lease.contract_number,
      propertyTitle: property?.title || 'Propriété',
      propertyCity: property?.city || '',
      monthlyRent: lease.monthly_rent,
      startDate: new Date(lease.start_date).toLocaleDateString('fr-FR'),
      endDate: new Date(lease.end_date).toLocaleDateString('fr-FR'),
      daysRemaining,
      signerName
    };

    // Create in-app notifications and send emails
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      type: type,
      title: config.title(notificationData),
      message: config.message(notificationData),
      action_url: config.actionUrl(leaseId),
      metadata: { leaseId, type }
    }));

    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating notifications:', insertError);
    }

    // Send emails to each recipient
    for (const userId of recipientIds) {
      const profile = profiles?.find(p => p.user_id === userId);
      if (profile?.email) {
        try {
          await supabaseClient.functions.invoke('send-email', {
            body: {
              to: profile.email,
              template: config.emailTemplate,
              data: {
                name: profile.full_name || 'Utilisateur',
                email: profile.email,
                ...notificationData,
                signLeaseUrl: `${Deno.env.get('SITE_URL') || 'https://montoit.ansut.ci'}${config.actionUrl(leaseId)}`,
                leaseUrl: `${Deno.env.get('SITE_URL') || 'https://montoit.ansut.ci'}/contrat/${leaseId}`
              }
            }
          });
          console.log(`[send-lease-notifications] Email sent to ${profile.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        }
      }
    }

    console.log(`[send-lease-notifications] Successfully processed ${type} notification`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: recipientIds.length,
        type 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-lease-notifications] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
