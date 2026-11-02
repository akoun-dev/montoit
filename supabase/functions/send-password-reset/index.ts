import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PasswordResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json() as PasswordResetRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email using listUsers
    const { data: usersData, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    const userData = usersData?.users?.find(u => u.email === email);

    if (userError || !userData) {
      return new Response(
        JSON.stringify({
          error: 'Aucun compte associé à cette adresse email',
          emailNotFound: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('generate_reset_token');

    if (tokenError || !tokenData) {
      throw new Error('Failed to generate reset token: ' + (tokenError?.message || 'Unknown error'));
    }

    const token = tokenData as string;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const { error: insertError } = await supabaseClient
      .from('password_reset_tokens')
      .insert({
        user_id: userData.id,
        token: token,
        email: email,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });

    if (insertError) {
      throw new Error('Failed to save reset token: ' + insertError.message);
    }

    const resetLink = `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('/')[2].split('.')[0]}.supabase.co/reset-password?token=${token}`;
    const frontendUrl = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'https://montoit.ansut.ci';
    const actualResetLink = `${frontendUrl}/reinitialiser-mot-de-passe?token=${token}`;

    const emailResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: email,
          template: 'password-reset',
          data: {
            email: email,
            resetLink: actualResetLink
          }
        })
      }
    );

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error('Failed to send reset email: ' + (errorData.error || 'Unknown error'));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de réinitialisation envoyé avec succès',
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending password reset:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
