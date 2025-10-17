interface NewMessageData {
  userName: string;
  senderName: string;
  messagePreview: string;
}

export const newMessageTemplate = (data: NewMessageData): string => {
  const { userName, senderName, messagePreview } = data;
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0] + ".lovable.app";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau message</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="color: #2563eb; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">
                💬 Nouveau message
              </h1>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bonjour ${userName},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 24px; margin: 16px 0;">
                <strong>${senderName}</strong> vous a envoyé un message :
              </p>
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0; font-style: italic;">
                <p style="color: #334155; font-size: 15px; line-height: 22px; margin: 0;">
                  ${messagePreview.length > 150 ? messagePreview.substring(0, 150) + "..." : messagePreview}
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/messages" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Répondre au message
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="color: #64748b; font-size: 12px; line-height: 16px; text-align: center; margin: 0;">
                MonToit ANSUT - Messagerie<br>
                Pour vous désabonner de ces notifications, modifiez vos préférences
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
