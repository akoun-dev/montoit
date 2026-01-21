const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { name, email, subject, message }: ContactSubmission = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const firstName = name.split(' ')[0];

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo { font-size: 48px; margin-bottom: 10px; }
    .content { background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
    .greeting { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
    .message-box { background: #f9fafb; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .info { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb; }
    .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .social-links { margin-top: 20px; }
    .social-links a { display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏠</div>
      <h1 style="margin: 0; font-size: 32px;">MON TOIT</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Plateforme Immobilière Certifiée ANSUT</p>
    </div>

    <div class="content">
      <div class="greeting">Bonjour ${firstName} ! 👋</div>

      <p style="font-size: 16px; margin-bottom: 20px;">
        Nous avons bien reçu votre message et vous remercions de nous avoir contactés.
      </p>

      <div class="message-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #f97316;">Récapitulatif de votre demande :</p>
        <p style="margin: 5px 0;"><strong>Sujet :</strong> ${subject}</p>
        <p style="margin: 5px 0;"><strong>Message :</strong></p>
        <p style="margin: 10px 0 0 0; padding-left: 15px; border-left: 2px solid #e5e7eb;">${message.replace(/\n/g, '<br>')}</p>
      </div>

      <div class="info">
        <p style="margin: 0; font-size: 14px;">
          <strong>⏱️ Délai de réponse :</strong> Notre équipe vous répondra dans les <strong>24 heures</strong> (jours ouvrés).
        </p>
      </div>

      <p style="font-size: 16px; margin-top: 30px;">
        En attendant notre réponse, n'hésitez pas à explorer notre plateforme :
      </p>

      <div style="text-align: center;">
        <a href="https://montoitv35.netlify.app" class="button">
          Découvrir la plateforme 🚀
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          Besoin d'aide immédiate ? Consultez notre
          <a href="https://montoitv35.netlify.app/aide" style="color: #f97316; text-decoration: none;">centre d'aide</a>
          ou notre
          <a href="https://montoitv35.netlify.app/faq" style="color: #f97316; text-decoration: none;">FAQ</a>.
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 15px 0; font-weight: bold; color: #1f2937;">📞 Contactez-nous</p>
      <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
        Email : <a href="mailto:contact@mon-toit.ci" style="color: #f97316; text-decoration: none;">contact@mon-toit.ci</a>
      </p>
      <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
        Adresse : Abidjan, Cocody, Côte d'Ivoire
      </p>

      <div class="social-links">
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
          © ${new Date().getFullYear()} Mon Toit - Tous droits réservés
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Mon Toit <no-reply@montoit.ci>",
        to: [email],
        subject: `✅ Confirmation de réception - ${subject}`,
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email de confirmation envoyé",
        emailId: result.id
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending contact confirmation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
