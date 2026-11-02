import jsPDF from 'jspdf';
import { ContractData } from './contractPdfGenerator';
import {
  getObligationsLocataire,
  getObligationsBailleur,
  getArticle1Text,
  getArticle2Text,
  getArticle4Text,
} from './contractTemplates';

export class PdfSectionWriter {
  constructor(
    private doc: jsPDF,
    private pageWidth: number,
    private pageHeight: number,
    private margin: number,
    private yPosition: number
  ) {}

  getYPosition(): number {
    return this.yPosition;
  }

  setYPosition(y: number): void {
    this.yPosition = y;
  }

  checkPageBreak(neededSpace: number = 40): void {
    if (this.yPosition > this.pageHeight - neededSpace) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }
  }

  writeHeader(): void {
    this.doc.setFillColor(245, 242, 235);
    this.doc.rect(0, 0, this.pageWidth, 40, 'F');

    this.doc.setTextColor(78, 70, 55);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text("RÉPUBLIQUE DE CÔTE D'IVOIRE", this.pageWidth / 2, 15, { align: 'center' });
    this.doc.text('Union - Discipline - Travail', this.pageWidth / 2, 22, { align: 'center' });

    this.doc.setFontSize(18);
    this.doc.text("CONTRAT DE BAIL D'HABITATION", this.pageWidth / 2, 35, { align: 'center' });

    this.yPosition = 55;
    this.doc.setDrawColor(78, 70, 55);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeParties(data: ContractData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ENTRE LES SOUSSIGNÉS :', this.margin, this.yPosition);
    this.yPosition += 8;

    this.doc.setFontSize(10);
    this.doc.text('LE BAILLEUR :', this.margin, this.yPosition);
    this.yPosition += 6;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Nom: ${data.landlordName}`, this.margin + 5, this.yPosition);
    this.yPosition += 5;
    this.doc.text(`Téléphone: ${data.landlordPhone}`, this.margin + 5, this.yPosition);
    this.yPosition += 5;
    this.doc.text(`Email: ${data.landlordEmail}`, this.margin + 5, this.yPosition);
    this.yPosition += 8;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ET LE LOCATAIRE :', this.margin, this.yPosition);
    this.yPosition += 6;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Nom: ${data.tenantName}`, this.margin + 5, this.yPosition);
    this.yPosition += 5;
    this.doc.text(`Téléphone: ${data.tenantPhone}`, this.margin + 5, this.yPosition);
    this.yPosition += 5;
    this.doc.text(`Email: ${data.tenantEmail}`, this.margin + 5, this.yPosition);
    this.yPosition += 10;

    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeArticle1(data: ContractData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 1 : OBJET DU CONTRAT', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const text = getArticle1Text(data.propertyAddress, data.propertyCity);
    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 5;

    this.doc.text(`Désignation: ${data.propertyTitle}`, this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeArticle2(data: ContractData): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 2 : DURÉE DU BAIL', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    const article2 = getArticle2Text(data.startDate, data.endDate);
    this.doc.text(article2.duration, this.margin, this.yPosition);
    this.yPosition += 5;
    this.doc.text(article2.startDate, this.margin, this.yPosition);
    this.yPosition += 5;
    this.doc.text(article2.endDate, this.margin, this.yPosition);
    this.yPosition += 5;
    this.doc.text(article2.renewal, this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeArticle3(data: ContractData): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 3 : LOYER ET CHARGES', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      `Loyer mensuel: ${data.monthlyRent.toLocaleString('fr-FR')} FCFA`,
      this.margin,
      this.yPosition
    );
    this.yPosition += 5;
    this.doc.text(
      `Charges mensuelles: ${data.chargesAmount.toLocaleString('fr-FR')} FCFA`,
      this.margin,
      this.yPosition
    );
    this.yPosition += 5;
    this.doc.text(
      `Total mensuel: ${(data.monthlyRent + data.chargesAmount).toLocaleString('fr-FR')} FCFA`,
      this.margin,
      this.yPosition
    );
    this.yPosition += 5;
    this.doc.text(
      `Le loyer est payable le ${data.paymentDay} de chaque mois par virement bancaire ou mobile money.`,
      this.margin,
      this.yPosition
    );
    this.yPosition += 10;
  }

  writeArticle4(data: ContractData): void {
    this.checkPageBreak();
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 4 : DÉPÔT DE GARANTIE', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      `Montant du dépôt de garantie: ${data.depositAmount.toLocaleString('fr-FR')} FCFA`,
      this.margin,
      this.yPosition
    );
    this.yPosition += 5;

    const text = getArticle4Text();
    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 10;
  }

  writeArticle5(): void {
    this.checkPageBreak(40);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 5 : OBLIGATIONS DU LOCATAIRE', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    getObligationsLocataire().forEach((obligation, index) => {
      this.doc.text(`${index + 1}. ${obligation}`, this.margin + 5, this.yPosition);
      this.yPosition += 6;
    });
    this.yPosition += 5;
  }

  writeArticle6(): void {
    this.checkPageBreak(30);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 6 : OBLIGATIONS DU BAILLEUR', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    getObligationsBailleur().forEach((obligation, index) => {
      this.doc.text(`${index + 1}. ${obligation}`, this.margin + 5, this.yPosition);
      this.yPosition += 6;
    });
    this.yPosition += 10;
  }

  writeArticle7(customClauses: string): void {
    this.checkPageBreak(50);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ARTICLE 7 : CLAUSES PARTICULIÈRES', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(customClauses, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 10;
  }

  writeSignatures(): void {
    this.checkPageBreak(60);

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SIGNATURES ÉLECTRONIQUES', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      'Le présent contrat est signé électroniquement conformément à la réglementation en vigueur',
      this.margin,
      this.yPosition
    );
    this.yPosition += 5;
    this.doc.text(
      "en République de Côte d'Ivoire sur la plateforme Mon Toit certifiée ANSUT.",
      this.margin,
      this.yPosition
    );
    this.yPosition += 10;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, this.margin, this.yPosition);
    this.yPosition += 8;

    const boxWidth = 80;
    const boxHeight = 30;

    this.doc.setDrawColor(150, 150, 150);
    this.doc.setLineWidth(0.3);

    this.doc.rect(this.margin, this.yPosition, boxWidth, boxHeight);
    this.doc.text(
      'Signature du Bailleur',
      this.margin + boxWidth / 2,
      this.yPosition + boxHeight / 2,
      {
        align: 'center',
      }
    );

    this.doc.rect(this.pageWidth - this.margin - boxWidth, this.yPosition, boxWidth, boxHeight);
    this.doc.text(
      'Signature du Locataire',
      this.pageWidth - this.margin - boxWidth / 2,
      this.yPosition + boxHeight / 2,
      {
        align: 'center',
      }
    );
  }

  writeFooter(leaseId: string): void {
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(`Contrat ID: ${leaseId}`, this.pageWidth / 2, this.pageHeight - 10, {
      align: 'center',
    });
    this.doc.text(
      'Généré par Mon Toit - Plateforme certifiée ANSUT',
      this.pageWidth / 2,
      this.pageHeight - 6,
      { align: 'center' }
    );
  }
}
