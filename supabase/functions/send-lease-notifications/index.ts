import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  leaseId?: string;
  visitId?: string;
  type: string;
  recipientId?: string;
  daysRemaining?: number;
  signerName?: string;
  visitDate?: string;
  visitTime?: string;
  propertyTitle?: string;
  propertyAddress?: string;
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
  title: (data: Record<string, unknown>) => string;
  message: (data: Record<string, unknown>) => string;
  actionUrl: (leaseId: string) => string;
  emailTemplate: string;
  emailSubject: (data: Record<string, unknown>) => string;
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
  },
  // Visit notifications
  'visit_scheduled': {
    title: () => '📅 Visite planifiée',
    message: (data) => `Votre visite pour "${data.propertyTitle}" est confirmée pour le ${data.visitDate} à ${data.visitTime}.`,
    actionUrl: (visitId) => `/locataire/mes-visites`,
    emailTemplate: 'visit-scheduled',
    emailSubject: (data) => `📅 Visite planifiée - ${data.propertyTitle}`
  },
  'visit_reminder': {
    title: (data) => `🔔 Rappel : Visite demain à ${data.visitTime}`,
    message: (data) => `N'oubliez pas votre visite demain à ${data.visitTime} pour "${data.propertyTitle}".`,
    actionUrl: (visitId) => `/locataire/mes-visites`,
    emailTemplate: 'visit-reminder',
    emailSubject: (data) => `🔔 Rappel : Visite prévue demain - ${data.propertyTitle}`
  },
  'visit_cancelled': {
    title: () => '❌ Visite annulée',
    message: (data) => `La visite pour "${data.propertyTitle}" a été annulée.`,
    actionUrl: (visitId) => `/locataire/mes-visites`,
    emailTemplate: 'visit-cancelled',
    emailSubject: (data) => `❌ Visite annulée - ${data.propertyTitle}`
  },
  'visit_completed': {
    title: () => '✅ Visite terminée',
    message: (data) => `Votre visite pour "${data.propertyTitle}" est terminée. Merci de votre intérêt !`,
    actionUrl: (visitId) => `/locataire/mes-candidatures`,
    emailTemplate: 'visit-completed',
    emailSubject: (data) => `✅ Visite terminée - ${data.propertyTitle}`
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

    const { leaseId, visitId, type, recipientId, daysRemaining, signerName, visitDate, visitTime, propertyTitle, propertyAddress } = await req.json() as NotificationRequest;

    // Check if this is a visit notification
    const isVisitNotification = type.startsWith('visit_');
    const entityId = isVisitNotification ? visitId : leaseId;

    console.log(`[send-lease-notifications] Processing ${type} for ${isVisitNotification ? 'visit' : 'lease'} ${entityId}`);

    if (!entityId || !type) {
      return new Response(
        JSON.stringify({ error: `Missing ${isVisitNotification ? 'visitId' : 'leaseId'} or type` }),
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
    let notificationData: Record<string, unknown> = {};
    let profiles: Record<string, unknown> = null;

    if (isVisitNotification) {
      // Handle visit notifications
      if (!visitId) {
        return new Response(
          JSON.stringify({ error: 'Missing visitId for visit notification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch visit details
      const { data: visit, error: visitError } = await supabaseClient
        .from('visit_requests')
        .select('id, tenant_id, owner_id, property_id, visit_date, visit_time, visit_type')
        .eq('id', visitId)
        .single();

      if (visitError || !visit) {
        console.error('Error fetching visit:', visitError);
        return new Response(
          JSON.stringify({ error: 'Visit not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch property details if not provided
      let visitProperty = property;
      if (!visitProperty) {
        const { data: propData } = await supabaseClient
          .from('properties')
          .select('title, city, address')
          .eq('id', visit.property_id)
          .single();
        visitProperty = propData;
      }

      // Determine recipients
      if (recipientId) {
        recipientIds = [recipientId];
      } else {
        switch (type) {
          case 'visit_scheduled':
          case 'visit_reminder':
          case 'visit_cancelled':
          case 'visit_completed':
            recipientIds = [visit.tenant_id];
            // Also notify owner for cancellations and completions
            if (type === 'visit_cancelled' || type === 'visit_completed') {
              recipientIds = [visit.tenant_id, visit.owner_id];
            }
            break;
        }
      }

      // Fetch recipient profiles
      const profilesResult = await supabaseClient
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', recipientIds);
      profiles = profilesResult.data;

      // Format visit date/time
      const formattedDate = visitDate || new Date(visit.visit_date).toLocaleDateString('fr-FR');
      const formattedTime = visitTime || visit.visit_time;

      notificationData = {
        propertyTitle: propertyTitle || visitProperty?.title || 'Propriété',
        propertyAddress: propertyAddress || visitProperty?.address || visitProperty?.city || '',
        visitDate: formattedDate,
        visitTime: formattedTime,
        visitType: visit.visit_type,
      };
    } else {
      // Handle lease notifications
      if (!leaseId) {
        return new Response(
          JSON.stringify({ error: 'Missing leaseId for lease notification' }),
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
      const { data: leaseProperty } = await supabaseClient
        .from('properties')
        .select('title, city')
        .eq('id', lease.property_id)
        .single();

      // Determine recipients
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
      const profilesResult = await supabaseClient
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', recipientIds);
      profiles = profilesResult.data;

      notificationData = {
        contractNumber: lease.contract_number,
        propertyTitle: leaseProperty?.title || 'Propriété',
        propertyCity: leaseProperty?.city || '',
        monthlyRent: lease.monthly_rent,
        startDate: new Date(lease.start_date).toLocaleDateString('fr-FR'),
        endDate: new Date(lease.end_date).toLocaleDateString('fr-FR'),
        daysRemaining,
        signerName
      };
    }

    // Create in-app notifications and send emails
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      type: type,
      title: config.title(notificationData),
      message: config.message(notificationData),
      action_url: config.actionUrl(entityId || ''),
      metadata: isVisitNotification ? { visitId, type } : { leaseId, type }
    }));

    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating notifications:', insertError);
    }

    // Build base URL
    const siteUrl = Deno.env.get('SITE_URL') || 'https://montoit.ansut.ci';

    // Send emails to each recipient
    for (const userId of recipientIds) {
      const profile = profiles?.find((p: Record<string, unknown>) => p.user_id === userId);
      if (profile?.email) {
        try {
          const emailData: Record<string, unknown> = {
            to: profile.email,
            template: config.emailTemplate,
            data: {
              name: profile.full_name || 'Utilisateur',
              email: profile.email,
              ...notificationData,
              actionUrl: `${siteUrl}${config.actionUrl(entityId || '')}`
            }
          };

          // Add lease-specific URLs if this is a lease notification
          if (!isVisitNotification && leaseId) {
            emailData.data.signLeaseUrl = `${siteUrl}/signer-bail/${leaseId}`;
            emailData.data.leaseUrl = `${siteUrl}/contrat/${leaseId}`;
          }

          // Add visit-specific URLs if this is a visit notification
          if (isVisitNotification && visitId) {
            emailData.data.visitUrl = `${siteUrl}/locataire/mes-visites`;
          }

          await supabaseClient.functions.invoke('send-email', {
            body: emailData
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

  } catch (error: Record<string, unknown>) {
    console.error('[send-lease-notifications] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
