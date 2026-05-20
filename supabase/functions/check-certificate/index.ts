import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { cryptoneoFetch, isCryptoneoSuccess } from '../_shared/cryptoneo.ts'

interface CryptoneoUser {
  alias?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  state?: string
}

interface CryptoneoUsersResponse {
  statusCode?: number
  statusMessage?: string
  data?: CryptoneoUser[]
}

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = await resolveUserFromRequest(req)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()
    const url = new URL(req.url)

    const email = url.searchParams.get('email')
    const phone = url.searchParams.get('phone')
    const alias = url.searchParams.get('alias')

    if (!email && !phone && !alias) {
      return new Response(JSON.stringify({ error: 'email, phone, or alias parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await cryptoneoFetch('/generateCert/users')

    const responseText = await res.text()
    let result: CryptoneoUsersResponse
    try { result = JSON.parse(responseText) } catch { result = {} }

    if (!res.ok || !isCryptoneoSuccess(result as any)) {
      return new Response(JSON.stringify({
        error: result?.statusMessage || 'Failed to check certificate',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const users = result?.data || []
    const existingAlias = alias
      ? users.find((u: any) => u.alias === alias)?.alias
      : email
        ? users.find((u: any) => u.email === email)?.alias
        : phone
          ? users.find((u: any) => u.phone === phone)?.alias
          : undefined

    if (existingAlias) {
      // Check if this alias is already stored in our local database
      const { data: existingAliasRecord } = await supabase
        .from('signature_aliases')
        .select('id, alias_certificat, email, phone, is_active')
        .eq('user_id', userId)
        .eq('alias_certificat', existingAlias)
        .maybeSingle()

      if (existingAliasRecord) {
        // Alias already stored, update if inactive
        if (!existingAliasRecord.is_active) {
          await supabase
            .from('signature_aliases')
            .update({ is_active: true })
            .eq('id', existingAliasRecord.id)
        }
        return new Response(JSON.stringify({
          hasCertificate: true,
          alias: existingAlias,
          storedLocally: true,
          data: {
            email: existingAliasRecord.email,
            phone: existingAliasRecord.phone,
          },
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Alias exists in CRYPTONEO but not in our local DB
      // Fetch user details to get email/phone
      const { data: userData } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', userId)
        .single()

      // Insert into local database
      await supabase.from('signature_aliases').insert({
        user_id: userId,
        alias_certificat: existingAlias,
        email: userData?.email || email || '',
        phone: userData?.phone || phone || '',
        is_active: true,
      })

      return new Response(JSON.stringify({
        hasCertificate: true,
        alias: existingAlias,
        storedLocally: false,
        synced: true,
        data: {
          email: userData?.email || email || '',
          phone: userData?.phone || phone || '',
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // No certificate found
    return new Response(JSON.stringify({
      hasCertificate: false,
      alias: null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
