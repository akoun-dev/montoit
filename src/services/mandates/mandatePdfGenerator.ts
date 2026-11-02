/**
 * Générateur de PDF pour les mandats de gestion immobilière
 */

import jsPDF from 'jspdf';
import { MandatePdfSectionWriter } from './MandatePdfSectionWriter';
import { MandatePermissions, MandateScope } from '@/hooks/useAgencyMandates';

export interface MandateData {
  mandateId: string;
  mandateScope: MandateScope;

  // Propriétaire
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;

  // Agence
  agencyName: string;
  agencyRegistrationNumber?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyAddress?: string;

  // Bien (optionnel si all_properties)
  property?: {
    title: string;
    city: string;
    neighborhood?: string;
    monthlyRent: number;
  };

  // Conditions
  startDate: string;
  endDate?: string;
  commissionRate: number;
  permissions: MandatePermissions;
  notes?: string;
  signedAt?: string;
}

export class MandatePdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 20;
  private writer: MandatePdfSectionWriter;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    this.writer = new MandatePdfSectionWriter(
      this.doc,
      this.pageWidth,
      this.pageHeight,
      this.margin,
      this.margin
    );
  }

  generate(data: MandateData): Blob {
    this.writer.writeHeader();
    this.writer.writeParties(data);
    this.writer.writeArticle1(data);
    this.writer.writeArticle2(data);
    this.writer.writeArticle3(data);
    this.writer.writeArticle4(data);
    this.writer.writeArticle5();
    this.writer.writeArticle6();
    this.writer.writeArticle7();

    if (data.notes) {
      this.writer.writeNotes(data.notes);
    }

    this.writer.writeSignatures(data);
    this.writer.writeFooter(data.mandateId);

    return this.doc.output('blob');
  }
}

// Fonctions utilitaires pour générer et télécharger
export async function generateMandatePDF(data: MandateData): Promise<Blob> {
  const generator = new MandatePdfGenerator();
  return generator.generate(data);
}

export async function downloadMandatePDF(
  data: MandateData,
  filename: string = 'mandat-gestion.pdf'
): Promise<void> {
  const pdfBlob = await generateMandatePDF(data);

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
