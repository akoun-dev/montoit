import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface LeaseContractData {
  contractNumber: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyType: string;
  surfaceArea: number;
  bedrooms: number;
  bathrooms: number;
  propertyDescription?: string;
  propertyEquipment?: string;
  // Bailleur
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  landlordAddress?: string;
  landlordIdNumber?: string; // CNI/RCCM
  // Locataire
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAddress?: string;
  tenantProfession?: string;
  tenantIdNumber?: string; // CNI/RCCM
  // Financial
  monthlyRent: number;
  depositAmount: number;
  chargesAmount: number;
  advanceRent?: number;
  startDate: string;
  endDate: string;
  duration?: string;
  paymentDay: number;
  contractCity?: string;
  contractDate?: string;
  customClauses?: string;
  // Options
  coproprieteChargesLocataire?: boolean;
  coproprieteChargesBailleur?: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const formatDate = (dateStr: string): string => {
  return format(new Date(dateStr), 'dd MMMM yyyy', { locale: fr });
};

const getPropertyComposition = (data: LeaseContractData): string[] => {
  const composition: string[] = [];
  if (data.bedrooms > 0) composition.push(`${data.bedrooms} chambre${data.bedrooms > 1 ? 's' : ''}`);
  if (data.bathrooms > 0) composition.push(`${data.bathrooms} salle${data.bathrooms > 1 ? 's' : ''} de bain`);
  composition.push('1 salon', '1 cuisine équipée');
  return composition;
};

const getPropertyDetails = (data: LeaseContractData): string => {
  const parts = [data.propertyAddress, data.propertyCity].filter(Boolean);
  return parts.join(', ');
};

function numberToFrench(amount: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  if (amount >= 1000000) {
    const millions = Math.floor(amount / 1000000);
    return `${millions > 1 ? numberToFrench(millions) + ' millions' : 'un million'} Francs CFA`;
  } else if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    let result = thousands === 1 ? 'mille' : `${numberToFrench(thousands)} mille`;
    if (remainder > 0) result += ` ${numberToFrench(remainder)}`;
    return result + ' Francs CFA';
  } else if (amount >= 100) {
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;
    let result = hundreds === 1 ? 'cent' : `${numberToFrench(hundreds)} cent`;
    if (remainder > 0) result += ` ${numberToFrench(remainder)}`;
    return result + ' Francs CFA';
  } else if (amount >= 20) {
    const ten = Math.floor(amount / 10);
    const unit = amount % 10;
    if (unit === 0) return `${tens[ten]} Francs CFA`;
    if (unit === 1 && ten !== 7 && ten !== 9) return `${tens[ten]} et un Francs CFA`;
    return `${tens[ten]}-${units[unit]} Francs CFA`;
  } else {
    return `${units[amount] || amount} Francs CFA`;
  }
}

export const generateLeaseContractHTML = (data: LeaseContractData): string => {
  const contractCity = data.contractCity || 'Abidjan';
  const contractDate = data.contractDate || formatDate(new Date());
  const composition = getPropertyComposition(data);
  const propertyDetails = getPropertyDetails(data);
  const totalInitialPayment = data.depositAmount + (data.advanceRent || data.monthlyRent);
  const depositMonths = data.depositAmount / data.monthlyRent;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CONTRAT DE BAIL À USAGE D'HABITATION</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Georgia', 'Times New Roman', Times, serif;
            line-height: 1.5;
            color: #1a1a1a;
            font-size: 11pt;
            background: #fff;
        }

        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 0 5mm;
        }

        /* En-tête républicain */
        .header {
            text-align: center;
            margin-bottom: 8mm;
            padding-bottom: 5mm;
            border-bottom: 2px solid #2c3e50;
        }

        .header-republic {
            font-size: 9pt;
            color: #2c3e50;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 2mm;
        }

        .header-motto {
            font-size: 8pt;
            color: #7f8c8d;
            font-style: italic;
            margin-bottom: 4mm;
        }

        h1 {
            text-align: center;
            font-size: 15pt;
            font-weight: bold;
            text-decoration: underline;
            text-decoration-color: #2c3e50;
            margin-bottom: 6mm;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        h2 {
            font-size: 11pt;
            margin-top: 6mm;
            margin-bottom: 3mm;
            font-weight: bold;
            color: #2c3e50;
            text-decoration: underline;
            text-decoration-color: #bdc3c7;
            text-underline-offset: 2px;
        }

        .section-title {
            text-align: center;
            font-weight: bold;
            font-size: 11pt;
            margin: 5mm 0;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Sections parties */
        .party-box {
            margin-bottom: 5mm;
            padding: 4mm;
            background: #f8f9fa;
            border-left: 3px solid #2c3e50;
            page-break-inside: avoid;
        }

        .party-title {
            font-weight: bold;
            font-size: 11pt;
            color: #2c3e50;
            margin-bottom: 2mm;
        }

        .party-box p {
            margin: 1mm 0;
            font-size: 10pt;
        }

        .party-label {
            font-weight: bold;
            color: #34495e;
        }

        .separator {
            text-align: center;
            font-weight: bold;
            margin: 4mm 0;
            color: #2c3e50;
            font-size: 10pt;
        }

        /* Sections articles */
        .article {
            margin-bottom: 4mm;
            text-align: justify;
            page-break-inside: avoid;
        }

        .article p {
            margin: 1.5mm 0;
            text-indent: 0;
        }

        .article p:first-child {
            text-indent: 0;
        }

        .highlight-box {
            background: #fffef0;
            padding: 3mm;
            border-left: 3px solid #f39c12;
            margin: 2mm 0;
        }

        .amount {
            font-weight: bold;
            color: #27ae60;
            font-size: 10.5pt;
        }

        .amount-underline {
            font-weight: bold;
            color: #27ae60;
            text-decoration: underline;
            text-decoration-style: dotted;
        }

        ul, ol {
            margin: 2mm 0 2mm 6mm;
            padding: 0;
        }

        li {
            margin: 1mm 0;
            text-align: justify;
        }

        /* Tableaux */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 3mm 0;
        }

        td {
            padding: 2mm 3mm;
            vertical-align: middle;
        }

        .checkbox {
            width: 6mm;
            height: 6mm;
            border: 1px solid #2c3e50;
            display: inline-block;
            margin-right: 2mm;
            text-align: center;
            line-height: 6mm;
            font-weight: bold;
        }

        /* Signatures */
        .signature-section {
            margin-top: 10mm;
            page-break-inside: avoid;
        }

        .signature-container {
            display: flex;
            justify-content: space-between;
            gap: 10mm;
            margin-top: 5mm;
        }

        .signature-block {
            flex: 1;
            text-align: center;
        }

        .signature-title {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 3mm;
            color: #2c3e50;
        }

        .signature-name {
            margin-top: 1mm;
            font-size: 10pt;
            color: #34495e;
        }

        .signature-line {
            border-top: 1px solid #2c3e50;
            width: 100%;
            margin-top: 2mm;
            height: 8mm;
        }

        .signature-date {
            font-size: 9pt;
            color: #7f8c8d;
            margin-top: 1mm;
        }

        /* Reçu */
        .receipt {
            margin-top: 10mm;
            padding: 5mm;
            border: 2px solid #2c3e50;
            page-break-inside: avoid;
        }

        .receipt-title {
            text-align: center;
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 3mm;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .receipt-content {
            margin-top: 3mm;
        }

        .receipt-amounts li {
            margin: 2mm 0;
            font-size: 10.5pt;
        }

        .receipt-total {
            margin-top: 3mm;
            padding: 3mm;
            background: #f8f9fa;
            text-align: center;
            font-weight: bold;
            font-size: 11pt;
            color: #27ae60;
        }

        .receipt-signature {
            margin-top: 5mm;
            text-align: center;
        }

        /* Footer */
        .footer {
            margin-top: 8mm;
            padding-top: 3mm;
            border-top: 1px solid #bdc3c7;
            text-align: center;
            font-size: 8pt;
            color: #95a5a6;
        }

        .footer p {
            margin: 0.5mm 0;
        }

        /* Utilitaires */
        .center {
            text-align: center;
        }

        .bold {
            font-weight: bold;
        }

        .underline {
            text-decoration: underline;
        }

        .note {
            font-style: italic;
            color: #7f8c8d;
            font-size: 9pt;
        }

        /* Saut de page */
        .page-break {
            page-break-before: always;
        }

        @media print {
            body {
                font-size: 11pt;
            }
            .receipt {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="header-republic">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
            <div class="header-motto">Union - Discipline - Travail</div>
        </div>

        <h1>CONTRAT DE BAIL À USAGE D'HABITATION</h1>

        <div class="section-title">ENTRE LES SOUSSIGNÉS :</div>

        <!-- Bailleur -->
        <div class="party-box">
            <div class="party-title">LE BAILLEUR :</div>
            <p><span class="party-label">Madame, Monsieur :</span> ${data.landlordName}</p>
            ${data.landlordIdNumber ? `<p><span class="party-label">Titulaire de la CNI/RCCM n° :</span> ${data.landlordIdNumber}</p>` : '<p><span class="party-label">Titulaire de la CNI/RCCM n° :</span> _________________________________</p>'}
            ${data.landlordAddress ? `<p><span class="party-label">Demeurant à :</span> ${data.landlordAddress}</p>` : '<p><span class="party-label">Demeurant à :</span> _________________________________________________</p>'}
            <p><span class="party-label">Téléphone :</span> ${data.landlordPhone}</p>
            <p><span class="party-label">Email :</span> ${data.landlordEmail}</p>
            <p style="margin-top: 2mm;"><em>Ci-après dénommé(e) « LE BAILLEUR »</em></p>
        </div>

        <div class="separator">D'UNE PART,</div>

        <!-- Locataire -->
        <div class="party-box">
            <div class="party-title">LE LOCATAIRE :</div>
            <p><span class="party-label">Madame, Monsieur :</span> ${data.tenantName}</p>
            ${data.tenantIdNumber ? `<p><span class="party-label">Titulaire de la CNI/RCCM n° :</span> ${data.tenantIdNumber}</p>` : '<p><span class="party-label">Titulaire de la CNI/RCCM n° :</span> _________________________________</p>'}
            ${data.tenantAddress ? `<p><span class="party-label">Demeurant à :</span> ${data.tenantAddress}</p>` : '<p><span class="party-label">Demeurant à :</span> _________________________________________________</p>'}
            <p><span class="party-label">Téléphone :</span> ${data.tenantPhone}</p>
            <p><span class="party-label">Email :</span> ${data.tenantEmail}</p>
            ${data.tenantProfession ? `<p><span class="party-label">Profession :</span> ${data.tenantProfession}</p>` : ''}
            <p style="margin-top: 2mm;"><em>Ci-après dénommé(e) « LE LOCATAIRE »</em></p>
        </div>

        <div class="separator">D'AUTRE PART,</div>

        <div class="section-title">IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :</div>

        <!-- Article 1 -->
        <div class="article">
            <h2>ARTICLE 1<span style="text-decoration: none;"> : </span>OBJET ET DURÉE DU CONTRAT</h2>
            <p>Le présent contrat de bail a pour objet la location d'un(e) <strong>${data.propertyType}</strong> sis à <strong>${propertyDetails}</strong>.</p>
            <p style="margin-top: 2mm;"><strong>Description du bien :</strong></p>
            <ul>
                <li>Surface habitable : <strong>${data.surfaceArea} m²</strong></li>
                ${composition.map(item => `<li>${item}</li>`).join('')}
                ${data.propertyDescription ? `<li>Description : ${data.propertyDescription}</li>` : ''}
                ${data.propertyEquipment ? `<li>Équipements : ${data.propertyEquipment}</li>` : ''}
            </ul>
            <p style="margin-top: 2mm;">La durée du bail est fixée à <strong>${data.duration || '_________________________'}</strong> et prend effet à compter du <strong>${formatDate(data.startDate)}</strong>.</p>
        </div>

        <!-- Article 2 -->
        <div class="article">
            <h2>ARTICLE 2<span style="text-decoration: none;"> : </span>LOYER ET MODE DE PAIEMENT</h2>
            <p>Le loyer mensuel est fixé à la somme de <span class="amount">${formatCurrency(data.monthlyRent)}</span> (<strong>${numberToFrench(data.monthlyRent)}</strong>).</p>
            <p style="margin-top: 2mm;">Le paiement s'effectue <strong>par mois d'avance</strong>, au plus tard le <strong>0${String(data.paymentDay).padStart(2, '0')}</strong> de chaque mois, par :</p>
            <ul>
                <li>Virement bancaire</li>
                <li>Mobile Money</li>
                <li>Espèces contre quittance</li>
            </ul>
            <p style="margin-top: 2mm;" class="note">Le bailleur délivrera une quittance après chaque paiement.</p>
        </div>

        <!-- Article 3 -->
        <div class="article">
            <h2>ARTICLE 3<span style="text-decoration: none;"> : </span>DÉPÔT DE GARANTIE</h2>
            <p>À la signature du présent contrat, le LOCATAIRE verse au BAILLEUR un dépôt de garantie d'un montant de <span class="amount">${formatCurrency(data.depositAmount)}</span> (<strong>${numberToFrench(data.depositAmount)}</strong>), soit <strong>${depositMonths} mois de loyer</strong>.</p>
            <div class="highlight-box" style="margin-top: 2mm;">
                <p><strong>Conditions de restitution :</strong></p>
                <p style="font-size: 9pt;">Ce dépôt n'est pas productif d'intérêts et sera restitué au LOCATAIRE dans un délai maximal d'un (1) mois après la remise des clés, déduction faite des sommes restant dues et du coût des réparations locatives mises à sa charge.</p>
            </div>
            <p style="margin-top: 2mm; font-size: 9pt;" class="note">Conformément à la loi n°2019-576, le dépôt de garantie ne peut excéder deux (2) mois de loyer.</p>
        </div>

        <!-- Article 4 -->
        <div class="article">
            <h2>ARTICLE 4<span style="text-decoration: none;"> : </span>LOYERS D'AVANCE</h2>
            <p>Le LOCATAIRE s'engage à verser à la signature du présent contrat la somme de <span class="amount">${formatCurrency(data.advanceRent || data.monthlyRent)}</span> (<strong>${numberToFrench(data.advanceRent || data.monthlyRent)}</strong>) représentant le(s) loyer(s) d'avance.</p>
        </div>

        <!-- Article 5 -->
        <div class="article">
            <h2>ARTICLE 5<span style="text-decoration: none;"> : </span>CHARGES LOCATIVES</h2>
            <p>Les charges locatives (eau, électricité, entretien des parties communes, etc.) sont à la charge exclusive du LOCATAIRE pour un montant mensuel forfaitaire de <span class="amount">${formatCurrency(data.chargesAmount)}</span>.</p>
            <p style="margin-top: 2mm;">L'impôt foncier et les grosses réparations restent à la charge du BAILLEUR.</p>
        </div>

        <!-- Article 6 -->
        <div class="article">
            <h2>ARTICLE 6<span style="text-decoration: none;"> : </span>OBLIGATIONS DU BAILLEUR</h2>
            <p>Le BAILLEUR s'engage à :</p>
            <ol type="a" style="list-style-type: lower-alpha;">
                <li>Livrer au LOCATAIRE un logement décent, en bon état d'habitabilité et sans risque pour la santé et la sécurité des occupants ;</li>
                <li>Assurer les grosses réparations (toiture, murs porteurs, canalisations principales, etc.) ;</li>
                <li>Garantir au LOCATAIRE la jouissance paisible et exclusive des lieux pendant toute la durée du bail ;</li>
                <li>Délivrer une quittance de loyer après chaque paiement sans frais ;</li>
                <li>Faire assurer les parties communes et la toiture par une assurance multirisque.</li>
            </ol>
        </div>

        <!-- Article 7 -->
        <div class="article">
            <h2>ARTICLE 7<span style="text-decoration: none;"> : </span>OBLIGATIONS DU LOCATAIRE</h2>
            <p>Le LOCATAIRE s'engage à :</p>
            <ol type="a" style="list-style-type: lower-alpha;">
                <li>Payer le loyer et les charges aux échéances convenues sans retard ;</li>
                <li>User paisiblement des lieux loués conformément à leur destination d'habitation ;</li>
                <li>Entretenir et maintenir les lieux en bon état de propreté et d'entretien ;</li>
                <li>Répondre des dégradations et pertes survenues pendant la durée du contrat ;</li>
                <li>Ne pas transformer les lieux loués sans l'accord écrit préalable du BAILLEUR ;</li>
                <li>Ne pas sous-louer sans l'autorisation expresse et écrite du BAILLEUR ;</li>
                <li>Souscrire une assurance habitation (risques locatifs) et en justifier lors de la remise des clés ;</li>
                <li>Permettre au BAILLEUR d'effectuer les réparations nécessaires et les visites de relocation ;</li>
                <li>Remettre les clés au BAILLEUR à l'expiration du bail dans les conditions prévues.</li>
            </ol>
        </div>

        <!-- Article 8 -->
        <div class="article">
            <h2>ARTICLE 8<span style="text-decoration: none;"> : </span>ÉTAT DES LIEUX</h2>
            <p>Un état des lieux contradictoire et écrit sera établi :</p>
            <ul>
                <li>À l'entrée du LOCATAIRE dans les lieux ;</li>
                <li>À la sortie du LOCATAIRE des lieux.</li>
            </ul>
            <p style="margin-top: 2mm;">Le LOCATAIRE s'engage à restituer les lieux dans le même état de propreté, de peinture et d'entretien qu'à son entrée, usure normale exceptée.</p>
        </div>

        <!-- Article 9 -->
        <div class="article">
            <h2>ARTICLE 9<span style="text-decoration: none;"> : </span>RÉSILIATION DU BAIL</h2>
            <p>Le présent bail peut être résilié dans les conditions suivantes :</p>
            <ol type="a" style="list-style-type: lower-alpha;">
                <li><strong>Par le LOCATAIRE :</strong> moyennant un préavis de trois (3) mois notifié par écrit au BAILLEUR ;</li>
                <li><strong>Par le BAILLEUR :</strong> en cas de besoin personnel ou pour un membre de sa famille jusqu'au troisième degré, moyennant un congé de trois (3) mois ;</li>
                <li><strong>De plein droit :</strong> en cas de non-respect par le LOCATAIRE de ses obligations contractuelles ;</li>
                <li><strong>Pour motif grave :</strong> en cas de dégradations graves, non-payment de loyer, ou tout autre motif légitime dûment établi.</li>
            </ol>
            <div class="highlight-box" style="margin-top: 2mm;">
                <p class="note"><strong>Note :</strong> Le simple transfert de propriété ne constitue pas un motif de résiliation du bail en cours. Le nouveau propriétaire est tenu de respecter les clauses du présent contrat.</p>
            </div>
        </div>

        <!-- Article 10 -->
        <div class="article">
            <h2>ARTICLE 10<span style="text-decoration: none;"> : </span>DÉFAUT DE PAIEMENT</h2>
            <p>En cas de défaut de paiement du loyer pendant deux (2) mois consécutifs, le BAILLEUR pourra, après mise en demeure restée sans effet pendant quinze (15) jours, demander en justice l'expulsion du LOCATAIRE et le paiement des arriérés.</p>
        </div>

        <!-- Article 11 -->
        <div class="article">
            <h2>ARTICLE 11<span style="text-decoration: none;"> : </span>DÉGRADATIONS</h2>
            <p>Le LOCATAIRE est responsable des dégradations qu'il cause aux lieux loués, que ce soit personnellement ou par les personnes qu'il héberge ou reçoit.</p>
            <p style="margin-top: 2mm;">En cas de dégradations graves compromettant la conservation du bien, le BAILLEUR pourra demander en justice la résiliation du bail et des dommages-intérêts.</p>
        </div>

        <!-- Article 12 -->
        <div class="article">
            <h2>ARTICLE 12<span style="text-decoration: none;"> : </span>DÉCÈS DU LOCATAIRE</h2>
            <p>En cas de décès du LOCATAIRE, le présent bail est poursuivi auprès :</p>
            <ol type="a" style="list-style-type: lower-alpha;">
                <li>Du conjoint ou du concubin survivant ;</li>
                <li>À défaut, des ascendants ou descendants du LOCATAIRE qui occupaient effectivement les lieux avec lui à la date du décès et qui s'engagent par écrit à payer les loyers dus.</li>
            </ol>
        </div>

        <!-- Article 13 -->
        <div class="article">
            <h2>ARTICLE 13<span style="text-decoration: none;"> : </span>TACITE RECONDUCTION</h2>
            <p>À défaut de notification de non-renouvellement par l'une ou l'autre des parties trois (3) mois avant l'expiration du bail, le présent contrat est reconduit tacitement pour une durée égale.</p>
            <p style="margin-top: 2mm;">La tacite reconduction ne joue pas en cas de :</p>
            <ol type="a" style="list-style-type: lower-alpha;">
                <li>Besoin personnel du BAILLEUR ou d'un membre de sa famille jusqu'au troisième degré ;</li>
                <li>Non-respect par le LOCATAIRE de ses obligations contractuelles ;</li>
                <li>Motif grave et légitime dûment établi par le BAILLEUR.</li>
            </ol>
        </div>

        <!-- Article 14 -->
        <div class="article">
            <h2>ARTICLE 14<span style="text-decoration: none;"> : </span>DROIT DE PRÉEMPTION</h2>
            <p>En cas de vente du logement loué, le LOCATAIRE bénéficie d'un droit de préemption (droit de préférence pour l'achat du bien).</p>
            <p style="margin-top: 2mm;">Le BAILLEUR doit notifier au LOCATAIRE son intention de vendre et les conditions de la vente par lettre recommandée avec accusé de réception.</p>
            <p style="margin-top: 2mm;">Le LOCATAIRE dispose d'un délai de :</p>
            <ul>
                <li>Sept (7) jours pour faire une contre-proposition ;</li>
                <li>Un (1) mois pour payer le prix convenu à compter de l'acceptation.</li>
            </ul>
            <p style="margin-top: 2mm;" class="note">Le droit de préemption ne joue pas en cas de vente aux enchères publiques ou de vente à un membre de la famille du BAILLEUR jusqu'au troisième degré.</p>
        </div>

        <!-- Article 15 -->
        <div class="article">
            <h2>ARTICLE 15<span style="text-decoration: none;"> : </span>RÉVISION DU LOYER</h2>
            <p>Le loyer peut être révisé tous les trois (3) ans au maximum à la demande du BAILLEUR.</p>
            <p style="margin-top: 2mm;">La demande de révision doit être notifiée par écrit au LOCATAIRE trois (3) mois avant la date d'effet souhaitée.</p>
        </div>

        <!-- Article 16 -->
        <div class="article">
            <h2>ARTICLE 16<span style="text-decoration: none;"> : </span>ENREGISTREMENT FISCAL</h2>
            <p>Le présent bail doit être enregistré auprès de l'administration fiscale dans un délai de trente (30) jours à compter de sa signature.</p>
            <p style="margin-top: 2mm;">Les frais d'enregistrement sont à la charge du BAILLEUR qui s'engage à remettre au LOCATAIRE une copie du bail enregistré dans le même délai.</p>
        </div>

        <!-- Article 17 -->
        <div class="article">
            <h2>ARTICLE 17<span style="text-decoration: none;"> : </span>LOI APPLICABLE</h2>
            <p>Le présent contrat est régi par la <strong>loi n°2019-576 du 26 juin 2019</strong> portant Code de la Construction et de l'Habitat en République de Côte d'Ivoire.</p>
            <p style="margin-top: 2mm;">Toute clause contraire à cette loi est réputée non écrite.</p>
        </div>

        <!-- Article 18 -->
        <div class="article">
            <h2>ARTICLE 18<span style="text-decoration: none;"> : </span>LITIGES</h2>
            <p>Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis aux juridictions compétentes du lieu de situation de l'immeuble loué.</p>
        </div>

        <!-- Article 19 -->
        <div class="article">
            <h2>ARTICLE 19<span style="text-decoration: none;"> : </span>FORMALITÉS DE SIGNATURE</h2>
            <p>Le présent contrat est établi en deux (2) exemplaires originaux, dont un pour chaque partie.</p>
            <p style="margin-top: 2mm;">Fait à <strong>${contractCity}</strong>, le <strong>${contractDate}</strong>.</p>
        </div>

        <!-- Article 20 -->
        ${data.customClauses ? `
        <div class="article">
            <h2>ARTICLE 20<span style="text-decoration: none;"> : </span>CLAUSES PARTICULIÈRES</h2>
            <div class="highlight-box">
                <p>${data.customClauses}</p>
            </div>
        </div>
        ` : `
        <div class="article">
            <h2>ARTICLE 20<span style="text-decoration: none;"> : </span>CHARGES DE COPROPRIÉTÉ</h2>
            <table>
                <tr>
                    <td style="width: 8mm;">
                        <span class="checkbox">${data.coproprieteChargesLocataire ? '☑' : '☐'}</span>
                    </td>
                    <td>Les charges de copropriété sont à la charge du LOCATAIRE</td>
                </tr>
                <tr>
                    <td style="width: 8mm;">
                        <span class="checkbox">${data.coproprieteChargesBailleur ? '☑' : '☐'}</span>
                    </td>
                    <td>Les charges de copropriété sont à la charge du BAILLEUR</td>
                </tr>
            </table>
        </div>
        `}

        <!-- Signatures -->
        <div class="signature-section">
            <h2>ARTICLE 21<span style="text-decoration: none;"> : </span>SIGNATURES</h2>
            <p class="center" style="margin-bottom: 3mm;">Les parties déclarent avoir lu et approuvé l'ensemble des clauses du présent contrat et en reconnaissent la valeur juridique.</p>

            <div class="signature-container">
                <div class="signature-block">
                    <div class="signature-title">LE BAILLEUR</div>
                    <div class="signature-name">${data.landlordName}</div>
                    <div class="signature-line"></div>
                    <div class="signature-date">Signature électronique certifiée</div>
                </div>

                <div class="signature-block">
                    <div class="signature-title">LE LOCATAIRE</div>
                    <div class="signature-name">${data.tenantName}</div>
                    <div class="signature-line"></div>
                    <div class="signature-date">Signature électronique certifiée</div>
                </div>
            </div>
        </div>

        <!-- Reçu -->
        <div class="receipt">
            <div class="receipt-title">REÇU DE PAIEMENT</div>
            <div class="receipt-content">
                <p style="text-align: justify; margin-bottom: 3mm;">
                    Je soussigné(e), <strong>${data.landlordName}</strong>, agissant en qualité de BAILLEUR, reconnais avoir reçu de <strong>${data.tenantName}</strong>, agissant en qualité de LOCATAIRE, les sommes suivantes à l'occasion de la signature du présent contrat de bail :
                </p>

                <ul class="receipt-amounts">
                    <li>✓ Dépôt de garantie : <span class="amount">${formatCurrency(data.depositAmount)}</span> (${numberToFrench(data.depositAmount)})</li>
                    <li>✓ Loyer(s) d'avance : <span class="amount">${formatCurrency(data.advanceRent || data.monthlyRent)}</span> (${numberToFrench(data.advanceRent || data.monthlyRent)})</li>
                </ul>

                <div class="receipt-total">
                    TOTAL REÇU : ${formatCurrency(totalInitialPayment)} (${numberToFrench(totalInitialPayment)})
                </div>

                <p style="text-align: center; margin-top: 3mm;">
                    Fait à <strong>${contractCity}</strong>, le <strong>${contractDate}</strong>
                </p>

                <div class="receipt-signature">
                    <div class="signature-name" style="font-weight: bold;">${data.landlordName}</div>
                    <div class="signature-line" style="width: 60%; margin: 2mm auto;"></div>
                    <div class="signature-date">Signature du BAILLEUR</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Document généré via la plateforme Mon Toit</strong></p>
            <p>Référence du contrat : ${data.contractNumber}</p>
            <p>Signature électronique certifiée ANSUT - Horodatage sécurisé CryptoNeo</p>
            <p style="margin-top: 1mm; font-size: 7pt;">Conforme à la loi n°2019-576 du 26 juin 2019 portant Code de la Construction et de l'Habitat en Côte d'Ivoire</p>
        </div>
    </div>
</body>
</html>`;
};

export const generateLeaseContractPDF = async (data: LeaseContractData): Promise<Blob> => {
  const htmlContent = generateLeaseContractHTML(data);

  const opt = {
    margin: [12, 12, 12, 12] as [number, number, number, number],
    filename: `contrat_bail_${data.contractNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      before: '.page-break',
      avoid: '.party-box, .article, .signature-section, .receipt'
    }
  };

  return await html2pdf().set(opt).from(htmlContent).output('blob');
};

export const downloadLeaseContractPDF = async (data: LeaseContractData, filename?: string): Promise<void> => {
  const htmlContent = generateLeaseContractHTML(data);

  const opt = {
    margin: [12, 12, 12, 12] as [number, number, number, number],
    filename: filename || `contrat_bail_${data.contractNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      before: '.page-break',
      avoid: '.party-box, .article, .signature-section, .receipt'
    }
  };

  await html2pdf().set(opt).from(htmlContent).save();
};

export const previewLeaseContractHTML = (data: LeaseContractData): string => {
  return generateLeaseContractHTML(data);
};
