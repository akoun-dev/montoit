import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Days before expiration to send warnings
const EXPIRATION_WARNING_DAYS = [60, 30, 15, 7, 1];

interface LeaseContract {
  id: string;
  contract_number: string;
  owner_id: string;
  tenant_id: string;
  property_id: string;
  end_date: string;
  status: string;
  metadata?: {
    expiration_warnings_sent?: number[];
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  console.log('[check-lease-expirations] Starting expiration check...');

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active leases
    const { data: leases, error: leasesError } = await supabaseClient
      .from('lease_contracts')
      .select('id, contract_number, owner_id, tenant_id, property_id, end_date, status')
      .eq('status', 'actif');

    if (leasesError) {
      console.error('Error fetching leases:', leasesError);
      throw leasesError;
    }

    console.log(`[check-lease-expirations] Found ${leases?.length || 0} active leases`);

    const results = {
      expiredCount: 0,
      warningsSent: 0,
      errors: 0
    };

    for (const lease of leases || []) {
      try {
        const endDate = new Date(lease.end_date);
        endDate.setHours(0, 0, 0, 0);
        
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`[check-lease-expirations] Lease ${lease.contract_number}: ${daysRemaining} days remaining`);

        // Check if lease has expired
        if (daysRemaining <= 0) {
          console.log(`[check-lease-expirations] Lease ${lease.contract_number} has expired`);

          // Update lease status to expired
          await supabaseClient
            .from('lease_contracts')
            .update({ status: 'expire' })
            .eq('id', lease.id);

          // Update property status back to available
          await supabaseClient
            .from('properties')
            .update({ status: 'disponible' })
            .eq('id', lease.property_id);

          // Send expiration notification
          await supabaseClient.functions.invoke('send-lease-notifications', {
            body: {
              leaseId: lease.id,
              type: 'lease_expired'
            }
          });

          results.expiredCount++;
          continue;
        }

        // Check if we need to send a warning
        for (const warningDay of EXPIRATION_WARNING_DAYS) {
          if (daysRemaining === warningDay) {
            console.log(`[check-lease-expirations] Sending ${warningDay}-day warning for ${lease.contract_number}`);

            // Send warning notification
            await supabaseClient.functions.invoke('send-lease-notifications', {
              body: {
                leaseId: lease.id,
                type: 'lease_expiring_soon',
                daysRemaining: warningDay
              }
            });

            results.warningsSent++;
            break; // Only send one warning per day
          }
        }
      } catch (leaseError) {
        console.error(`Error processing lease ${lease.id}:`, leaseError);
        results.errors++;
      }
    }

    console.log('[check-lease-expirations] Completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        processed: leases?.length || 0,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[check-lease-expirations] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
