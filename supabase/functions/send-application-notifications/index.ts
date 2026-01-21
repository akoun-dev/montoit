import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  applicationId: string;
  type: string;
  recipientId?: string;
  reason?: string;
  visitDate?: string;
  documents?: string[];
}

interface ApplicationDetails {
  id: string;
  applicant_id: string;
  property_id: string;
  status: string;
  application_score: number | null;
  cover_letter: string | null;
  created_at: string;
}

interface PropertyDetails {
  id: string;
  title: string;
  city: string;
  owner_id: string;
  monthly_rent: number;
}

interface ProfileDetails {
  user_id: string;
  full_name: string;
  email: string;
}

// Configuration des types de notifications
const notificationConfig: Record<string, {
  title: (data: any) => string;
  message: (data: any) => string;
  actionUrl: (applicationId: string, propertyId?: string) => string;
  emailTemplate: string;
  emailSubject: (data: any) => string;
  getRecipients: (application: ApplicationDetails, property: PropertyDetails, recipientId?: string) => string[];
}> = {
  'application_received': {
    title: () => '📩 Nouvelle candidature reçue',
    message: (data) => `${data.applicantName} a postulé pour "${data.propertyTitle}" avec un score de ${data.score}/100`,
    actionUrl: (_appId, _propId) => '/dashboard/candidatures',
    emailTemplate: 'application-received',
    emailSubject: (data) => `📩 Nouvelle candidature - ${data.propertyTitle}`,
    getRecipients: (_app, property) => [property.owner_id]
  },
  'application_viewed': {
    title: () => '👁️ Candidature consultée',
    message: (data) => `Le propriétaire a consulté votre candidature pour "${data.propertyTitle}"`,
    actionUrl: () => '/mes-candidatures',
    emailTemplate: 'application-viewed',
    emailSubject: (data) => `👁️ Votre candidature a été vue - ${data.propertyTitle}`,
    getRecipients: (app) => [app.applicant_id]
  },
  'application_accepted': {
    title: () => '🎉 Candidature acceptée !',
    message: (data) => `Félicitations ! Votre candidature pour "${data.propertyTitle}" a été acceptée.`,
    actionUrl: (appId) => `/locataire/candidature/${appId}`,
    emailTemplate: 'application-accepted',
    emailSubject: (data) => `🎉 Candidature acceptée - ${data.propertyTitle}`,
    getRecipients: (app) => [app.applicant_id]
  },
  'application_rejected': {
    title: () => '❌ Candidature refusée',
    message: (data) => `Votre candidature pour "${data.propertyTitle}" n'a malheureusement pas été retenue.${data.reason ? ` Raison: ${data.reason}` : ''}`,
    actionUrl: () => '/recherche',
    emailTemplate: 'application-rejected',
    emailSubject: (data) => `Candidature non retenue - ${data.propertyTitle}`,
    getRecipients: (app) => [app.applicant_id]
  },
  'visit_scheduled': {
    title: () => '📅 Visite planifiée',
    message: (data) => `Une visite est planifiée le ${data.visitDate} pour "${data.propertyTitle}"`,
    actionUrl: () => '/mes-visites',
    emailTemplate: 'visit-scheduled-for-application',
    emailSubject: (data) => `📅 Visite planifiée - ${data.propertyTitle}`,
    getRecipients: (app) => [app.applicant_id]
  },
  'documents_requested': {
    title: () => '📋 Documents supplémentaires requis',
    message: (data) => `Des documents supplémentaires sont demandés pour votre candidature: ${data.documents?.join(', ') || 'documents'}`,
    actionUrl: (appId) => `/locataire/candidature/${appId}`,
    emailTemplate: 'documents-requested',
    emailSubject: (data) => `📋 Documents requis - ${data.propertyTitle}`,
    getRecipients: (app) => [app.applicant_id]
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

    const { applicationId, type, recipientId, reason, visitDate, documents } = await req.json() as NotificationRequest;

    console.log(`[send-application-notifications] Processing ${type} for application ${applicationId}`);

    if (!applicationId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing applicationId or type' }),
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

    // Fetch application details
    const { data: application, error: appError } = await supabaseClient
      .from('rental_applications')
      .select('id, applicant_id, property_id, status, application_score, cover_letter, created_at')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Error fetching application:', appError);
      return new Response(
        JSON.stringify({ error: 'Application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch property details
    const { data: property, error: propError } = await supabaseClient
      .from('properties')
      .select('id, title, city, owner_id, monthly_rent')
      .eq('id', application.property_id)
      .single();

    if (propError || !property) {
      console.error('Error fetching property:', propError);
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch applicant profile
    const { data: applicantProfile } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('user_id', application.applicant_id)
      .single();

    // Determine recipients
    const recipientIds = recipientId 
      ? [recipientId] 
      : config.getRecipients(application as ApplicationDetails, property as PropertyDetails);

    // Fetch recipient profiles
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', recipientIds);

    const notificationData = {
      applicationId,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCity: property.city,
      monthlyRent: property.monthly_rent,
      applicantName: applicantProfile?.full_name || 'Candidat',
      applicantEmail: applicantProfile?.email || '',
      score: application.application_score || 0,
      reason,
      visitDate,
      documents
    };

    // Create in-app notifications
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      type: type,
      title: config.title(notificationData),
      message: config.message(notificationData),
      action_url: config.actionUrl(applicationId, property.id),
      metadata: { applicationId, propertyId: property.id, type }
    }));

    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating notifications:', insertError);
    } else {
      console.log(`[send-application-notifications] Created ${notifications.length} in-app notification(s)`);
    }

    // Send emails to each recipient
    let emailsSent = 0;
    for (const userId of recipientIds) {
      const profile = profiles?.find(p => p.user_id === userId);
      if (profile?.email) {
        try {
          const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
            body: {
              to: profile.email,
              template: config.emailTemplate,
              data: {
                name: profile.full_name || 'Utilisateur',
                email: profile.email,
                ...notificationData,
                applicationUrl: `${Deno.env.get('SITE_URL') || 'https://montoit.ansut.ci'}${config.actionUrl(applicationId, property.id)}`,
                searchUrl: `${Deno.env.get('SITE_URL') || 'https://montoit.ansut.ci'}/recherche`
              }
            }
          });

          if (emailError) {
            console.error(`Failed to send email to ${profile.email}:`, emailError);
          } else {
            emailsSent++;
            console.log(`[send-application-notifications] Email sent to ${profile.email}`);
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        }
      }
    }

    console.log(`[send-application-notifications] Successfully processed ${type} notification`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: recipientIds.length,
        emailsSent,
        type 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-application-notifications] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
