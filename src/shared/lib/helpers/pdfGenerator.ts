import jsPDF from 'jspdf';

interface LeaseData {
  leaseId: string;
  contractNumber: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyType: string;
  surfaceArea: number;
  bedrooms: number;
  bathrooms: number;
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  landlordAddress?: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAddress?: string;
  tenantProfession?: string;
  monthlyRent: number;
  depositAmount: number;
  chargesAmount: number;
  startDate: string;
  endDate: string;
  paymentDay: number;
  customClauses?: string;
  propertyDescription?: string;
  propertyEquipment?: string;
}

export const generateLeasePDF = (leaseData: LeaseData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 6;
  let yPosition = 20;

  const addPageIfNeeded = (spaceNeeded: number = 30) => {
    if (yPosition + spaceNeeded > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  const addLine = (
    text: string | string[],
    options: {
      bold?: boolean;
      size?: number;
      indent?: number;
      spacing?: number;
      align?: 'left' | 'center' | 'right';
    } = {}
  ) => {
    const { bold = false, size = 10, indent = 0, spacing = lineHeight, align = 'left' } = options;

    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');

    const lines = Array.isArray(text) ? text : [text];

    lines.forEach((line) => {
      if (line === '') {
        yPosition += spacing / 2;
        return;
      }

      addPageIfNeeded();

      if (align === 'center') {
        doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
      } else {
        const wrappedLines = doc.splitTextToSize(line, pageWidth - 2 * margin - indent);
        wrappedLines.forEach((wrappedLine: string) => {
          addPageIfNeeded();
          doc.text(wrappedLine, margin + indent, yPosition);
          yPosition += spacing;
        });
        return;
      }
      yPosition += spacing;
    });
  };

  const addSeparator = () => {
    addPageIfNeeded();
    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  };

  doc.setTextColor(0);

  addLine("CONTRAT DE BAIL À USAGE D'HABITATION", {
    bold: true,
    size: 16,
    align: 'center',
    spacing: 8,
  });
  addLine('(Modèle Conforme au Code Civil Ivoirien)', { size: 11, align: 'center', spacing: 8 });

  addSeparator();

  addLine(`Référence du Contrat: ${leaseData.contractNumber}`, {
    bold: true,
    size: 10,
    spacing: 6,
  });
  addLine(`Date d'établissement: ${new Date().toLocaleDateString('fr-FR')}`, {
    size: 10,
    spacing: 10,
  });

  addSeparator();

  addLine('ENTRE LES SOUSSIGNÉS :', { bold: true, size: 12, spacing: 10 });

  addLine('LE BAILLEUR (Propriétaire)', { bold: true, size: 11, spacing: 8 });
  addLine(
    [
      `Nom complet: ${leaseData.landlordName}`,
      `Adresse: ${leaseData.landlordAddress || 'Non spécifiée'}`,
      `Téléphone: ${leaseData.landlordPhone}`,
      `Email: ${leaseData.landlordEmail}`,
      '',
      'Ci-après dénommé « LE BAILLEUR »',
      '',
      "D'UNE PART,",
    ],
    { size: 10 }
  );

  yPosition += 6;
  addLine('ET', { bold: true, size: 11, spacing: 8 });

  addLine('LE PRENEUR (Locataire)', { bold: true, size: 11, spacing: 8 });
  addLine(
    [
      `Nom complet: ${leaseData.tenantName}`,
      `Adresse: ${leaseData.tenantAddress || 'Non spécifiée'}`,
      `Téléphone: ${leaseData.tenantPhone}`,
      `Email: ${leaseData.tenantEmail}`,
      leaseData.tenantProfession ? `Profession: ${leaseData.tenantProfession}` : '',
      '',
      'Ci-après dénommé « LE LOCATAIRE »',
      '',
      "D'AUTRE PART,",
    ].filter((line) => line !== ''),
    { size: 10 }
  );

  yPosition += 6;
  addSeparator();

  addLine('IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :', { bold: true, size: 12, spacing: 10 });

  addSeparator();

  addLine('ARTICLE 1 : OBJET DU CONTRAT', { bold: true, size: 11, spacing: 8 });
  addLine(
    "Le BAILLEUR donne à bail au LOCATAIRE qui accepte, le local à usage d'habitation désigné ci-après, que ce dernier déclare bien connaître pour l'avoir visité avant la signature du présent contrat.",
    { size: 10, spacing: 10 }
  );

  addLine('ARTICLE 2 : DÉSIGNATION DU LOCAL LOUÉ', { bold: true, size: 11, spacing: 8 });
  addLine("Le bien immobilier objet du présent bail est situé à l'adresse suivante :", {
    size: 10,
    spacing: 7,
  });
  addLine(
    [
      `Adresse complète: ${leaseData.propertyAddress}`,
      `Ville/Commune: ${leaseData.propertyCity}`,
      '',
      'Désignation du bien:',
      `- Type de logement: ${leaseData.propertyType}`,
      `- Superficie habitable: ${leaseData.surfaceArea} m²`,
      `- Nombre de chambres: ${leaseData.bedrooms}`,
      `- Nombre de salles de bain: ${leaseData.bathrooms}`,
    ],
    { size: 10 }
  );

  if (leaseData.propertyDescription) {
    yPosition += 4;
    addLine('État et équipements:', { bold: true, size: 10, spacing: 6 });
    addLine(leaseData.propertyDescription, { size: 9, spacing: 7 });
  }

  if (leaseData.propertyEquipment) {
    yPosition += 4;
    addLine('Équipements inclus:', { bold: true, size: 10, spacing: 6 });
    addLine(leaseData.propertyEquipment, { size: 9, spacing: 10 });
  }

  addLine("Le LOCATAIRE déclare avoir visité les lieux et les accepter en l'état.", {
    size: 10,
    spacing: 10,
  });

  addLine('ARTICLE 3 : DURÉE DU BAIL', { bold: true, size: 11, spacing: 8 });
  addLine('Le présent bail est consenti et accepté pour une durée déterminée de :', {
    size: 10,
    spacing: 7,
  });
  addLine(
    [
      `Date de début: ${new Date(leaseData.startDate).toLocaleDateString('fr-FR')}`,
      `Date de fin: ${new Date(leaseData.endDate).toLocaleDateString('fr-FR')}`,
      '',
      'Le bail pourra être renouvelé par accord mutuel des parties, dans les conditions prévues par la législation en vigueur.',
    ],
    { size: 10, spacing: 10 }
  );

  addLine('ARTICLE 4 : LOYER ET CONDITIONS FINANCIÈRES', { bold: true, size: 11, spacing: 8 });

  addLine('4.1 - MONTANT DU LOYER', { bold: true, size: 10, spacing: 7 });
  addLine(
    `Le loyer mensuel est fixé à la somme de: ${leaseData.monthlyRent.toLocaleString('fr-FR')} FRANCS CFA`,
    { size: 10, spacing: 6 }
  );
  addLine(`Ce loyer est payable d'avance, le ${leaseData.paymentDay} de chaque mois.`, {
    size: 10,
    spacing: 8,
  });

  addLine('4.2 - CHARGES', { bold: true, size: 10, spacing: 7 });
  addLine(
    `Les charges mensuelles s'élèvent à: ${leaseData.chargesAmount.toLocaleString('fr-FR')} FRANCS CFA`,
    { size: 10, spacing: 8 }
  );

  addLine('4.3 - DÉPÔT DE GARANTIE', { bold: true, size: 10, spacing: 7 });
  addLine(
    `À la signature du présent bail, le LOCATAIRE verse au BAILLEUR un dépôt de garantie d'un montant de: ${leaseData.depositAmount.toLocaleString('fr-FR')} FRANCS CFA`,
    { size: 10, spacing: 6 }
  );
  addLine(
    'Ce dépôt sera restitué au LOCATAIRE dans un délai maximum de deux (2) mois après son départ, déduction faite, le cas échéant, des sommes restant dues et du coût des réparations locatives mises à sa charge.',
    { size: 10, spacing: 10 }
  );

  addPageIfNeeded(80);

  addLine('ARTICLE 5 : ÉTAT DES LIEUX', { bold: true, size: 11, spacing: 8 });
  addLine(
    'Un état des lieux contradictoire sera établi lors de la remise des clés au LOCATAIRE et lors de leur restitution au BAILLEUR. Cet état des lieux sera annexé au présent contrat et signé par les deux parties.',
    { size: 10, spacing: 10 }
  );

  addLine('ARTICLE 6 : DESTINATION DES LIEUX', { bold: true, size: 11, spacing: 8 });
  addLine(
    "Les lieux loués ne pourront servir qu'à l'usage d'habitation du LOCATAIRE et de sa famille. Toute autre utilisation, notamment commerciale ou professionnelle, est strictement interdite sans l'accord écrit préalable du BAILLEUR.",
    { size: 10, spacing: 10 }
  );

  addLine('ARTICLE 7 : OBLIGATIONS DU BAILLEUR', { bold: true, size: 11, spacing: 8 });
  addLine("Le BAILLEUR s'engage à :", { size: 10, spacing: 6 });
  addLine(
    [
      '1. Délivrer au LOCATAIRE un logement décent ne laissant pas apparaître de risques manifestes',
      '2. Assurer au LOCATAIRE la jouissance paisible du logement pendant toute la durée du bail',
      "3. Entretenir les locaux en état de servir à l'usage prévu par le contrat",
      '4. Effectuer toutes les réparations nécessaires autres que locatives',
      "5. Ne pas s'opposer aux aménagements réalisés par le LOCATAIRE",
    ],
    { size: 9, spacing: 10 }
  );

  addLine('ARTICLE 8 : OBLIGATIONS DU LOCATAIRE', { bold: true, size: 11, spacing: 8 });
  addLine("Le LOCATAIRE s'engage à :", { size: 10, spacing: 6 });
  addLine(
    [
      '1. Payer le loyer et les charges aux échéances convenues',
      '2. User paisiblement des lieux loués suivant la destination qui leur a été donnée',
      '3. Répondre des dégradations et des pertes survenant pendant la durée du contrat',
      "4. Ne pas transformer les lieux loués sans l'accord écrit du BAILLEUR",
      "5. Ne pas sous-louer sans l'autorisation expresse et écrite du BAILLEUR",
      '6. Souscrire une assurance contre les risques locatifs et en justifier',
      "7. Respecter le règlement de copropriété s'il existe",
      "8. Laisser exécuter les travaux d'amélioration ou de réparation urgents",
      '9. Entretenir et maintenir en bon état les équipements',
      '10. Restituer les lieux en bon état à la fin du bail',
    ],
    { size: 9, spacing: 10 }
  );

  addLine('ARTICLE 9 : ASSURANCE', { bold: true, size: 11, spacing: 8 });
  addLine(
    "Le LOCATAIRE doit obligatoirement souscrire une assurance contre les risques locatifs et en justifier au BAILLEUR dès la remise des clés. À défaut d'assurance, le BAILLEUR pourra résilier le bail de plein droit après mise en demeure restée sans effet pendant un délai d'un mois.",
    { size: 10, spacing: 10 }
  );

  addPageIfNeeded(60);

  addLine('ARTICLE 10 : RÉSILIATION DU BAIL', { bold: true, size: 11, spacing: 8 });
  addLine(
    'Le LOCATAIRE peut résilier le bail à tout moment en respectant un préavis de trois (3) mois. Le BAILLEUR peut donner congé au LOCATAIRE en respectant un préavis de six (6) mois dans les conditions prévues par la loi.',
    { size: 10, spacing: 10 }
  );

  if (leaseData.customClauses) {
    addLine('ARTICLE 11 : CLAUSES PARTICULIÈRES', { bold: true, size: 11, spacing: 8 });
    addLine(leaseData.customClauses, { size: 10, spacing: 10 });
  }

  addSeparator();

  addLine('ANNEXES OBLIGATOIRES', { bold: true, size: 11, spacing: 8 });
  addLine(
    [
      "✓ État des lieux d'entrée (contradictoire)",
      "✓ Attestation d'assurance risques locatifs",
      '✓ Règlement de copropriété (le cas échéant)',
      "✓ Notice d'information sur les droits et obligations du locataire",
    ],
    { size: 9, spacing: 10 }
  );

  addSeparator();

  addLine('SIGNATURES ÉLECTRONIQUES', { bold: true, size: 11, spacing: 8 });
  addLine(
    'Le présent contrat est établi en deux (2) exemplaires originaux, dont un pour chaque partie.',
    { size: 10, spacing: 7 }
  );
  addLine(
    'Les parties reconnaissent la valeur juridique de la signature électronique certifiée par ANSUT et horodatée par CryptoNeo, conformément à la législation ivoirienne sur les transactions électroniques.',
    { size: 9, spacing: 10 }
  );

  addLine(
    `Fait électroniquement via la plateforme Mon Toit - ${new Date().toLocaleDateString('fr-FR')}`,
    { size: 10, spacing: 15 }
  );

  // signatureY position stored for potential future use
  addPageIfNeeded(40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LE BAILLEUR', margin, yPosition);
  doc.text('LE LOCATAIRE', pageWidth / 2 + 10, yPosition);

  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(leaseData.landlordName, margin, yPosition);
  doc.text(leaseData.tenantName, pageWidth / 2 + 10, yPosition);

  yPosition += 15;
  doc.text('_______________________', margin, yPosition);
  doc.text('_______________________', pageWidth / 2 + 10, yPosition);

  doc.setFontSize(7);
  doc.setTextColor(100);
  const footerY = pageHeight - 10;
  doc.text(
    'Document certifié par la plateforme Mon Toit - Vérification Mon Toit - Horodatage sécurisé CryptoNeo',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(`Référence: ${leaseData.contractNumber}`, pageWidth / 2, footerY + 4, {
    align: 'center',
  });

  return doc;
};

export const uploadPDFToStorage = async (
  pdf: jsPDF,
  leaseId: string,
  supabaseClient: any
): Promise<string> => {
  const pdfBlob = pdf.output('blob');
  const fileName = `leases/${leaseId}/contract_${Date.now()}.pdf`;

  const { error } = await supabaseClient.storage.from('lease-documents').upload(fileName, pdfBlob, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) throw error;

  const { data: urlData } = supabaseClient.storage.from('lease-documents').getPublicUrl(fileName);

  return urlData.publicUrl;
};
