import jsPDF from 'jspdf';
import { PdfSectionWriter } from './pdfSections';

export interface ContractData {
  leaseId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  monthlyRent: number;
  depositAmount: number;
  chargesAmount: number;
  startDate: string;
  endDate: string;
  paymentDay: number;
  customClauses?: string;
}

export class ContractPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 20;
  private writer: PdfSectionWriter;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    this.writer = new PdfSectionWriter(
      this.doc,
      this.pageWidth,
      this.pageHeight,
      this.margin,
      this.margin
    );
  }

  generate(data: ContractData): Blob {
    this.writer.writeHeader();
    this.writer.writeParties(data);
    this.writer.writeArticle1(data);
    this.writer.writeArticle2(data);
    this.writer.writeArticle3(data);
    this.writer.writeArticle4(data);
    this.writer.writeArticle5();
    this.writer.writeArticle6();

    if (data.customClauses) {
      this.writer.writeArticle7(data.customClauses);
    }

    this.writer.writeSignatures();
    this.writer.writeFooter(data.leaseId);

    return this.doc.output('blob');
  }
}
