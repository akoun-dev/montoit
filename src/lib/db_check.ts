import { getSupabaseAdminClient } from '@/lib/supabase/admin'

async function checkAliases() {
  const supabase = getSupabaseAdminClient()
  
  // Fetch leases that are in PENDING_SIGNATURE status
  const { data: leases } = await supabase
    .from('leases')
    .select('id, owner_id, tenant_id, status')
    .eq('status', 'PENDING_SIGNATURE')
  
  console.log('--- LEASES IN PENDING_SIGNATURE ---')
  console.log(JSON.stringify(leases, null, 2))

  // Fetch all signature aliases
  const { data: aliases } = await supabase
    .from('signature_aliases')
    .select('*')
  
  console.log('--- SIGNATURE ALIASES ---')
  console.log(JSON.stringify(aliases, null, 2))

  // Fetch all users
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, active_role')
  
  console.log('--- USERS ---')
  console.log(JSON.stringify(users, null, 2))
}

checkAliases().catch(console.error)
