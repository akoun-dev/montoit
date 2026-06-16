import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Protect with CRON_SECRET
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const authHeader = req.headers.get('authorization') || ''
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = getSupabaseAdminClient()

    // Find all active leases with their monthly rent
    const { data: leases, error: leaseError } = await supabase
      .from('leases')
      .select('id, monthly_rent, start_date, tenant_id, owner_id')
      .eq('status', 'ACTIVE')

    if (leaseError) {
      console.error('Failed to fetch active leases:', leaseError)
      return new Response(JSON.stringify({ error: 'Failed to fetch leases' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    let created = 0
    let skipped = 0

    for (const lease of leases || []) {
      // Determine the next due date: first of next month
      const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 5)
      const dueDateStr = nextDue.toISOString()

      // Check if a PENDING payment already exists for this lease + due_date
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('due_date', dueDateStr)
        .in('status', ['PENDING', 'PROCESSING'])
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Check if the latest paid payment already covers this period
      const { data: latestPaid } = await supabase
        .from('payments')
        .select('due_date')
        .eq('lease_id', lease.id)
        .eq('status', 'PAID')
        .order('due_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestPaid && new Date(latestPaid.due_date) >= nextDue) {
        skipped++
        continue
      }

      // Create the monthly payment
      const { error: insertError } = await supabase.from('payments').insert({
        id: crypto.randomUUID(),
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        amount: lease.monthly_rent,
        status: 'PENDING',
        due_date: dueDateStr,
      })

      if (insertError) {
        console.error('Failed to create payment for lease', lease.id, insertError)
      } else {
        created++
      }
    }

    return new Response(JSON.stringify({ created, skipped, total: (leases || []).length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('generate-monthly-payments error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
