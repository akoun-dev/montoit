import { ServiceManager } from '../_shared/serviceManager.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const serviceManager = new ServiceManager();
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get failing services (success rate < 80% in the last hour)
    const failingServices = await serviceManager.getFailingServices(80, '1 hour');

    console.log(`[HealthCheck] Found ${failingServices.length} failing services`);

    if (failingServices.length > 0) {
      // Send email alert to admin
      const emailBody = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .critical { background-color: #fee2e2; }
              .warning { background-color: #fef3c7; }
              .footer { margin-top: 20px; padding: 20px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚠️ Alerte : Services Mon Toit en Échec</h1>
            </div>
            <div class="content">
              <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p>Les services suivants ont un taux de réussite inférieur à 80% au cours de la dernière heure :</p>

              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Provider</th>
                    <th>Taux de Réussite</th>
                    <th>Succès</th>
                    <th>Échecs</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${failingServices.map((service: any) => `
                    <tr class="${service.success_rate < 50 ? 'critical' : 'warning'}">
                      <td><strong>${service.service_name}</strong></td>
                      <td>${service.provider}</td>
                      <td><strong>${service.success_rate.toFixed(2)}%</strong></td>
                      <td>${service.success_count}</td>
                      <td>${service.failure_count}</td>
                      <td>${service.success_rate < 50 ? '🔴 Critique' : '🟡 Dégradé'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <h3 style="margin-top: 30px;">Actions Recommandées :</h3>
              <ul>
                <li>Vérifier la configuration des services dans le dashboard admin</li>
                <li>Vérifier les clés API et les credentials</li>
                <li>Consulter les logs détaillés dans <code>service_usage_logs</code></li>
                <li>Activer les services de fallback si nécessaire</li>
                <li>Contacter le support technique des providers concernés</li>
              </ul>

              <p style="margin-top: 20px;">
                <a href="${Deno.env.get('VITE_SUPABASE_URL')}/admin/service-providers"
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Voir le Dashboard Admin
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Cette alerte a été générée automatiquement par le système de monitoring Mon Toit.</p>
              <p>Pour désactiver ces alertes, contactez l'administrateur système.</p>
            </div>
          </body>
        </html>
      `;

      // Get admin emails from profiles
      const { data: admins, error: adminError } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('user_type', 'admin_ansut');

      if (adminError) {
        console.error('[HealthCheck] Error fetching admin emails:', adminError);
      } else if (admins && admins.length > 0) {
        const adminEmails = admins.map(a => a.email).filter(Boolean);

        for (const email of adminEmails) {
          try {
            await supabaseClient.functions.invoke('send-email', {
              body: {
                to: email,
                subject: '⚠️ Alerte Mon Toit : Services en Échec',
                html: emailBody,
              },
            });
            console.log(`[HealthCheck] Alert email sent to ${email}`);
          } catch (emailError) {
            console.error(`[HealthCheck] Failed to send email to ${email}:`, emailError);
          }
        }
      }
    }

    // Get overall stats for the last hour
    const stats = await serviceManager.getServiceStats(null, '1 hour');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        checked_services: stats?.length || 0,
        failing_services: failingServices.length,
        failing_details: failingServices,
        message: failingServices.length > 0
          ? `⚠️ ${failingServices.length} service(s) en échec - Alertes envoyées`
          : '✅ Tous les services fonctionnent normalement',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[HealthCheck] Error during health check:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
