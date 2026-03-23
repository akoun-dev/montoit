// Edge Function: send-signature-reminders
// Description: Automatically sends reminders for pending lease contract signatures
// This function is designed to be called by a cron job or scheduled task.
//
// Reminder schedule:
// - First reminder: 3 days after contract enters pending_signature status
// - Second reminder: 7 days after contract enters pending_signature status
// - Final reminder: 14 days after contract enters pending_signature status
//
// Usage:
//   curl -X POST https://xxx.supabase.co/functions/v1/send-signature-reminders \
//     -H "Authorization: Bearer <service_role_key>"
//
// Dry run mode (for testing):
//   curl -X POST https://xxx.supabase.co/functions/v1/send-signature-reminders \
//     -H "Authorization: Bearer <service_role_key>" \
//     -d '{"dryRun": true}'

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ReminderSchedule {
  days: number;
  label: string;
}

const REMINDER_SCHEDULES: ReminderSchedule[] = [
  { days: 3, label: 'premier' },
  { days: 7, label: 'deuxième' },
  { days: 14, label: 'dernier' },
];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingContract {
  id: string;
  contract_number: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  status: string;
  updated_at: string;
  created_at: string;
  owner_signed_at: string | null;
  tenant_signed_at: string | null;
  last_signature_reminder: string | null;
  signature_reminder_count: number | null;
  properties: {
    title: string;
  } | null;
}

interface ReminderTarget {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  role: 'owner' | 'tenant';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body for dry run mode
    let dryRun = false;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      dryRun = body.dryRun === true;
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(
      `[${dryRun ? 'DRY RUN' : 'LIVE'}] Starting signature reminders process at ${new Date().toISOString()}`
    );

    // Fetch contracts in pending_signature status
    const { data: pendingContracts, error: contractsError } = await supabase
      .from('lease_contracts')
      .select(
        `
        id,
        contract_number,
        property_id,
        owner_id,
        tenant_id,
        status,
        updated_at,
        created_at,
        owner_signed_at,
        tenant_signed_at,
        last_signature_reminder,
        signature_reminder_count,
        properties (
          title
        )
        `
      )
      .eq('status', 'pending_signature')
      .is('archived_at', null); // Exclude archived contracts

    if (contractsError) {
      console.error('Error fetching pending contracts:', contractsError);
      throw new Error(`Failed to fetch pending contracts: ${contractsError.message}`);
    }

    if (!pendingContracts || pendingContracts.length === 0) {
      console.log('No pending signature contracts found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending contracts requiring reminders',
          processed: 0,
          reminders_sent: 0,
          dry_run: dryRun,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingContracts.length} pending contracts to process`);

    const results = {
      processed: 0,
      reminders_sent: 0,
      skipped: 0,
      errors: [] as string[],
      contracts: [] as Array<{
        contract_id: string;
        contract_number: string;
        reminder_sent: boolean;
        reason?: string;
      }>,
    };

    const now = new Date();

    for (const contract of pendingContracts as PendingContract[]) {
      results.processed++;
      const contractResult = {
        contract_id: contract.id,
        contract_number: contract.contract_number,
        reminder_sent: false,
      };

      try {
        // Determine when contract entered pending_signature status
        // Use updated_at as proxy for when status changed to pending_signature
        const pendingSince = new Date(contract.updated_at);
        const daysSincePending = Math.floor(
          (now.getTime() - pendingSince.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check which reminder schedule applies
        const applicableSchedule = REMINDER_SCHEDULES.find((schedule) => schedule.days === daysSincePending);

        if (!applicableSchedule) {
          results.skipped++;
          (contractResult as any).reason = `No reminder scheduled for day ${daysSincePending}`;
          results.contracts.push(contractResult);
          continue;
        }

        // Check if we already sent a reminder for this schedule
        const reminderCount = contract.signature_reminder_count || 0;
        const scheduleIndex = REMINDER_SCHEDULES.indexOf(applicableSchedule);

        if (reminderCount > scheduleIndex) {
          results.skipped++;
          (contractResult as any).reason = `Reminder already sent for this schedule`;
          results.contracts.push(contractResult);
          continue;
        }

        // Determine who hasn't signed yet
        const targets: ReminderTarget[] = [];

        // Get profiles for owner and tenant
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', [contract.owner_id, contract.tenant_id]);

        if (!profiles) {
          throw new Error('Failed to fetch profiles');
        }

        const ownerProfile = profiles.find((p) => p.id === contract.owner_id);
        const tenantProfile = profiles.find((p) => p.id === contract.tenant_id);

        // Add owner if not signed
        if (!contract.owner_signed_at && ownerProfile) {
          targets.push({
            userId: contract.owner_id,
            userName: ownerProfile.full_name,
            userEmail: ownerProfile.email,
            userPhone: ownerProfile.phone,
            role: 'owner',
          });
        }

        // Add tenant if not signed
        if (!contract.tenant_signed_at && tenantProfile) {
          targets.push({
            userId: contract.tenant_id,
            userName: tenantProfile.full_name,
            userEmail: tenantProfile.email,
            userPhone: tenantProfile.phone,
            role: 'tenant',
          });
        }

        if (targets.length === 0) {
          // Both parties have signed, but status hasn't been updated yet
          results.skipped++;
          (contractResult as any).reason = 'Both parties already signed';
          results.contracts.push(contractResult);
          continue;
        }

        // Send reminders to each target
        const promises = targets.map((target) => sendReminderToUser(supabase, contract, target, applicableSchedule, dryRun));

        await Promise.all(promises);

        // Update contract with reminder info (unless dry run)
        if (!dryRun) {
          await supabase
            .from('lease_contracts')
            .update({
              last_signature_reminder: now.toISOString(),
              signature_reminder_count: reminderCount + 1,
              updated_at: now.toISOString(),
            })
            .eq('id', contract.id);
        }

        results.reminders_sent += targets.length;
        contractResult.reminder_sent = true;
        results.contracts.push(contractResult);

        console.log(
          `✅ Sent ${applicableSchedule.label} reminder for contract ${contract.contract_number} to ${targets.length} recipient(s)`
        );
      } catch (error) {
        const errorMsg = `Error processing contract ${contract.contract_number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
        (contractResult as any).reason = errorMsg;
        results.contracts.push(contractResult);
      }
    }

    const response = {
      success: results.errors.length === 0,
      message: dryRun
        ? `DRY RUN: Would send ${results.reminders_sent} reminders for ${results.contracts.filter((c) => c.reminder_sent).length} contracts`
        : `Sent ${results.reminders_sent} reminders for ${results.contracts.filter((c) => c.reminder_sent).length} contracts`,
      processed: results.processed,
      reminders_sent: results.reminders_sent,
      skipped: results.skipped,
      dry_run: dryRun,
      contracts: results.contracts,
      errors: results.errors,
      timestamp: now.toISOString(),
    };

    console.log('Summary:', JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      status: results.errors.length > 0 ? 207 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fatal error in send-signature-reminders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendReminderToUser(
  supabase: Record<string, unknown>,
  contract: PendingContract,
  target: ReminderTarget,
  schedule: ReminderSchedule,
  dryRun: boolean
): Promise<void> {
  const propertyTitle = contract.properties?.title || 'Votre propriété';
  // const daysRemaining = schedule.days === 14 ? 0 : 14 - schedule.days; // Estimate days until "final"

  const inAppNotification = {
    user_id: target.userId,
    title: `🔔 Rappel de signature - ${schedule.label} rappel`,
    message: `Votre bail pour "${propertyTitle}" (contrat #${contract.contract_number}) est en attente de votre signature. Merci de le signer dans les plus brefs délais.`,
    type: 'warning',
    action_url: target.role === 'owner' ? `/proprietaire/contrats` : `/locataire/signer-bail/${contract.id}`,
    channel: 'in_app',
    metadata: {
      contract_id: contract.id,
      contract_number: contract.contract_number,
      reminder_type: schedule.label,
      days_since_pending: schedule.days,
    },
  };

  if (!dryRun) {
    // Insert in-app notification
    const { error: notifError } = await supabase.from('notifications').insert(inAppNotification);

    if (notifError) {
      console.error(`Failed to create notification for user ${target.userId}:`, notifError);
      throw notifError;
    }

    // Optionally send SMS reminder if phone is available
    // This would require integration with your SMS service
    if (target.userPhone) {
      // SMS integration placeholder
      console.log(`SMS reminder would be sent to ${target.userPhone} for contract ${contract.contract_number}`);
    }
  } else {
    console.log(
      `[DRY RUN] Would send reminder to ${target.userEmail || target.userName || target.userId} for contract ${
        contract.contract_number
      }`
    );
  }
}
