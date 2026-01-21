import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';

interface DashboardExportButtonProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  label?: string;
}

export default function DashboardExportButton({
  onExportPDF,
  onExportCSV,
  label = 'Exporter',
}: DashboardExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn-secondary flex items-center space-x-2"
      >
        <Download className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-20">
            <button
              onClick={() => {
                onExportPDF();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-2 rounded-t-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span className="font-medium">Exporter en PDF</span>
            </button>
            <button
              onClick={() => {
                onExportCSV();
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-2 rounded-b-xl transition-colors border-t"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="font-medium">Exporter en CSV</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
