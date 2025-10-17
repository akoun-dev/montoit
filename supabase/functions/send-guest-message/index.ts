import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GuestMessageRequest {
  propertyId: string;
  ownerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  message: string;
  honeypot?: string; // Champ anti-bot
}

const disposableEmailDomains = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'temp-mail.org', 'throwaway.email', 'yopmail.com', 'trashmail.com'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      propertyId,
      ownerId,
      guestName,
      guestEmail,
      guestPhone,
      message,
      honeypot
    }: GuestMessageRequest = await req.json();

    // 1. Honeypot check (anti-bot)
    if (honeypot) {
      console.log('Bot detected via honeypot');
      return new Response(
        JSON.stringify({ error: 'Request blocked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validation basique
    if (!propertyId || !ownerId || !guestName || !guestEmail || !message) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return new Response(
        JSON.stringify({ error: 'Format d\'email invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Bloquer emails jetables
    const emailDomain = guestEmail.split('@')[1].toLowerCase();
    if (disposableEmailDomains.includes(emailDomain)) {
      return new Response(
        JSON.stringify({ error: 'Les emails temporaires ne sont pas acceptés' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validation longueur message
    if (message.length > 1000 || message.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Le message doit contenir entre 10 et 1000 caractères' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Récupérer IP et user agent
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      '0.0.0.0';
    const userAgent = req.headers.get('user-agent') || '';

    // 7. Générer browser fingerprint simple
    const browserFingerprint = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(userAgent + ipAddress.split('.')[0])
    ).then(hash => 
      Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 32)
    );

    // 8. Vérifier rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_guest_rate_limit', {
        _ip: ipAddress,
        _email: guestEmail,
        _fingerprint: browserFingerprint
      });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.log('Rate limit exceeded:', rateLimitCheck.reason);
      return new Response(
        JSON.stringify({ 
          error: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retry_after
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Vérifier que la propriété existe et est disponible
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, title, owner_id, status')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return new Response(
        JSON.stringify({ error: 'Propriété non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (property.owner_id !== ownerId) {
      return new Response(
        JSON.stringify({ error: 'Propriétaire invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Récupérer les infos du propriétaire
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', ownerId)
      .single();

    if (ownerError || !owner) {
      return new Response(
        JSON.stringify({ error: 'Propriétaire non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. Insérer le message invité
    const { data: guestMessage, error: insertError } = await supabase
      .from('guest_messages')
      .insert({
        property_id: propertyId,
        owner_id: ownerId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        message_content: message,
        ip_address: ipAddress,
        browser_fingerprint: browserFingerprint,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'envoi du message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 12. Créer notification pour le propriétaire
    await supabase
      .from('notifications')
      .insert({
        user_id: ownerId,
        type: 'guest_message',
        category: 'message',
        title: 'Nouveau message d\'un visiteur',
        message: `${guestName} vous a envoyé un message concernant votre bien "${property.title}"`,
        link: '/owner/guest-messages',
        metadata: {
          guest_message_id: guestMessage.id,
          property_id: propertyId,
          guest_email: guestEmail
        }
      });

    // 13. Récupérer l'email du propriétaire pour notification
    const { data: ownerAuth } = await supabase.auth.admin.getUserById(ownerId);
    const ownerEmail = ownerAuth?.user?.email;

    // 14. Envoyer email au propriétaire
    if (ownerEmail) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: ownerEmail,
            subject: `Nouveau message concernant "${property.title}"`,
            template: 'guest-message-notification',
            data: {
              ownerName: owner.full_name,
              guestName,
              guestEmail,
              guestPhone,
              message,
              propertyTitle: property.title,
              propertyId
            }
          }
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Ne pas bloquer si l'email échoue
      }
    }

    // 15. Logger l'action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: null,
        action_type: 'guest_message_sent',
        target_type: 'guest_message',
        target_id: guestMessage.id,
        notes: `Message invité de ${guestEmail} pour propriété ${propertyId}`,
        action_metadata: {
          ip_address: ipAddress,
          fingerprint: browserFingerprint,
          property_id: propertyId
        }
      });

    console.log('Guest message sent successfully:', guestMessage.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Votre message a été envoyé avec succès ! Le propriétaire vous répondra par email.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-guest-message function:', error);
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue lors de l\'envoi du message' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
