interface WelcomeEmailData {
  userName: string;
  userType: string;
}

export const welcomeTemplate = (data: WelcomeEmailData): string => {
  const { userName, userType } = data;
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0] + ".lovable.app";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur MonToit ANSUT</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #1e293b; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                Bienvenue sur MonToit ANSUT ! 🏠
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bonjour ${userName},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Nous sommes ravis de vous accueillir sur MonToit ANSUT, la plateforme de location immobilière certifiée en Côte d'Ivoire.
              </p>
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  En tant que <strong>${userType === "bailleur" ? "propriétaire" : "locataire"}</strong>, vous avez accès à :
                </p>
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  ✓ Des baux certifiés ANSUT<br>
                  ✓ Paiements sécurisés par Mobile Money<br>
                  ✓ Vérification d'identité ONECI/CNAM<br>
                  ✓ Messagerie intégrée<br>
                  ✓ Tableau de bord complet
                </p>
              </div>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                <strong>Prochaines étapes :</strong>
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                1. Complétez votre profil<br>
                2. Vérifiez votre identité (ONECI/CNAM)<br>
                3. ${userType === "bailleur" ? "Publiez votre premier bien" : "Recherchez votre logement idéal"}
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/dashboard" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Accéder à mon tableau de bord
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Plateforme certifiée de location immobilière<br>
                Côte d'Ivoire
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
