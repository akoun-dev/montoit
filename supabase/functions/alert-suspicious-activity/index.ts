import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuspiciousActivity {
  admin_id: string;
  admin_name: string;
  activity_type: string;
  details: string;
  log_count: number;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { suspicious_activities }: { suspicious_activities: SuspiciousActivity[] } = await req.json();

    console.log('Processing suspicious activities:', suspicious_activities);

    // Récupérer tous les super-admins
    const { data: superAdmins, error: superAdminsError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(email, full_name)
      `)
      .eq('role', 'super_admin');

    if (superAdminsError) {
      throw new Error(`Failed to fetch super admins: ${superAdminsError.message}`);
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log('No super admins found to notify');
      return new Response(
        JSON.stringify({ message: 'No super admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${superAdmins.length} super admins to notify`);

    // Créer des notifications in-app pour chaque super-admin
    const notifications = superAdmins.map((admin: any) => ({
      user_id: admin.user_id,
      type: 'security_alert',
      category: 'security',
      title: '⚠️ Activité suspecte détectée',
      message: `${suspicious_activities.length} activité(s) suspecte(s) détectée(s) dans les logs d'audit`,
      link: '/admin?tab=audit',
      metadata: {
        suspicious_activities,
        detected_at: new Date().toISOString()
      }
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Failed to create notifications:', notifError);
    } else {
      console.log(`Created ${notifications.length} in-app notifications`);
    }

    // Envoyer des emails via la fonction centralisée send-email (Resend)
    const emailPromises = superAdmins.map(async (admin: any) => {
      const profile = admin.profiles;
      if (!profile || !profile.email) {
        console.log(`Skipping email for admin ${admin.user_id} - no email found`);
        return;
      }

      const activityList = suspicious_activities
        .map(activity => `
          <li>
            <strong>${activity.admin_name}</strong>: ${activity.activity_type}<br>
            <em>${activity.details}</em><br>
            ${activity.log_count} action(s) - ${new Date(activity.timestamp).toLocaleString('fr-FR')}
          </li>
        `)
        .join('');

      try {
        // Appeler la fonction send-email centralisée avec le template security-alert
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: profile.email,
            subject: '⚠️ Alerte Sécurité - Activité suspecte détectée',
            template: 'security-alert',
            data: {
              fullName: profile.full_name || 'Admin',
              activityCount: suspicious_activities.length,
              activityList: activityList,
              dashboardUrl: `${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/admin?tab=audit`
            }
          }
        });

        if (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        } else {
          console.log(`Email sent successfully to ${profile.email}`);
        }
      } catch (error) {
        console.error(`Error sending email to ${profile.email}:`, error);
      }
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified_admins: superAdmins.length,
        activities: suspicious_activities.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in alert-suspicious-activity:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
