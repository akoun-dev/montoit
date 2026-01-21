// Version de développement pour la simulation d'emails
// Copiez ce fichier vers index.ts pour utiliser le mode simulation

import { EmailRequest } from './index';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Simulation d'envoi d'email pour le développement
const simulateEmailSend = (to: string | string[], template: string) => {
  const toList = Array.isArray(to) ? to : [to];
  const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`\n===== EMAIL SIMULÉ (MODE DÉVELOPPEMENT) =====`);
  console.log(`Destinataire(s): ${toList.join(', ')}`);
  console.log(`Template: ${template}`);
  console.log(`ID simulé: ${simulatedId}`);
  console.log(`=============================================\n`);

  // Pour le mode développement, affiche le contenu du template email si nécessaire
  if (template === 'email-verification') {
    console.log(`Contenu OTP: 123456 (simulation - utilisez ce code pour tester)`);
  }

  return {
    id: simulatedId,
    simulated: true,
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, template, data } = await req.json() as EmailRequest;

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulation directe en développement
    const simulatedResult = simulateEmailSend(to, template);

    return new Response(
      JSON.stringify({
        success: true,
        id: simulatedResult.id,
        template,
        to,
        simulated: true,
        message: 'Email simulé avec succès (mode développement)',
        debug: {
          mode: 'development',
          note: 'En mode production, utilisez une vraie clé API Resend'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[send-email] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Unexpected error occurred',
        detail: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});