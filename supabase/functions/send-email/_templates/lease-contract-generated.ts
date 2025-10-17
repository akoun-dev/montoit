interface LeaseContractGeneratedData {
  recipientName: string;
  propertyTitle: string;
  documentUrl: string;
  recipientType: 'landlord' | 'tenant';
}

export const leaseContractGeneratedTemplate = (data: LeaseContractGeneratedData): string => {
  const appUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://montoit.lovable.app';
  
  const roleText = data.recipientType === 'landlord' 
    ? 'propriétaire' 
    : 'locataire';
    
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrat de bail généré</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">MonToit ANSUT</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #667eea; margin-top: 0;">Bonjour ${data.recipientName},</h2>
          
          <p style="font-size: 16px;">
            Votre contrat de bail pour le bien <strong>${data.propertyTitle}</strong> a été généré avec succès.
          </p>
          
          <p style="font-size: 16px;">
            En tant que <strong>${roleText}</strong>, vous pouvez maintenant télécharger et consulter le document officiel signé par les deux parties.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.documentUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;">
              📄 Télécharger le contrat
            </a>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">📋 Prochaines étapes</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Conservez une copie de ce contrat en lieu sûr</li>
              <li>Vous pouvez demander la certification ANSUT pour plus de sécurité</li>
              <li>Accédez à vos paiements depuis votre tableau de bord</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${appUrl}/leases" 
               style="color: #667eea; text-decoration: none; font-weight: bold;">
              Voir tous mes contrats →
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            Cet email a été envoyé automatiquement par MonToit ANSUT.<br>
            Pour toute question, contactez notre support.
          </p>
        </div>
      </body>
    </html>
  `;
};
