export const monthlyReportTemplate = (data: any) => {
  const { report } = data;
  
  const kpiCards = `
    <tr>
      <td style="padding: 10px; background: #f3f4f6; border-radius: 8px; text-align: center; width: 23%;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${report.summary.total_properties}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Propriétés</div>
      </td>
      <td style="width: 2%;"></td>
      <td style="padding: 10px; background: #f3f4f6; border-radius: 8px; text-align: center; width: 23%;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${report.summary.total_views}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Vues</div>
      </td>
      <td style="width: 2%;"></td>
      <td style="padding: 10px; background: #f3f4f6; border-radius: 8px; text-align: center; width: 23%;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${report.summary.total_applications}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Candidatures</div>
      </td>
      <td style="width: 2%;"></td>
      <td style="padding: 10px; background: #f3f4f6; border-radius: 8px; text-align: center; width: 23%;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${report.summary.occupancy_rate}%</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Taux occupation</div>
      </td>
    </tr>
  `;

  const topProperties = report.properties_performance.slice(0, 5).map((prop: any) => {
    const maxViews = Math.max(...report.properties_performance.map((p: any) => p.views));
    const barWidth = maxViews > 0 ? (prop.views / maxViews) * 100 : 0;
    
    return `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #374151;">${prop.title.slice(0, 40)}${prop.title.length > 40 ? '...' : ''}</td>
        <td style="padding: 8px 0;">
          <div style="background: #e0e7ff; height: 20px; width: ${barWidth}%; border-radius: 4px; display: inline-block; min-width: 20px;"></div>
          <span style="margin-left: 8px; font-size: 14px; color: #6b7280;">${prop.views}</span>
        </td>
      </tr>
    `;
  }).join('');

  const propertiesTable = report.properties_performance.map((prop: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; font-size: 14px; color: #374151;">${prop.title.slice(0, 35)}...</td>
      <td style="padding: 12px 8px; text-align: center; color: #6b7280;">${prop.views}</td>
      <td style="padding: 12px 8px; text-align: center; color: #6b7280;">${prop.favorites}</td>
      <td style="padding: 12px 8px; text-align: center; color: #6b7280;">${prop.applications}</td>
      <td style="padding: 12px 8px; text-align: center; color: #6b7280;">${prop.conversion_rate}%</td>
    </tr>
  `).join('');

  const recommendations = report.recommendations.length > 0 ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">💡 Recommandations</h3>
      ${report.recommendations.map((rec: string) => `<p style="margin: 8px 0; color: #78350f; font-size: 14px;">• ${rec}</p>`).join('')}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 40px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">📊 Rapport ${report.period.label}</h1>
                    <p style="margin: 8px 0 0 0; color: #e9d5ff; font-size: 14px;">Bonjour ${report.owner.name},</p>
                    <p style="margin: 4px 0 0 0; color: #e9d5ff; font-size: 14px;">Voici le résumé de vos performances pour la période écoulée.</p>
                  </td>
                </tr>

                <!-- KPIs -->
                <tr>
                  <td style="padding: 32px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${kpiCards}
                    </table>
                  </td>
                </tr>

                <!-- Top Properties -->
                <tr>
                  <td style="padding: 0 40px 32px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold;">🏆 Propriétés les plus vues</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${topProperties}
                    </table>
                  </td>
                </tr>

                <!-- Detailed Table -->
                <tr>
                  <td style="padding: 0 40px 32px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold;">📋 Détail par propriété</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <tr style="background: #f9fafb;">
                        <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Propriété</th>
                        <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Vues</th>
                        <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Favoris</th>
                        <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Candidatures</th>
                        <th style="padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Taux conv.</th>
                      </tr>
                      ${propertiesTable}
                    </table>
                  </td>
                </tr>

                <!-- Recommendations -->
                ${recommendations ? `<tr><td style="padding: 0 40px 32px 40px;">${recommendations}</td></tr>` : ''}

                <!-- CTA -->
                <tr>
                  <td style="padding: 0 40px 32px 40px; text-align: center;">
                    <a href="https://montoit.ci/owner-dashboard" style="display: inline-block; padding: 14px 32px; background: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">📊 Voir mon dashboard complet</a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">MonToit ANSUT - Plateforme de location certifiée</p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">Des questions ? Contactez-nous à <a href="mailto:support@montoit.ci" style="color: #8b5cf6; text-decoration: none;">support@montoit.ci</a></p>
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
