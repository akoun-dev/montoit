import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Calling expire_stale_visit_requests function...');
    
    const { data, error } = await supabase.rpc('expire_stale_visit_requests');

    if (error) {
      console.error('Error expiring stale requests:', error);
      throw error;
    }

    console.log('Expiration result:', data);

    const expiredCount = data?.[0]?.expired_count || 0;
    const expiredIds = data?.[0]?.expired_request_ids || [];

    const response = {
      success: true,
      expired_count: expiredCount,
      expired_request_ids: expiredIds,
      message: `Successfully expired ${expiredCount} stale visit request(s)`,
      timestamp: new Date().toISOString(),
    };

    console.log('Response:', response);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while expiring stale requests',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
