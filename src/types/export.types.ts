/**
 * Types pour les services d'export (Dashboard & Analytics)
 */

import jsPDF from 'jspdf';

// =====================================================
// Types pour dashboardExportService
// =====================================================

export interface PropertyExportData {
  title?: string;
  city?: string;
  price?: number;
  status?: string;
  views_count?: number;
  favorites_count?: number;
  created_at: string;
}

export interface ApplicationExportData {
  tenant_name?: string;
  property_title?: string;
  application_score?: number;
  status?: string;
  created_at: string;
}

export interface PaymentExportData {
  created_at: string;
  amount?: number;
  payment_method?: string;
  status?: string;
  reference?: string;
}

export interface OwnerReportStats {
  totalProperties: number;
  activeProperties: number;
  rentedProperties: number;
  totalViews: number;
  pendingApplications: number;
  monthlyRevenue: number;
}

export interface OwnerReportData {
  properties: PropertyExportData[];
  applications: ApplicationExportData[];
  stats: OwnerReportStats;
}

// =====================================================
// Types pour exportService
// =====================================================

// Compatible with jspdf-autotable RowInput
export type TableRowData = (string | number | null)[];

export interface TableData {
  title: string;
  headers: string[];
  rows: TableRowData[];
}

export interface ChartData {
  title: string;
  imageData: string; // base64
}

export interface PDFReportDataExtended {
  title: string;
  subtitle?: string;
  period: { startDate: string; endDate: string };
  summary: Array<{ label: string; value: string | number }>;
  tables?: TableData[];
  charts?: ChartData[];
}

export interface ExcelSheetData {
  name: string;
  data: TableRowData[];
  headers?: string[];
}

export interface ExcelReportDataExtended {
  filename?: string;
  sheets: ExcelSheetData[];
}

// Type pour jsPDF avec autoTable
export interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}
