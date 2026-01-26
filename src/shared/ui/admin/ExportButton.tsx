/**
 * ExportButton - Bouton d'export avec menu déroulant
 */

import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { ExportFormat } from '@/types/admin';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  disabled?: boolean;
  formats?: ExportFormat[];
  className?: string;
}

const formatOptions = [
  { value: 'csv' as ExportFormat, label: 'CSV', icon: FileSpreadsheet, description: 'Compatible Excel' },
  { value: 'excel' as ExportFormat, label: 'Excel', icon: FileSpreadsheet, description: 'Format .xlsx natif' },
  { value: 'pdf' as ExportFormat, label: 'PDF', icon: FileText, description: 'Document imprimable' },
];

export function ExportButton({
  onExport,
  loading = false,
  disabled = false,
  formats = ['csv', 'excel', 'pdf'],
  className = '',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const availableFormats = formatOptions.filter((format) => formats.includes(format.value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: ExportFormat) => {
    setIsOpen(false);
    onExport(format);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`
          flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE9] text-[#6B5A4E] rounded-xl
          hover:border-[#F16522] hover:text-[#F16522] transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label="Exporter"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#F16522] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Exporter</span>
        {!loading && (
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#EFEBE9] shadow-lg z-50 overflow-hidden">
          <div className="p-1">
            {availableFormats.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.value}
                  onClick={() => handleExport(format.value)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FAF7F4] transition-colors text-left"
                >
                  <div className="p-1.5 bg-[#FAF7F4] rounded-lg">
                    <Icon className="w-4 h-4 text-[#6B5A4E]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C1810]">{format.label}</p>
                    <p className="text-xs text-[#6B5A4E]/70">{format.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
