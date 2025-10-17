import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🕐 Starting overdue applications processing...');

    // 1. Marquer les candidatures en retard
    const { error: markError } = await supabase.rpc('mark_overdue_applications');
    
    if (markError) {
      console.error('Error marking overdue applications:', markError);
      throw markError;
    }

    // Compter les nouveaux retards
    const { count: newOverdueCount } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('is_overdue', true);

    console.log(`✅ Marked ${newOverdueCount} overdue applications`);

    // 2. Appliquer les actions automatiques si configurées
    const { error: autoError } = await supabase.rpc('auto_process_overdue_applications');
    
    if (autoError) {
      console.error('Error auto-processing applications:', autoError);
      throw autoError;
    }

    // Vérifier combien ont été auto-traités
    const { count: autoProcessedCount } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('auto_processed', true)
      .gte('updated_at', new Date(Date.now() - 3600000).toISOString()); // Dernière heure

    console.log(`✅ Auto-processed ${autoProcessedCount || 0} applications`);

    // 3. Envoyer des notifications aux demandeurs pour les dossiers auto-traités
    if (autoProcessedCount && autoProcessedCount > 0) {
      const { data: autoProcessedApps } = await supabase
        .from('rental_applications')
        .select(`
          id,
          applicant_id,
          auto_action_type,
          properties (
            title,
            owner_id
          )
        `)
        .eq('auto_processed', true)
        .gte('updated_at', new Date(Date.now() - 3600000).toISOString());

      // Créer notifications pour les demandeurs
      if (autoProcessedApps && autoProcessedApps.length > 0) {
        const notifications = autoProcessedApps.map(app => ({
          user_id: app.applicant_id,
          type: app.auto_action_type === 'approved' ? 'application_approved' : 'application_rejected',
          category: 'application',
          title: app.auto_action_type === 'approved' 
            ? '✅ Candidature approuvée automatiquement'
            : '❌ Candidature rejetée automatiquement',
          message: app.auto_action_type === 'approved'
            ? `Votre candidature pour "${app.properties?.title}" a été approuvée après le délai de traitement.`
            : `Votre candidature pour "${app.properties?.title}" n'a pas été retenue dans le délai imparti.`,
          link: '/applications',
          metadata: {
            application_id: app.id,
            auto_processed: true,
            action_type: app.auto_action_type
          }
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`📧 Sent ${notifications.length} notifications to applicants`);
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      overdue_marked: newOverdueCount || 0,
      auto_processed: autoProcessedCount || 0,
      notifications_sent: autoProcessedCount || 0
    };

    console.log('✅ Processing completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in process-overdue-applications:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
