import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  leaseId: string;
  action: 'approved' | 'rejected' | 'request_changes' | 'requested';
  notes?: string;
  isAdminNotification?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { leaseId, action, notes, isAdminNotification }: EmailRequest = await req.json();

    console.log('Processing certification email:', { leaseId, action, isAdminNotification });

    // Récupérer les informations du bail
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties (title, address, city),
        landlord:profiles!leases_landlord_id_fkey (full_name, id),
        tenant:profiles!leases_tenant_id_fkey (full_name, id)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      console.error('Lease error:', leaseError);
      throw new Error('Bail introuvable');
    }

    // Récupérer les emails depuis auth.users
    const { data: { user: landlordUser } } = await supabase.auth.admin.getUserById(
      lease.landlord.id
    );
    const { data: { user: tenantUser } } = await supabase.auth.admin.getUserById(
      lease.tenant.id
    );

    if (!landlordUser?.email || !tenantUser?.email) {
      throw new Error('Emails introuvables');
    }

    // Prepare email data based on action
    let template = '';
    let templateData: any = {};
    let recipients: Array<{ email: string; name: string }> = [];

    if (action === 'approved') {
      template = 'certification-approved';
      templateData = {
        userName: lease.landlord.full_name,
        propertyTitle: lease.property.title,
        monthlyRent: lease.monthly_rent,
      };
      recipients = [
        { email: landlordUser.email, name: lease.landlord.full_name },
        { email: tenantUser.email, name: lease.tenant.full_name },
      ];
    } else if (action === 'rejected' || action === 'request_changes') {
      template = 'certification-rejected';
      templateData = {
        userName: lease.landlord.full_name,
        propertyTitle: lease.property.title,
        reason: notes || 'Non spécifiée',
      };
      recipients = [
        { email: landlordUser.email, name: lease.landlord.full_name },
        { email: tenantUser.email, name: lease.tenant.full_name },
      ];
    } else if (action === 'requested') {
      template = 'certification-requested';
      if (isAdminNotification) {
        // Skip admin notifications for now
        return new Response(
          JSON.stringify({ success: true, message: 'Admin notification skipped' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        templateData = {
          userName: lease.landlord.full_name,
          propertyTitle: lease.property.title,
          isAdmin: false,
        };
        recipients = [
          { email: landlordUser.email, name: lease.landlord.full_name },
          { email: tenantUser.email, name: lease.tenant.full_name },
        ];
      }
    }

    // Send emails using send-email edge function
    const emailPromises = recipients.map(async (recipient) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipient.email,
          subject: template === 'certification-approved'
            ? '✅ Bail certifié par ANSUT'
            : template === 'certification-rejected'
            ? '❌ Modifications requises pour la certification'
            : '📋 Demande de certification soumise',
          template,
          data: templateData,
        },
      });

      if (error) {
        console.error('Error sending email to', recipient.email, error);
        throw error;
      }

      return data;
    });

    await Promise.all(emailPromises);

    console.log('Certification emails sent successfully:', {
      leaseId,
      action,
      recipients: recipients.map(r => r.email),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-certification-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
