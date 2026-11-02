/**
 * Classe pour écrire les sections du PDF de mandat
 */

import jsPDF from 'jspdf';
import { MandateData } from './mandatePdfGenerator';
import {
  getMandateHeaderText,
  getPermissionLabels,
  getMandateArticles,
  formatDate,
  formatCurrency,
} from './mandatePdfTemplates';

export class MandatePdfSectionWriter {
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
    const header = getMandateHeaderText();

    // Bandeau terracotta
    this.doc.setFillColor(255, 108, 47);
    this.doc.rect(0, 0, this.pageWidth, 45, 'F');

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(header.republic, this.pageWidth / 2, 12, { align: 'center' });
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(header.motto, this.pageWidth / 2, 19, { align: 'center' });

    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(header.title, this.pageWidth / 2, 35, { align: 'center' });

    this.yPosition = 55;
    this.doc.setTextColor(0, 0, 0);
  }

  writeParties(data: MandateData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text('ENTRE LES SOUSSIGNÉS :', this.margin, this.yPosition);
    this.yPosition += 10;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(11);
    this.doc.text('LE MANDANT (Propriétaire) :', this.margin, this.yPosition);
    this.yPosition += 6;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(`Nom : ${data.ownerName}`, this.margin + 5, this.yPosition);
    this.yPosition += 5;
    if (data.ownerPhone) {
      this.doc.text(`Téléphone : ${data.ownerPhone}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }
    if (data.ownerEmail) {
      this.doc.text(`Email : ${data.ownerEmail}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }
    this.yPosition += 5;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('ET LE MANDATAIRE (Agence) :', this.margin, this.yPosition);
    this.yPosition += 6;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(`Nom : ${data.agencyName}`, this.margin + 5, this.yPosition);
    this.yPosition += 5;
    if (data.agencyRegistrationNumber) {
      this.doc.text(`N° RCCM : ${data.agencyRegistrationNumber}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }
    if (data.agencyPhone) {
      this.doc.text(`Téléphone : ${data.agencyPhone}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }
    if (data.agencyEmail) {
      this.doc.text(`Email : ${data.agencyEmail}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }
    if (data.agencyAddress) {
      this.doc.text(`Adresse : ${data.agencyAddress}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }
    this.yPosition += 8;

    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeArticle1(data: MandateData): void {
    const articles = getMandateArticles();

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article1.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(articles.article1.intro, this.margin, this.yPosition);
    this.yPosition += 6;

    if (data.mandateScope === 'all_properties') {
      const text = articles.article1.allProperties;
      const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin - 10);
      this.doc.text(lines, this.margin + 5, this.yPosition);
      this.yPosition += lines.length * 5 + 5;
    } else if (data.property) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Bien concerné :', this.margin + 5, this.yPosition);
      this.yPosition += 5;
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`• ${data.property.title}`, this.margin + 10, this.yPosition);
      this.yPosition += 5;
      this.doc.text(
        `  ${data.property.city}${data.property.neighborhood ? ', ' + data.property.neighborhood : ''}`,
        this.margin + 10,
        this.yPosition
      );
      this.yPosition += 5;
      this.doc.text(
        `  Loyer mensuel : ${formatCurrency(data.property.monthlyRent)}`,
        this.margin + 10,
        this.yPosition
      );
      this.yPosition += 8;
    }
    this.yPosition += 5;
  }

  writeArticle2(data: MandateData): void {
    const articles = getMandateArticles();

    this.checkPageBreak(40);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article2.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    if (data.endDate) {
      this.doc.text(articles.article2.definite, this.margin, this.yPosition);
      this.yPosition += 5;
      this.doc.text(
        `Date de début : ${formatDate(data.startDate)}`,
        this.margin + 5,
        this.yPosition
      );
      this.yPosition += 5;
      this.doc.text(`Date de fin : ${formatDate(data.endDate)}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    } else {
      this.doc.text(articles.article2.indefinite, this.margin, this.yPosition);
      this.yPosition += 5;
      this.doc.text(
        `Date de prise d'effet : ${formatDate(data.startDate)}`,
        this.margin + 5,
        this.yPosition
      );
      this.yPosition += 5;
    }

    this.doc.text(articles.article2.renewal, this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeArticle3(data: MandateData): void {
    const articles = getMandateArticles();

    this.checkPageBreak(30);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article3.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(articles.article3.intro, this.margin, this.yPosition);
    this.yPosition += 8;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${data.commissionRate}%`, this.pageWidth / 2, this.yPosition, {
      align: 'center',
    });
    this.yPosition += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(articles.article3.basis, this.margin, this.yPosition);
    this.yPosition += 10;
  }

  writeArticle4(data: MandateData): void {
    const articles = getMandateArticles();
    const permissionLabels = getPermissionLabels();

    this.checkPageBreak(60);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article4.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(articles.article4.intro, this.margin, this.yPosition);
    this.yPosition += 8;

    // Liste des permissions accordées
    const grantedPermissions = Object.entries(data.permissions)
      .filter(([_, granted]) => granted)
      .map(([key]) => permissionLabels[key as keyof typeof permissionLabels]);

    grantedPermissions.forEach((permission, index) => {
      this.checkPageBreak(10);
      this.doc.text(`${index + 1}. ${permission}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    });

    if (grantedPermissions.length === 0) {
      this.doc.text('Aucune permission spécifique accordée.', this.margin + 5, this.yPosition);
      this.yPosition += 5;
    }

    this.yPosition += 5;
  }

  writeArticle5(): void {
    const articles = getMandateArticles();

    this.checkPageBreak(50);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article5.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    articles.article5.obligations.forEach((obligation, index) => {
      this.doc.text(`${index + 1}. ${obligation}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    });
    this.yPosition += 5;
  }

  writeArticle6(): void {
    const articles = getMandateArticles();

    this.checkPageBreak(40);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article6.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    articles.article6.obligations.forEach((obligation, index) => {
      this.doc.text(`${index + 1}. ${obligation}`, this.margin + 5, this.yPosition);
      this.yPosition += 5;
    });
    this.yPosition += 5;
  }

  writeArticle7(): void {
    const articles = getMandateArticles();

    this.checkPageBreak(30);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text(articles.article7.title, this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const lines = this.doc.splitTextToSize(
      articles.article7.content,
      this.pageWidth - 2 * this.margin
    );
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 10;
  }

  writeNotes(notes: string): void {
    this.checkPageBreak(40);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text('NOTES PARTICULIÈRES :', this.margin, this.yPosition);
    this.yPosition += 7;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const lines = this.doc.splitTextToSize(notes, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, this.yPosition);
    this.yPosition += lines.length * 5 + 10;
  }

  writeSignatures(data: MandateData): void {
    this.checkPageBreak(70);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 108, 47);
    this.doc.text('SIGNATURES', this.margin, this.yPosition);
    this.yPosition += 10;

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.text(
      'Le présent mandat est établi en deux exemplaires originaux.',
      this.margin,
      this.yPosition
    );
    this.yPosition += 5;
    this.doc.text(
      `Fait à Abidjan, le ${formatDate(new Date().toISOString())}`,
      this.margin,
      this.yPosition
    );
    this.yPosition += 12;

    const boxWidth = 75;
    const boxHeight = 35;

    // Box mandant
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, this.yPosition, boxWidth, boxHeight);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Le Mandant', this.margin + boxWidth / 2, this.yPosition + 6, {
      align: 'center',
    });
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.ownerName, this.margin + boxWidth / 2, this.yPosition + 12, {
      align: 'center',
    });

    if (data.signedAt) {
      this.doc.setFontSize(8);
      this.doc.setTextColor(0, 128, 0);
      this.doc.text(
        '✓ Signé électroniquement',
        this.margin + boxWidth / 2,
        this.yPosition + boxHeight - 5,
        { align: 'center' }
      );
    }

    // Box mandataire
    this.doc.setTextColor(0, 0, 0);
    this.doc.rect(this.pageWidth - this.margin - boxWidth, this.yPosition, boxWidth, boxHeight);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(
      'Le Mandataire',
      this.pageWidth - this.margin - boxWidth / 2,
      this.yPosition + 6,
      { align: 'center' }
    );
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      data.agencyName,
      this.pageWidth - this.margin - boxWidth / 2,
      this.yPosition + 12,
      { align: 'center' }
    );

    if (data.signedAt) {
      this.doc.setFontSize(8);
      this.doc.setTextColor(0, 128, 0);
      this.doc.text(
        '✓ Signé électroniquement',
        this.pageWidth - this.margin - boxWidth / 2,
        this.yPosition + boxHeight - 5,
        { align: 'center' }
      );
    }

    this.yPosition += boxHeight + 10;
  }

  writeFooter(mandateId: string): void {
    this.doc.setFontSize(8);
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(`Mandat ID: ${mandateId}`, this.pageWidth / 2, this.pageHeight - 12, {
      align: 'center',
    });
    this.doc.text(
      'Document généré par Mon Toit - Plateforme certifiée ANSUT',
      this.pageWidth / 2,
      this.pageHeight - 7,
      { align: 'center' }
    );
  }
}
