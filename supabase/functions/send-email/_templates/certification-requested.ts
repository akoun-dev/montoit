interface CertificationRequestedData {
  userName: string;
  propertyTitle: string;
  isAdmin?: boolean;
  leaseId?: string;
}

export const certificationRequestedTemplate = (data: CertificationRequestedData): string => {
  const { userName, propertyTitle, isAdmin = false, leaseId } = data;
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0] + ".lovable.app";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isAdmin ? "Nouvelle demande de certification" : "Demande de certification envoyée"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #f97316; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                ${isAdmin ? "📋 Nouvelle demande de certification" : "✅ Demande envoyée"}
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bonjour ${userName},
              </p>
              ${isAdmin ? `
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Une nouvelle demande de certification ANSUT a été soumise pour le bien suivant :
              </p>
              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  <strong>Propriété :</strong> ${propertyTitle}<br>
                  <strong>ID du bail :</strong> ${leaseId}
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/admin" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Examiner la demande
                </a>
              </div>
              ` : `
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Votre demande de certification ANSUT pour <strong>${propertyTitle}</strong> a bien été envoyée.
              </p>
              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  Notre équipe examine votre bail et vous notifiera dès que la certification sera validée.
                  Ce processus prend généralement 24 à 48 heures.
                </p>
              </div>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                <strong>Avantages de la certification ANSUT :</strong><br>
                ✓ Bail légalement reconnu<br>
                ✓ Protection renforcée<br>
                ✓ Badge de confiance
              </p>
              `}
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Certifications<br>
                ${isAdmin ? "Tableau de bord administrateur" : "Votre plateforme de location certifiée"}
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
