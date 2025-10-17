interface VerificationSuccessData {
  userName: string;
  verificationType: "ONECI" | "CNAM";
  tenantScore?: number;
}

export const verificationSuccessTemplate = (data: VerificationSuccessData): string => {
  const { userName, verificationType, tenantScore } = data;
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0] + ".lovable.app";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification réussie</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #059669; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                ✅ Vérification réussie !
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Félicitations ${userName},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Votre vérification <strong>${verificationType}</strong> a été effectuée avec succès.
              </p>
              <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                <h2 style="color: #059669; font-size: 20px; font-weight: 700; margin: 0 0 12px;">🎯 Badge de confiance activé</h2>
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  Votre profil affiche maintenant le badge de vérification ${verificationType},
                  renforçant votre crédibilité auprès des propriétaires.
                </p>
                ${tenantScore && tenantScore > 0 ? `
                <p style="color: #059669; font-size: 18px; font-weight: 600; margin: 16px 0 0 0;">
                  Score locataire : <strong>${tenantScore}/100</strong>
                </p>
                ` : ''}
              </div>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                <strong>Avantages :</strong><br>
                ✓ Profil vérifié et crédible<br>
                ✓ Candidatures prioritaires<br>
                ✓ Processus de location accéléré<br>
                ${verificationType === "CNAM" ? "✓ Preuve d'emploi certifiée" : ""}
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/profile" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Voir mon profil
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Vérifications<br>
                Votre identité est maintenant sécurisée
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
