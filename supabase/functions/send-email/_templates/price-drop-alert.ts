export interface PriceDropData {
  userName: string;
  property: {
    id: string;
    title: string;
    city: string;
    old_price: number;
    new_price: number;
    discount_percentage: number;
    main_image: string;
  };
  propertyUrl: string;
}

export const priceDropAlertTemplate = (data: PriceDropData): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .discount-badge { background: #22c55e; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 50%; display: inline-block; margin: 20px 0; }
          .price-comparison { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 20px 0; }
          .old-price { text-decoration: line-through; color: #9ca3af; font-size: 20px; }
          .new-price { color: #22c55e; font-size: 32px; font-weight: bold; }
          .cta-button { display: inline-block; background: #ef4444; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">🔥 Baisse de Prix !</h1>
            <p style="margin: 10px 0 0; font-size: 18px;">Un bien dans vos favoris vient de baisser de prix</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <div style="text-align: center;">
              <div class="discount-badge">-${data.property.discount_percentage}%</div>
            </div>
            
            <h2 style="text-align: center; color: #111827;">${data.property.title}</h2>
            <p style="text-align: center; color: #6b7280;">📍 ${data.property.city}</p>
            
            <img src="${data.property.main_image || 'https://via.placeholder.com/600x300'}" alt="${data.property.title}" style="width: 100%; border-radius: 8px; margin: 20px 0;">
            
            <div class="price-comparison" style="display: block; text-align: center;">
              <div style="margin-bottom: 10px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Prix initial</p>
                <p class="old-price">${data.property.old_price.toLocaleString()} FCFA</p>
              </div>
              <div style="font-size: 32px; color: #22c55e; margin: 10px 0;">→</div>
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Nouveau prix</p>
                <p class="new-price">${data.property.new_price.toLocaleString()} FCFA</p>
              </div>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <strong>💰 Économisez ${(data.property.old_price - data.property.new_price).toLocaleString()} FCFA/mois !</strong>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${data.propertyUrl}" class="cta-button">Profiter de cette offre</a>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
              ⚡ Les biens en promotion partent vite. Ne manquez pas cette opportunité !
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const priceDropAlertTextTemplate = (data: PriceDropData): string => {
  return `
Bonjour ${data.userName},

🔥 BAISSE DE PRIX - ${data.property.discount_percentage}% DE RÉDUCTION !

${data.property.title}
📍 ${data.property.city}

Prix initial : ${data.property.old_price.toLocaleString()} FCFA/mois
Nouveau prix : ${data.property.new_price.toLocaleString()} FCFA/mois

💰 Économisez ${(data.property.old_price - data.property.new_price).toLocaleString()} FCFA/mois !

Voir le bien : ${data.propertyUrl}

MonToit - Plateforme Immobilière ANSUT
  `.trim();
};
