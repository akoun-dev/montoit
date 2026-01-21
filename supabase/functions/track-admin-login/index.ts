import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginAttemptRequest {
  email: string;
  success: boolean;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, success, userId }: LoginAttemptRequest = await req.json();
    
    // Obtenir IP et User-Agent depuis les headers
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Enregistrer la tentative
    const { error: insertError } = await supabase
      .from('admin_login_attempts')
      .insert({
        user_id: userId || null,
        email,
        success,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error('Error inserting login attempt:', insertError);
      throw insertError;
    }

    console.log(`Login attempt recorded: ${email}, success: ${success}`);

    // Si échec, vérifier s'il faut envoyer une alerte
    if (!success) {
      // Compter les échecs récents (dernières 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: recentFailures, error: countError } = await supabase
        .from('admin_login_attempts')
        .select('id')
        .eq('email', email)
        .eq('success', false)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false });

      if (countError) {
        console.error('Error counting failures:', countError);
      } else if (recentFailures && recentFailures.length >= 3) {
        console.log(`⚠️ Security Alert: ${recentFailures.length} failed attempts for ${email}`);
        
        // Envoyer alerte email via Brevo
        await sendSecurityAlert(email, recentFailures.length, ipAddress);
        
        // Créer notification interne pour les admins
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (adminUsers) {
          for (const admin of adminUsers) {
            await supabase.from('notifications').insert({
              user_id: admin.user_id,
              type: 'security_alert',
              category: 'security',
              title: 'Alerte de Sécurité',
              message: `${recentFailures.length} tentatives de connexion échouées pour ${email}`,
              metadata: { email, attempts: recentFailures.length, ip: ipAddress }
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Login attempt tracked' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in track-admin-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function sendSecurityAlert(email: string, attempts: number, ipAddress: string) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email alert');
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'MonToit Security <no-reply@notifications.ansut.ci>',
        to: ['admin@montoit.ci'], // Email fixe pour les alertes
        subject: `🚨 Alerte Sécurité - Tentatives de connexion échouées`,
        html: `
          <h2>Alerte de Sécurité</h2>
          <p><strong>${attempts} tentatives de connexion échouées</strong> ont été détectées pour le compte :</p>
          <ul>
            <li>Email : <strong>${email}</strong></li>
            <li>Adresse IP : <strong>${ipAddress}</strong></li>
            <li>Période : Dernières 30 minutes</li>
          </ul>
          <p>Cette activité pourrait indiquer une tentative d'accès non autorisée.</p>
          <p style="color: red;"><strong>Action recommandée :</strong> Vérifier les logs d'audit et envisager de bloquer l'adresse IP si nécessaire.</p>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
    } else {
      console.log('Security alert email sent successfully');
    }
  } catch (error) {
    console.error('Error sending security alert:', error);
  }
}

serve(handler);
