/**
 * Edge Function pour traiter les inscriptions d'agents
 * Approuve ou rejette les demandes d'inscription des agences
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { registrationId, action, reason } = await req.json();

    if (!registrationId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing registrationId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'approve') {
      // Approuver l'inscription
      const { error } = await supabase
        .from('agent_invitations')
        .update({ status: 'accepted' })
        .eq('id', registrationId);

      if (error) throw error;

    } else if (action === 'reject') {
      // Rejeter l'inscription
      const { error } = await supabase
        .from('agent_invitations')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', registrationId);

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing agent registration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
