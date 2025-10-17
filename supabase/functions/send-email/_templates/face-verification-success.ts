export const faceVerificationSuccessTemplate = (data: { userName: string; similarityScore: string }): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification faciale réussie</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 20px 0 48px;">
    <tr>
      <td style="padding: 0 12px;">
        <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 40px 0; padding: 0; text-align: center;">
          ✅ Vérification Faciale Réussie
        </h1>
        
        <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
          Bonjour ${data.userName},
        </p>

        <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
          Félicitations ! Votre vérification faciale a été effectuée avec succès.
        </p>

        <table width="100%" cellpadding="24" style="background-color: #f8f9fa; border-radius: 8px; margin: 24px 0;">
          <tr>
            <td style="text-align: center;">
              <p style="color: #666; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">
                Score de similarité
              </p>
              <h2 style="color: #22c55e; font-size: 48px; font-weight: bold; margin: 8px 0;">
                ${data.similarityScore}%
              </h2>
              <p style="color: #666; font-size: 14px; margin: 8px 0 0;">
                Ce score indique une forte correspondance entre votre photo de CNI et votre selfie.
              </p>
            </td>
          </tr>
        </table>

        <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
          Votre profil est maintenant marqué comme <strong>vérifié avec Face ID</strong>, ce qui augmente
          considérablement votre crédibilité auprès des propriétaires.
        </p>

        <table width="100%" cellpadding="20" style="background-color: #f0f9ff; border-radius: 8px; margin: 24px 0;">
          <tr>
            <td>
              <h3 style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 0 0 16px;">
                Avantages de la vérification faciale :
              </h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                <li style="color: #333; font-size: 15px; line-height: 28px; margin: 4px 0;">
                  ✓ Badge "Face ID vérifié" sur votre profil
                </li>
                <li style="color: #333; font-size: 15px; line-height: 28px; margin: 4px 0;">
                  ✓ Confiance accrue des propriétaires
                </li>
                <li style="color: #333; font-size: 15px; line-height: 28px; margin: 4px 0;">
                  ✓ Priorité dans les candidatures
                </li>
                <li style="color: #333; font-size: 15px; line-height: 28px; margin: 4px 0;">
                  ✓ Processus de location plus rapide
                </li>
              </ul>
            </td>
          </tr>
        </table>

        <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
          Vous pouvez maintenant continuer à postuler pour des biens immobiliers en toute confiance.
        </p>

        <p style="color: #ababab; font-size: 14px; margin: 14px 0 16px;">
          🔒 Vos données biométriques ne sont pas stockées. Seul le score de vérification est conservé.
        </p>

        <p style="color: #898989; font-size: 12px; line-height: 22px; margin: 32px 0 24px; text-align: center;">
          <a href="https://montoit.ci" target="_blank" style="color: #2754C5; text-decoration: underline;">
            MonToit
          </a>, la plateforme de location immobilière de confiance en Côte d'Ivoire.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
