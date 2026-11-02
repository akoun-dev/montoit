import { getSupabaseAdminClient } from './supabase-admin.ts';
export async function resolveUserFromRequest(req) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const supabase = getSupabaseAdminClient();
  const token = authHeader.replace('Bearer ', '');
  // Service role key passed as Bearer → trust x-user-id header
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && token === serviceRoleKey) {
    return req.headers.get('x-user-id') || null;
  }
  // Standard Supabase Auth JWT
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}
