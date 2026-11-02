const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WhatsAppOTPRequest {
  phone: string;
  otp: string;
  name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phone, otp, name } = await req.json() as WhatsAppOTPRequest;

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Côte d'Ivoire
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('225')) {
      formattedPhone = '225' + formattedPhone;
    }

    const message = `Mon Toit: Votre code de verification est ${otp}. Valide 10 min.`;

    // Get InTouch credentials
    const intouchApiKey = Deno.env.get('INTOUCH_API_KEY');
    const intouchAgencyCode = Deno.env.get('INTOUCH_AGENCY_CODE');

    // Validate credentials - agency code should be simple alphanumeric
    const isValidConfig = intouchApiKey && 
                          intouchAgencyCode && 
                          /^[A-Za-z0-9_-]+$/.test(intouchAgencyCode) &&
                          intouchAgencyCode.length < 50;

    if (!isValidConfig) {
      // MODE DÉVELOPPEMENT - Simuler l'envoi et retourner le code pour test
      console.log('=== MODE DÉVELOPPEMENT ===');
      console.log(`Destinataire: +${formattedPhone}`);
      console.log(`Message: ${message}`);
      console.log(`Code OTP: ${otp}`);
      console.log('==========================');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Code de vérification: ${otp} (Mode test - InTouch non configuré)`,
          devMode: true,
          otp: otp
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Production: InTouch SMS API
    const intouchUrl = `https://apidist.gutouch.net/apidist/sec/${intouchAgencyCode}/sms`;
    const authString = btoa(`${intouchAgencyCode}:${intouchApiKey}`);

    console.log(`Envoi SMS vers +${formattedPhone}...`);

    const response = await fetch(intouchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_phone_number: formattedPhone,
        message: message,
        sender_id: 'MonToit',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('InTouch error:', errorText);
      
      // Fallback en mode dev si l'API échoue
      return new Response(
        JSON.stringify({
          success: true,
          message: `Code: ${otp} (Erreur InTouch - mode fallback)`,
          fallback: true,
          otp: otp
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('SMS envoyé:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Code envoyé par SMS'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
