interface RoleChangeData {
  userName: string;
  oldRole: string;
  newRole: string;
  timestamp: string;
  dashboardUrl: string;
}

// Fonction utilitaire pour échapper le HTML et prévenir les injections XSS
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Constantes de style pour faciliter la maintenance
const EMAIL_STYLES = {
  colors: {
    primary: "#10b981",
    primaryLight: "#f0fdf4",
    text: "#484848",
    textLight: "#6b7280",
    textDark: "#374151",
    background: "#f6f9fc",
    white: "#ffffff",
    border: "#e5e7eb",
    danger: "#ef4444",
    dangerBg: "#fef2f2",
    dangerText: "#991b1b",
  },
  spacing: {
    small: "16px",
    medium: "24px",
    large: "32px",
    xlarge: "40px",
  },
  logo: {
    url: "https://btxhuqtirylvkgvoutoc.supabase.co/storage/v1/object/public/assets/mon-toit-logo.png",
    width: "120",
    height: "auto",
  },
} as const;

export const roleChangeConfirmationTemplate = (data: RoleChangeData): string => {
  // Échapper toutes les données utilisateur
  const userName = escapeHtml(data.userName);
  const oldRole = escapeHtml(data.oldRole);
  const newRole = escapeHtml(data.newRole);
  const timestamp = escapeHtml(data.timestamp);
  const dashboardUrl = escapeHtml(data.dashboardUrl);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Confirmation de changement de rôle - Mon Toit</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .mobile-padding {padding: 10px !important;}
  </style>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding {
        padding-left: 10px !important;
        padding-right: 10px !important;
      }
      .mobile-font-size {
        font-size: 14px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${EMAIL_STYLES.colors.background};">
  
  <!-- Wrapper principal -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_STYLES.colors.background}; padding: ${EMAIL_STYLES.spacing.xlarge} 0;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 0 20px;">
        
        <!-- Conteneur principal -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${EMAIL_STYLES.colors.white}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: ${EMAIL_STYLES.spacing.xlarge};">
              
              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="${EMAIL_STYLES.logo.url}" 
                         alt="Logo Mon Toit" 
                         width="${EMAIL_STYLES.logo.width}" 
                         style="display: block; max-width: 100%; height: auto; border: 0;">
                  </td>
                </tr>
              </table>
              
              <!-- En-tête -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <h1 style="color: ${EMAIL_STYLES.colors.textDark}; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.3;">
                      <span aria-hidden="true">🔄</span> Changement de rôle confirmé
                    </h1>
                  </td>
                </tr>
              </table>
              
              <!-- Corps du message -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: ${EMAIL_STYLES.colors.text}; font-size: 16px; line-height: 1.6; padding-bottom: ${EMAIL_STYLES.spacing.small};">
                    Bonjour <strong style="color: ${EMAIL_STYLES.colors.textDark};">${userName}</strong>,
                  </td>
                </tr>
                
                <tr>
                  <td style="color: ${EMAIL_STYLES.colors.text}; font-size: 16px; line-height: 1.6; padding-bottom: ${EMAIL_STYLES.spacing.large};">
                    Votre rôle sur la plateforme Mon Toit a été modifié avec succès.
                  </td>
                </tr>
              </table>
              
              <!-- Boîte de changement -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="24" cellspacing="0" border="0" style="background-color: ${EMAIL_STYLES.colors.primaryLight}; border: 2px solid ${EMAIL_STYLES.colors.primary}; border-radius: 8px; margin-bottom: ${EMAIL_STYLES.spacing.medium};">
                      <tr>
                        <td align="center">
                          <div style="color: ${EMAIL_STYLES.colors.textLight}; font-size: 14px; font-weight: 500; margin-bottom: 4px;">
                            Ancien rôle
                          </div>
                          <div style="color: ${EMAIL_STYLES.colors.textDark}; font-size: 20px; font-weight: 600; margin-bottom: ${EMAIL_STYLES.spacing.small};">
                            ${oldRole}
                          </div>
                          
                          <div style="color: ${EMAIL_STYLES.colors.primary}; font-size: 32px; margin: 8px 0;" aria-hidden="true">
                            ↓
                          </div>
                          
                          <div style="color: ${EMAIL_STYLES.colors.textLight}; font-size: 14px; font-weight: 500; margin-bottom: 4px; margin-top: ${EMAIL_STYLES.spacing.small};">
                            Nouveau rôle
                          </div>
                          <div style="color: ${EMAIL_STYLES.colors.primary}; font-size: 24px; font-weight: 700;">
                            ${newRole}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Timestamp -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="color: ${EMAIL_STYLES.colors.textLight}; font-size: 14px; padding: ${EMAIL_STYLES.spacing.medium} 0;">
                    <span aria-hidden="true">⏰</span> Date du changement : <strong>${timestamp}</strong>
                  </td>
                </tr>
              </table>
              
              <!-- Bouton CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: ${EMAIL_STYLES.spacing.large} 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${dashboardUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="13%" strokecolor="${EMAIL_STYLES.colors.primary}" fillcolor="${EMAIL_STYLES.colors.primary}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Accéder à mon espace</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${dashboardUrl}" 
                       target="_blank"
                       style="background-color: ${EMAIL_STYLES.colors.primary}; 
                              color: ${EMAIL_STYLES.colors.white}; 
                              text-decoration: none; 
                              padding: 14px 32px; 
                              border-radius: 6px; 
                              font-size: 16px; 
                              font-weight: 600; 
                              display: inline-block;
                              text-align: center;">
                      Accéder à mon espace
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <!-- Séparateur -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: ${EMAIL_STYLES.spacing.large} 0;">
                    <div style="border-top: 1px solid ${EMAIL_STYLES.colors.border};"></div>
                  </td>
                </tr>
              </table>
              
              <!-- Avertissement de sécurité -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: ${EMAIL_STYLES.colors.dangerBg}; border-left: 4px solid ${EMAIL_STYLES.colors.danger}; padding: ${EMAIL_STYLES.spacing.small}; border-radius: 4px; margin-bottom: ${EMAIL_STYLES.spacing.small};">
                    <p style="margin: 0; color: ${EMAIL_STYLES.colors.dangerText}; font-size: 14px; line-height: 1.5; font-weight: 500;">
                      <span aria-hidden="true">⚠️</span> <strong>Sécurité</strong>
                    </p>
                    <p style="margin: 8px 0 0 0; color: ${EMAIL_STYLES.colors.dangerText}; font-size: 14px; line-height: 1.5;">
                      Si vous n'êtes pas à l'origine de ce changement, veuillez contacter immédiatement notre support à 
                      <a href="mailto:support@montoit.ci" style="color: ${EMAIL_STYLES.colors.danger}; text-decoration: underline; font-weight: 500;">support@montoit.ci</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: ${EMAIL_STYLES.colors.textLight}; font-size: 13px; line-height: 1.6; padding-top: ${EMAIL_STYLES.spacing.medium}; text-align: center;">
                    <p style="margin: 0;">
                      Cet email a été envoyé par <strong style="color: ${EMAIL_STYLES.colors.textDark};">Mon Toit</strong>
                    </p>
                    <p style="margin: 8px 0 0 0;">
                      Votre plateforme de location immobilière en Côte d'Ivoire
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
};

// Version texte pour les clients email qui ne supportent pas le HTML
export const roleChangeConfirmationTextTemplate = (data: RoleChangeData): string => {
  const userName = escapeHtml(data.userName);
  const oldRole = escapeHtml(data.oldRole);
  const newRole = escapeHtml(data.newRole);
  const timestamp = escapeHtml(data.timestamp);
  const dashboardUrl = escapeHtml(data.dashboardUrl);

  return `
CHANGEMENT DE RÔLE CONFIRMÉ

Bonjour ${userName},

Votre rôle sur la plateforme Mon Toit a été modifié avec succès.

Ancien rôle : ${oldRole}
Nouveau rôle : ${newRole}

Date du changement : ${timestamp}

Accédez à votre espace : ${dashboardUrl}

SÉCURITÉ :
Si vous n'êtes pas à l'origine de ce changement, veuillez contacter immédiatement notre support à support@montoit.ci

---
Cet email a été envoyé par Mon Toit - Votre plateforme de location immobilière en Côte d'Ivoire.
  `.trim();
};
