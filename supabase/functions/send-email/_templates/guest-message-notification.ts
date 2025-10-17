interface GuestMessageNotificationData {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  message: string;
  propertyTitle: string;
  propertyId: string;
}

export const guestMessageNotificationTemplate = (data: GuestMessageNotificationData): string => {
  const { ownerName, guestName, guestEmail, guestPhone, message, propertyTitle } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau message d'un visiteur</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; background-color: #ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 0 48px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 0 20px;">
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin: 0; padding: 0;">
                Nouveau message d'un visiteur
              </h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 16px 0;">
              <p style="color: #333; font-size: 14px; line-height: 24px; margin: 0;">
                Bonjour ${ownerName},
              </p>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 16px 0;">
              <p style="color: #333; font-size: 14px; line-height: 24px; margin: 0;">
                Vous avez reçu un nouveau message concernant votre bien <strong>${propertyTitle}</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Message Box -->
          <tr>
            <td style="padding: 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; border-radius: 8px; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 10px;">
                      Message de ${guestName}
                    </h2>
                    <p style="color: #333; font-size: 14px; line-height: 22px; margin: 0; white-space: pre-wrap;">
                      ${message}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Contact Info -->
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin: 0 0 8px;">
                      Coordonnées du visiteur :
                    </p>
                    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 4px 0;">
                      📧 Email : <a href="mailto:${guestEmail}" style="color: #2754C5; text-decoration: underline;">${guestEmail}</a>
                    </p>
                    ${guestPhone ? `
                    <p style="color: #333; font-size: 14px; line-height: 24px; margin: 4px 0;">
                      📱 Téléphone : <a href="tel:${guestPhone}" style="color: #2754C5; text-decoration: underline;">${guestPhone}</a>
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Instructions -->
          <tr>
            <td style="padding: 16px 0;">
              <p style="color: #333; font-size: 14px; line-height: 24px; margin: 0;">
                Vous pouvez répondre directement à cet email ou contacter le visiteur aux coordonnées ci-dessus.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 0 24px;">
              <p style="color: #898989; font-size: 12px; line-height: 22px; margin: 0;">
                <a href="https://mon-toit.ci" target="_blank" style="color: #898989; text-decoration: underline;">
                  Mon Toit
                </a>, votre plateforme de location immobilière en Côte d'Ivoire
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
