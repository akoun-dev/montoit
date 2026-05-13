/**
 * Edge Function: Send Visit Reminders
 *
 * Automatically sends reminders for upcoming visits.
 * This function is designed to be called by a cron job or scheduled task.
 *
 * Reminder schedule:
 * - 24 hours before visit (1 day before)
 * - 2 hours before visit
 *
 * Usage:
 * POST /functions/v1/send-visit-reminders
 * Body: { hoursBefore: 24 } or { hoursBefore: 2 }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  hoursBefore?: number;
  dryRun?: boolean;
}

// Calculate reminder time range
function getReminderTimeRange(hoursBefore: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getTime() + (hoursBefore - 1) * 60 * 60 * 1000);
  const end = new Date(now.getTime() + (hoursBefore + 1) * 60 * 60 * 1000);
  return { start, end };
}

// Check if reminder should be sent based on last_reminder_at
function shouldSendReminder(
  lastReminderAt: string | null,
  hoursBefore: number,
  visitDate: string
): boolean {
  if (!lastReminderAt) return true;

  const lastReminder = new Date(lastReminderAt);
  const hoursSinceLastReminder = (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60);

  // Don't send reminder if we sent one in the last 12 hours
  if (hoursSinceLastReminder < 12) return false;

  // Don't send reminder if visit is too close (within 2 hours)
  const visitDateTime = new Date(visitDate);
  const hoursUntilVisit = (visitDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilVisit < 2) return false;

  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { hoursBefore = 24, dryRun = false } = await req.json() as ReminderRequest;

    console.log(`[send-visit-reminders] Processing reminders ${hoursBefore}h before visit (dryRun: ${dryRun})`);

    // Calculate time range for visits
    const { start, end } = getReminderTimeRange(hoursBefore);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    console.log(`[send-visit-reminders] Time range: ${startStr} to ${endStr}`);

    // Fetch upcoming confirmed visits that need reminders
    const { data: visits, error: visitsError } = await supabaseClient
      .from('visit_requests')
      .select(`
        id,
        property_id,
        tenant_id,
        owner_id,
        visit_date,
        visit_time,
        visit_type,
        status,
        reminder_sent,
        last_reminder_at,
        properties (
          title,
          city,
          address
        )
      `)
      .eq('status', 'confirmed')
      .gte('visit_date', startStr)
      .lte('visit_date', endStr)
      .order('visit_date', { ascending: true });

    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
      throw visitsError;
    }

    console.log(`[send-visit-reminders] Found ${visits?.length || 0} visits in time range`);

    const results = {
      processed: 0,
      remindersSent: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        visitId: string;
        propertyTitle: string;
        action: string;
        reason?: string;
      }>
    };

    for (const visit of (visits || [])) {
      results.processed++;

      const visitWithDetails = visit as any;
      const visitDateTime = new Date(visitWithDetails.visit_date);

      // Check if reminder should be sent
      if (!shouldSendReminder(visitWithDetails.last_reminder_at, hoursBefore, visitWithDetails.visit_date)) {
        results.skipped++;
        results.details.push({
          visitId: visitWithDetails.id,
          propertyTitle: visitWithDetails.properties?.title || 'N/A',
          action: 'skipped',
          reason: 'Reminder already sent recently'
        });
        continue;
      }

      // Fetch tenant and owner profiles
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', [visitWithDetails.tenant_id, visitWithDetails.owner_id]);

      const tenant = profiles?.find((p: Record<string, unknown>) => p.user_id === visitWithDetails.tenant_id);

      if (!tenant) {
        console.error(`[send-visit-reminders] Tenant not found for visit ${visitWithDetails.id}`);
        results.errors++;
        continue;
      }

      if (!dryRun) {
        // Send reminder notification to tenant
        try {
          await supabaseClient.functions.invoke('send-lease-notifications', {
            body: {
              visitId: visitWithDetails.id,
              type: 'visit_reminder',
              recipientId: visitWithDetails.tenant_id,
              visitDate: visitDateTime.toLocaleDateString('fr-FR'),
              visitTime: visitWithDetails.visit_time,
              propertyTitle: visitWithDetails.properties?.title,
              propertyAddress: visitWithDetails.properties?.address
            }
          });

          // Update reminder_sent flag
          await supabaseClient
            .from('visit_requests')
            .update({
              reminder_sent: true,
              last_reminder_at: new Date().toISOString()
            })
            .eq('id', visitWithDetails.id);

          results.remindersSent++;
          results.details.push({
            visitId: visitWithDetails.id,
            propertyTitle: visitWithDetails.properties?.title || 'N/A',
            action: 'sent'
          });

          console.log(`[send-visit-reminders] Reminder sent for visit ${visitWithDetails.id}`);

          // Also send reminder to owner if visit is within 24 hours
          if (hoursBefore <= 24) {
            try {
              await supabaseClient.functions.invoke('send-lease-notifications', {
                body: {
                  visitId: visitWithDetails.id,
                  type: 'visit_reminder',
                  recipientId: visitWithDetails.owner_id,
                  visitDate: visitDateTime.toLocaleDateString('fr-FR'),
                  visitTime: visitWithDetails.visit_time,
                  propertyTitle: visitWithDetails.properties?.title,
                  propertyAddress: visitWithDetails.properties?.address
                }
              });
            } catch (ownerError) {
              console.error(`[send-visit-reminders] Failed to send reminder to owner:`, ownerError);
            }
          }

        } catch (error) {
          console.error(`[send-visit-reminders] Failed to send reminder for visit ${visitWithDetails.id}:`, error);
          results.errors++;
          results.details.push({
            visitId: visitWithDetails.id,
            propertyTitle: visitWithDetails.properties?.title || 'N/A',
            action: 'error',
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        // Dry run - just log what would be sent
        results.remindersSent++;
        results.details.push({
          visitId: visitWithDetails.id,
          propertyTitle: visitWithDetails.properties?.title || 'N/A',
          action: 'would_send',
          reason: 'Dry run'
        });
        console.log(`[send-visit-reminders] [DRY RUN] Would send reminder for visit ${visitWithDetails.id}`);
      }
    }

    console.log(`[send-visit-reminders] Summary:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        hoursBefore,
        dryRun,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: Record<string, unknown>) {
    console.error('[send-visit-reminders] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
