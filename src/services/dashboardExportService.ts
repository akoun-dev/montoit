/**
 * Service d'export pour les dashboards
 * Gère l'export CSV et PDF des données propriétaires
 */

import jsPDF from 'jspdf';
import type {
  PropertyExportData,
  ApplicationExportData,
  PaymentExportData,
  OwnerReportData,
} from '@/types/export.types';

interface DashboardData {
  title: string;
  generatedAt: string;
  stats: Array<{ label: string; value: string | number }>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>;
}

export const dashboardExportService = {
  exportToCSV(data: { headers: string[]; rows: string[][] }, filename: string = 'export.csv') {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToPDF(data: DashboardData, filename: string = 'rapport.pdf') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    doc.setFillColor(78, 70, 55);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, pageWidth / 2, 25, { align: 'center' });

    yPosition = 50;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le ${data.generatedAt}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setTextColor(78, 70, 55);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques Globales', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    data.stats.forEach((stat) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${stat.label}:`, margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(String(stat.value), margin + 80, yPosition);
      yPosition += 7;
    });

    yPosition += 10;

    if (data.tables && data.tables.length > 0) {
      data.tables.forEach((table) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(table.title, margin, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const colWidth = (pageWidth - 2 * margin) / table.headers.length;

        table.headers.forEach((header, index) => {
          doc.text(header, margin + index * colWidth, yPosition);
        });
        yPosition += 6;

        doc.setFont('helvetica', 'normal');
        table.rows.forEach((row) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = margin;
          }

          row.forEach((cell, index) => {
            const text = doc.splitTextToSize(cell, colWidth - 5);
            doc.text(text, margin + index * colWidth, yPosition);
          });
          yPosition += 6;
        });

        yPosition += 10;
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Mon Toit - Plateforme certifiée ANSUT', pageWidth / 2, 285, { align: 'center' });

    doc.save(filename);
  },

  exportPropertiesReport(properties: PropertyExportData[]) {
    const headers = ['Titre', 'Ville', 'Prix', 'Statut', 'Vues', 'Favoris', 'Date'];
    const rows = properties.map((p) => [
      p.title || '',
      p.city || '',
      `${p.price?.toLocaleString('fr-FR') || 0} FCFA`,
      p.status || '',
      String(p.views_count || 0),
      String(p.favorites_count || 0),
      new Date(p.created_at).toLocaleDateString('fr-FR'),
    ]);

    this.exportToCSV({ headers, rows }, 'proprietes.csv');
  },

  exportApplicationsReport(applications: ApplicationExportData[]) {
    const headers = ['Locataire', 'Propriété', 'Score', 'Statut', 'Date'];
    const rows = applications.map((app) => [
      app.tenant_name || 'N/A',
      app.property_title || 'N/A',
      String(app.application_score || 0),
      app.status || '',
      new Date(app.created_at).toLocaleDateString('fr-FR'),
    ]);

    this.exportToCSV({ headers, rows }, 'candidatures.csv');
  },

  exportPaymentsReport(payments: PaymentExportData[]) {
    const headers = ['Date', 'Montant', 'Méthode', 'Statut', 'Référence'];
    const rows = payments.map((p) => [
      new Date(p.created_at).toLocaleDateString('fr-FR'),
      `${p.amount?.toLocaleString('fr-FR') || 0} FCFA`,
      p.payment_method || '',
      p.status || '',
      p.reference || '',
    ]);

    this.exportToCSV({ headers, rows }, 'paiements.csv');
  },

  generateOwnerReport(data: OwnerReportData) {
    const reportData: DashboardData = {
      title: 'Rapport Propriétaire - Mon Toit',
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      stats: [
        { label: 'Propriétés totales', value: data.stats.totalProperties },
        { label: 'Propriétés actives', value: data.stats.activeProperties },
        { label: 'Propriétés louées', value: data.stats.rentedProperties },
        { label: 'Vues totales', value: data.stats.totalViews },
        { label: 'Candidatures en attente', value: data.stats.pendingApplications },
        {
          label: 'Revenu mensuel',
          value: `${data.stats.monthlyRevenue.toLocaleString('fr-FR')} FCFA`,
        },
      ],
      tables: [
        {
          title: 'Mes Propriétés',
          headers: ['Titre', 'Ville', 'Prix', 'Statut'],
          rows: data.properties.map((p) => [
            p.title || '',
            p.city || '',
            `${p.price?.toLocaleString('fr-FR') || 0} FCFA`,
            p.status || '',
          ]),
        },
      ],
    };

    this.exportToPDF(reportData, 'rapport-proprietaire.pdf');
  },
};
