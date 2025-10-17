interface PaymentConfirmationData {
  userName: string;
  amount: number;
  provider: string;
  transactionRef: string;
  paymentType: string;
  date: string;
}

export const paymentConfirmationTemplate = (data: PaymentConfirmationData): string => {
  const { userName, amount, provider, transactionRef, paymentType, date } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement confirmé</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #059669; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                ✅ Paiement confirmé
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bonjour ${userName},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Votre paiement a été effectué avec succès.
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h2 style="color: #166534; font-size: 18px; font-weight: 600; margin: 0 0 12px;">Détails du paiement</h2>
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 8px 0;">
                  <strong>Montant :</strong> ${amount.toLocaleString()} FCFA<br>
                  <strong>Méthode :</strong> ${provider.toUpperCase()}<br>
                  <strong>Type :</strong> ${paymentType}<br>
                  <strong>Référence :</strong> ${transactionRef}<br>
                  <strong>Date :</strong> ${new Date(date).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Un reçu détaillé est disponible dans votre espace "Paiements".
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Paiements sécurisés<br>
                En cas de question, contactez-nous
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
