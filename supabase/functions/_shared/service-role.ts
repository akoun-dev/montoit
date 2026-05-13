import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

export function getServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[service-role] Missing required environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log('[service-role] Creating client with URL:', supabaseUrl);

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'service-role-client'
        }
      }
    }
  );
}
