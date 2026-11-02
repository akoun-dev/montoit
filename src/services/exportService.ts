/**
 * Service d'Export
 * Gère l'export des rapports analytics en PDF et Excel
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { logger } from '@/shared/lib/logger';
import type { TableRowData, JsPDFWithAutoTable } from '@/types/export.types';

// =====================================================
// Export PDF
// =====================================================

export interface PDFReportData {
  title: string;
  subtitle?: string;
  period: { startDate: string; endDate: string };
  summary: Array<{ label: string; value: string | number }>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: TableRowData[];
  }>;
  charts?: Array<{
    title: string;
    imageData: string; // base64
  }>;
}

export function exportToPDF(data: PDFReportData, filename: string = 'rapport.pdf'): void {
  const doc = new jsPDF();

  // Configuration couleurs MONTOIT
  const primaryColor: [number, number, number] = [255, 108, 47]; // #FF6C2F
  const secondaryColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];

  let yPosition = 20;

  // En-tête
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text(data.title, 105, yPosition, { align: 'center' });

  yPosition += 10;

  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text(data.subtitle, 105, yPosition, { align: 'center' });
    yPosition += 8;
  }

  // Période
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const periodText = `Période: ${formatDate(data.period.startDate)} - ${formatDate(data.period.endDate)}`;
  doc.text(periodText, 105, yPosition, { align: 'center' });

  yPosition += 15;

  // Résumé (KPIs)
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Résumé', 20, yPosition);

  yPosition += 8;

  // Grille de KPIs
  const kpisPerRow = 2;
  const kpiWidth = 85;
  const kpiHeight = 25;
  const kpiSpacing = 10;

  data.summary.forEach((kpi, index) => {
    const row = Math.floor(index / kpisPerRow);
    const col = index % kpisPerRow;

    const x = 20 + col * (kpiWidth + kpiSpacing);
    const y = yPosition + row * (kpiHeight + 5);

    // Box KPI
    doc.setFillColor(...lightGray);
    doc.rect(x, y, kpiWidth, kpiHeight, 'F');

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(kpi.label, x + 5, y + 8);

    doc.setFontSize(16);
    doc.setTextColor(...secondaryColor);
    doc.text(String(kpi.value), x + 5, y + 18);
  });

  yPosition += Math.ceil(data.summary.length / kpisPerRow) * (kpiHeight + 5) + 15;

  // Tables
  if (data.tables && data.tables.length > 0) {
    data.tables.forEach((table, _index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text(table.title, 20, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [table.headers],
        body: table.rows,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: lightGray,
        },
        margin: { left: 20, right: 20 },
      });

      yPosition = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
    });
  }

  // Charts (images)
  if (data.charts && data.charts.length > 0) {
    data.charts.forEach((chart) => {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text(chart.title, 20, yPosition);
      yPosition += 5;

      try {
        doc.addImage(chart.imageData, 'PNG', 20, yPosition, 170, 100);
        yPosition += 110;
      } catch (error) {
        logger.warn('Failed to add chart image to PDF', {
          chartTitle: chart.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  // Pied de page
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`MONTOIT - Rapport généré le ${formatDate(new Date().toISOString())}`, 105, 285, {
      align: 'center',
    });
    doc.text(`Page ${i} / ${pageCount}`, 185, 285);
  }

  // Télécharger
  doc.save(filename);
}

// =====================================================
// Export Excel
// =====================================================

export interface ExcelReportData {
  filename?: string;
  sheets: Array<{
    name: string;
    data: TableRowData[];
    headers?: string[];
  }>;
}

export function exportToExcel(data: ExcelReportData): void {
  const workbook = XLSX.utils.book_new();

  data.sheets.forEach((sheet) => {
    // Préparer les données avec headers
    const wsData = sheet.headers ? [sheet.headers, ...sheet.data] : sheet.data;

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Styling (largeur des colonnes)
    const colWidths = sheet.headers
      ? sheet.headers.map((header) => ({
          wch: Math.max(header.length, 15),
        }))
      : [];

    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  // Télécharger
  XLSX.writeFile(workbook, data.filename || 'rapport.xlsx');
}

// =====================================================
// Export CSV
// =====================================================

export function exportToCSV(
  data: TableRowData[],
  headers: string[],
  filename: string = 'export.csv'
): void {
  const csvData = [headers, ...data];
  const worksheet = XLSX.utils.aoa_to_sheet(csvData);
  const csvString = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// =====================================================
// Utilitaires
// =====================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF', // Franc CFA
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// =====================================================
// Conversion de Canvas à Image (pour charts)
// =====================================================

export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Capture un élément DOM en image
 */
export async function captureElementAsImage(element: HTMLElement): Promise<string> {
  // Trouver le canvas dans l'élément (pour Recharts)
  const canvas = element.querySelector('canvas');

  if (canvas) {
    return canvasToBase64(canvas);
  }

  // Fallback: utiliser html2canvas si disponible
  logger.warn('No canvas found in element, image capture may not work', {
    elementId: element.id,
    elementClass: element.className,
  });
  return '';
}
