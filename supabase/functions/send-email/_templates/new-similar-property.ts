export interface NewSimilarPropertyData {
  userName: string;
  property: {
    id: string;
    title: string;
    city: string;
    neighborhood: string;
    monthly_rent: number;
    bedrooms: number;
    surface_area: number;
    main_image: string;
  };
  matchCriteria: string[];
  propertyUrl: string;
}

export const newSimilarPropertyTemplate = (data: NewSimilarPropertyData): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .property-card { border: 2px solid #667eea; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .property-image { width: 100%; height: 250px; object-fit: cover; }
          .property-details { padding: 20px; background: #f9fafb; }
          .badge { display: inline-block; background: #667eea; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; margin: 5px 5px 5px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🏠 Nouveau bien correspond à vos critères !</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Bonjour ${data.userName}, nous avons trouvé quelque chose pour vous.</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Un nouveau bien immobilier correspond à vos critères de recherche. Ne manquez pas cette opportunité !
            </p>
            
            <div class="property-card">
              <img src="${data.property.main_image || 'https://via.placeholder.com/600x250'}" alt="${data.property.title}" class="property-image">
              
              <div class="property-details">
                <h2 style="margin: 0 0 10px; color: #111827; font-size: 22px;">${data.property.title}</h2>
                <p style="color: #6b7280; margin: 5px 0;">📍 ${data.property.neighborhood}, ${data.property.city}</p>
                
                <div style="margin: 15px 0;">
                  <strong style="font-size: 24px; color: #667eea;">${data.property.monthly_rent.toLocaleString()} FCFA</strong>
                  <span style="color: #6b7280;">/mois</span>
                </div>
                
                <div style="margin: 15px 0;">
                  <span style="margin-right: 15px;">🛏️ ${data.property.bedrooms} chambres</span>
                  <span>📐 ${data.property.surface_area} m²</span>
                </div>
                
                <div style="margin: 15px 0 0;">
                  <strong style="color: #111827; display: block; margin-bottom: 8px;">Pourquoi ce bien vous correspond :</strong>
                  ${data.matchCriteria.map(criteria => `<span class="badge">✓ ${criteria}</span>`).join('')}
                </div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.propertyUrl}" class="cta-button">Voir le bien maintenant</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              💡 <strong>Astuce :</strong> Les biens populaires sont rapidement loués. Nous vous recommandons de postuler dès maintenant.
            </p>
          </div>
          
          <div class="footer">
            <p>Vous recevez cet email car vous avez activé les alertes pour de nouveaux biens.</p>
            <p><a href="${data.propertyUrl}" style="color: #667eea;">Gérer mes préférences d'alertes</a></p>
            <p style="margin-top: 15px;">&copy; 2025 MonToit - Plateforme Immobilière ANSUT</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const newSimilarPropertyTextTemplate = (data: NewSimilarPropertyData): string => {
  return `
Bonjour ${data.userName},

🏠 Nouveau bien correspond à vos critères !

${data.property.title}
📍 ${data.property.neighborhood}, ${data.property.city}
💰 ${data.property.monthly_rent.toLocaleString()} FCFA/mois
🛏️ ${data.property.bedrooms} chambres | 📐 ${data.property.surface_area} m²

Pourquoi ce bien vous correspond :
${data.matchCriteria.map(c => `✓ ${c}`).join('\n')}

Voir le bien : ${data.propertyUrl}

---
Vous recevez cet email car vous avez activé les alertes immobilières.
Gérer mes préférences : ${data.propertyUrl}

MonToit - Plateforme Immobilière ANSUT
  `.trim();
};
