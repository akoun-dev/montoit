interface LeaseSignedData {
  userName: string;
  propertyTitle: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  bothSigned: boolean;
}

export const leaseSignedTemplate = (data: LeaseSignedData): string => {
  const { userName, propertyTitle, monthlyRent, startDate, endDate, bothSigned } = data;
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0] + ".lovable.app";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bothSigned ? "Bail finalisé" : "Signature confirmée"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #2563eb; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                ${bothSigned ? "🎉 Bail finalisé !" : "✅ Signature confirmée"}
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bonjour ${userName},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                ${bothSigned 
                  ? "Le bail a été signé par toutes les parties et est maintenant actif."
                  : "Votre signature du bail a été enregistrée avec succès."}
              </p>
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h2 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 12px;">${propertyTitle}</h2>
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  <strong>Loyer mensuel :</strong> ${monthlyRent.toLocaleString()} FCFA<br>
                  <strong>Début :</strong> ${new Date(startDate).toLocaleDateString("fr-FR")}<br>
                  <strong>Fin :</strong> ${new Date(endDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
              ${bothSigned ? `
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                <strong>Prochaines étapes :</strong><br>
                ✓ Demander la certification ANSUT (recommandé)<br>
                ✓ Effectuer le premier paiement<br>
                ✓ Télécharger une copie du bail
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/leases" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Voir mon bail
                </a>
              </div>
              ` : `
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                En attente de la signature de l'autre partie. Vous serez notifié dès que le bail sera finalisé.
              </p>
              `}
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Gestion de baux<br>
                Votre plateforme de location certifiée
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
