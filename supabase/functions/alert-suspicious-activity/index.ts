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
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')!;
    
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

    // Envoyer des emails via Brevo
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

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
            ul { padding-left: 20px; }
            li { margin-bottom: 15px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .cta { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Alerte Sécurité</h1>
            </div>
            <div class="content">
              <p>Bonjour ${profile.full_name || 'Admin'},</p>
              
              <div class="alert">
                <strong>Activités suspectes détectées</strong><br>
                Notre système a détecté ${suspicious_activities.length} activité(s) suspecte(s) dans les logs d'audit.
              </div>

              <h3>Détails des activités :</h3>
              <ul>
                ${activityList}
              </ul>

              <p>
                <strong>Action recommandée :</strong> Veuillez vérifier ces activités dans le tableau de bord d'administration
                et prendre les mesures appropriées si nécessaire.
              </p>

              <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/admin?tab=audit" class="cta">
                Consulter les logs d'audit
              </a>

              <div class="footer">
                <p>Cet email a été généré automatiquement par le système de surveillance Mon Toit.</p>
                <p>Date de détection : ${new Date().toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoApiKey
          },
          body: JSON.stringify({
            sender: { name: 'Mon Toit Security', email: 'security@montoit.ci' },
            to: [{ email: profile.email, name: profile.full_name }],
            subject: '⚠️ Alerte Sécurité - Activité suspecte détectée',
            htmlContent: emailHtml
          })
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email to ${profile.email}:`, errorText);
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
