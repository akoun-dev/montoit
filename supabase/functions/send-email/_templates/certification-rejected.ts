interface CertificationRejectedData {
  userName: string;
  propertyTitle: string;
  reason: string;
}

export const certificationRejectedTemplate = (data: CertificationRejectedData): string => {
  const { userName, propertyTitle, reason } = data;
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0] + ".lovable.app";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certification non approuvée</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #dc2626; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                Certification non approuvée
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bonjour ${userName},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Votre demande de certification ANSUT pour <strong>${propertyTitle}</strong> n'a pas été approuvée.
              </p>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h2 style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Raison :</h2>
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 0;">${reason}</p>
              </div>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                <strong>Prochaines étapes :</strong><br>
                • Corrigez les points mentionnés ci-dessus<br>
                • Mettez à jour votre bail<br>
                • Soumettez une nouvelle demande
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/leases" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Voir mon bail
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Support<br>
                Besoin d'aide ? Contactez notre équipe
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
