import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
let client = null;
export function getSupabaseAdminClient() {
  if (client) return client;
  client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return client;
}
