import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting reminder check...');

    // Get active reminders that need to be sent
    const { data: reminders, error: remindersError } = await supabase
      .from('user_reminders')
      .select('*, profiles:user_id(full_name, id)')
      .eq('is_active', true)
      .or('last_sent_at.is.null,last_sent_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (remindersError) throw remindersError;

    console.log(`Found ${reminders?.length || 0} reminders to process`);

    const results = [];

    for (const reminder of reminders || []) {
      try {
        let shouldSend = false;
        let notificationMessage = '';

        // Check reminder type
        if (reminder.reminder_type === 'new_match') {
          // Get user preferences
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', reminder.user_id)
            .single();

          if (prefs) {
            // Find new properties matching preferences (created in last 24h)
            const query = supabase
              .from('properties')
              .select('id, title')
              .eq('status', 'disponible')
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            if (prefs.preferred_cities?.length > 0) {
              query.in('city', prefs.preferred_cities);
            }
            if (prefs.min_budget) {
              query.gte('monthly_rent', prefs.min_budget);
            }
            if (prefs.max_budget) {
              query.lte('monthly_rent', prefs.max_budget);
            }

            const { data: newProperties } = await query.limit(5);

            if (newProperties && newProperties.length > 0) {
              shouldSend = true;
              notificationMessage = `${newProperties.length} nouveau${newProperties.length > 1 ? 'x' : ''} bien${newProperties.length > 1 ? 's' : ''} correspond${newProperties.length > 1 ? 'ent' : ''} à vos critères`;
            }
          }
        } else if (reminder.reminder_type === 'application_update') {
          // Check for applications without response for > 7 days
          const { data: applications } = await supabase
            .from('rental_applications')
            .select('id, property_id, status, updated_at')
            .eq('applicant_id', reminder.user_id)
            .eq('status', 'pending')
            .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          if (applications && applications.length > 0) {
            shouldSend = true;
            notificationMessage = `${applications.length} candidature${applications.length > 1 ? 's' : ''} en attente depuis plus de 7 jours`;
          }
        } else if (reminder.reminder_type === 'lease_expiry') {
          // Check for leases expiring in 60 days
          const { data: leases } = await supabase
            .from('leases')
            .select('id, end_date, property_id')
            .eq('tenant_id', reminder.user_id)
            .eq('status', 'active')
            .lte('end_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
            .gte('end_date', new Date().toISOString());

          if (leases && leases.length > 0) {
            shouldSend = true;
            const daysLeft = Math.ceil((new Date(leases[0].end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            notificationMessage = `Votre bail expire dans ${daysLeft} jours`;
          }
        }

        if (shouldSend) {
          // Create notification
          await supabase.from('notifications').insert({
            user_id: reminder.user_id,
            type: reminder.reminder_type,
            title: reminder.title,
            message: notificationMessage || reminder.message,
            link: reminder.link,
            category: 'reminders',
          });

          // Update last_sent_at
          await supabase
            .from('user_reminders')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('id', reminder.id);

          results.push({ reminderId: reminder.id, sent: true, message: notificationMessage });
          console.log(`Reminder sent for user ${reminder.user_id}: ${notificationMessage}`);
        } else {
          results.push({ reminderId: reminder.id, sent: false, reason: 'No trigger condition met' });
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ reminderId: reminder.id, sent: false, error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: reminders?.length || 0,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
