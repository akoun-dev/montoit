import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return new Response(JSON.stringify({ status: 'ok', message: 'Hello from _test' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
