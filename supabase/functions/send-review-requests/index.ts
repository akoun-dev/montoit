// Edge Function: send-review-requests
// Description: Automatically sends review requests to both parties when a lease ends
// This function is designed to be called by a cron job or scheduled task.
//
// Trigger conditions:
// - Contract status is 'terminated' or 'expired'
// - Contract end_date has passed
// - Review request has not been sent yet
//
// Usage:
//   curl -X POST https://xxx.supabase.co/functions/v1/send-review-requests \
//     -H "Authorization: Bearer <service_role_key>"
//
// Dry run mode (for testing):
//   curl -X POST https://xxx.supabase.co/functions/v1/send-review-requests \
//     -H "Authorization: Bearer <service_role_key>" \
//     -d '{"dryRun": true}'
//
// Specific contract:
//   curl -X POST https://xxx.supabase.co/functions/v1/send-review-requests \
//     -H "Authorization: Bearer <service_role_key>" \
//     -d '{"contractId": "uuid-here"}'

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contract {
  id: string;
  contract_number: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  status: string;
  end_date: string;
  terminated_at: string | null;
  review_request_sent: boolean | null;
  properties: {
    title: string;
  } | null;
}

interface ReviewRequest {
  contract_id: string;
  requester_id: string;
  requester_type: 'owner' | 'tenant';
  reviewee_id: string;
  reviewee_type: 'tenant' | 'owner';
  property_id: string;
  property_title: string;
  contract_number: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let dryRun = false;
    let specificContractId: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      dryRun = body.dryRun === true;
      specificContractId = body.contractId || null;
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(
      `[${dryRun ? 'DRY RUN' : 'LIVE'}] Starting review requests process at ${now.toISOString()}`
    );

    // Build query for contracts needing review requests
    let query = supabase
      .from('lease_contracts')
      .select(
        `
        id,
        contract_number,
        property_id,
        owner_id,
        tenant_id,
        status,
        end_date,
        terminated_at,
        review_request_sent,
        properties!inner(title)
        `
      )
      .eq('review_request_sent', false)
      .is('archived_at', null);

    // Filter by specific contract if provided
    if (specificContractId) {
      query = query.eq('id', specificContractId);
    } else {
      // Otherwise, filter for contracts that are ready for review requests
      // Either terminated/expired, or end_date has passed
      query = query.or(
        'status.in.(terminated,expired),and(status.eq.active,end_date.lte.' + now.toISOString().split('T')[0] + ')'
      );
    }

    const { data: contracts, error: contractsError } = await query;

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError);
      throw new Error(`Failed to fetch contracts: ${contractsError.message}`);
    }

    if (!contracts || contracts.length === 0) {
      console.log('No contracts requiring review requests found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No contracts requiring review requests',
          processed: 0,
          requests_sent: 0,
          dry_run: dryRun,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${contracts.length} contracts to process`);

    const results = {
      processed: 0,
      requests_sent: 0,
      skipped: 0,
      errors: [] as string[],
      contracts: [] as Array<{
        contract_id: string;
        contract_number: string;
        requests_sent: number;
        reason?: string;
      }>,
    };

    for (const contract of contracts as Contract[]) {
      results.processed++;
      const contractResult = {
        contract_id: contract.id,
        contract_number: contract.contract_number,
        requests_sent: 0,
      };

      try {
        const propertyTitle = contract.properties?.title || 'Votre propriété';
        const reviewRequests: ReviewRequest[] = [];

        // Create review request for owner to review tenant
        reviewRequests.push({
          contract_id: contract.id,
          requester_id: contract.owner_id,
          requester_type: 'owner',
          reviewee_id: contract.tenant_id,
          reviewee_type: 'tenant',
          property_id: contract.property_id,
          property_title: propertyTitle,
          contract_number: contract.contract_number,
        });

        // Create review request for tenant to review owner
        reviewRequests.push({
          contract_id: contract.id,
          requester_id: contract.tenant_id,
          requester_type: 'tenant',
          reviewee_id: contract.owner_id,
          reviewee_type: 'owner',
          property_id: contract.property_id,
          property_title: propertyTitle,
          contract_number: contract.contract_number,
        });

        // Send notifications to both parties
        const promises = reviewRequests.map((request) =>
          sendReviewRequestNotification(supabase, request, dryRun)
        );

        await Promise.all(promises);

        // Update contract to mark review request as sent (unless dry run)
        if (!dryRun) {
          await supabase
            .from('lease_contracts')
            .update({
              review_request_sent: true,
              review_request_sent_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', contract.id);
        }

        results.requests_sent += reviewRequests.length;
        contractResult.requests_sent = reviewRequests.length;
        results.contracts.push(contractResult);

        console.log(
          `✅ Sent ${reviewRequests.length} review requests for contract ${contract.contract_number}`
        );
      } catch (error) {
        const errorMsg = `Error processing contract ${contract.contract_number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
        (contractResult as { reason?: string }).reason = errorMsg;
        results.contracts.push(contractResult);
      }
    }

    const response = {
      success: results.errors.length === 0,
      message: dryRun
        ? `DRY RUN: Would send ${results.requests_sent} review requests for ${results.contracts.filter((c) => c.requests_sent > 0).length} contracts`
        : `Sent ${results.requests_sent} review requests for ${results.contracts.filter((c) => c.requests_sent > 0).length} contracts`,
      processed: results.processed,
      requests_sent: results.requests_sent,
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
    console.error('Fatal error in send-review-requests:', error);
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

async function sendReviewRequestNotification(
  supabase: { from: (table: string) => { insert: (data: unknown) => Promise<{ error: { message: string } | null }> } },
  request: ReviewRequest,
  dryRun: boolean
): Promise<void> {
  const isOwnerRequest = request.requester_type === 'owner';

  const notification = {
    user_id: request.requester_id,
    title: `⭐ Votre avis compte !`,
    message: `Votre location pour "${request.property_title}" est terminée. Prenez quelques minutes pour partager votre expérience avec ${isOwnerRequest ? 'votre locataire' : 'votre propriétaire'}. Votre avis aide toute la communauté MonToit !`,
    type: 'info',
    action_url: isOwnerRequest
      ? `/proprietaire/contrats`
      : `/locataire/avis?contract=${request.contract_id}`,
    channel: 'in_app',
    metadata: {
      contract_id: request.contract_id,
      reviewee_id: request.reviewee_id,
      reviewee_type: request.reviewee_type,
      property_id: request.property_id,
      contract_number: request.contract_number,
    },
  };

  if (!dryRun) {
    // Insert in-app notification
    const { error } = await supabase.from('notifications').insert(notification);

    if (error) {
      console.error(`Failed to create notification for user ${request.requester_id}:`, error);
      throw error;
    }

    // Optionally send email notification
    // This would require integration with your email service
    console.log(
      `[LIVE] Review request notification sent to ${request.requester_type} ${request.requester_id} for contract ${request.contract_number}`
    );
  } else {
    console.log(
      `[DRY RUN] Would send review request to ${request.requester_type} ${request.requester_id} for contract ${request.contract_number}`
    );
  }
}
