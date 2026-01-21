import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, AlertCircle } from 'lucide-react';

export default function LogsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] flex items-center gap-3">
            <Settings className="h-8 w-8 text-[#F16522]" />${page.replace(/Page$/, '')}
          </h1>
          <p className="text-[#6B5A4E] mt-2">
            Page d'administration en construction. Cette fonctionnalité sera bientôt disponible.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFF5F0] rounded-full mb-6">
            <AlertCircle className="h-10 w-10 text-[#F16522]" />
          </div>
          <h3 className="text-xl font-bold text-[#2C1810] mb-2">En développement</h3>
          <p className="text-[#6B5A4E] max-w-lg mx-auto">
            Cette page est un placeholder. Le contenu et les fonctionnalités de $
            {page.replace(/Page$/, '')} sont en cours de développement. Revenez bientôt pour une
            expérience complète.
          </p>
          <button
            onClick={() => navigate('/admin/tableau-de-bord')}
            className="mt-6 bg-[#F16522] hover:bg-[#d9571d] text-white font-medium py-2 px-6 rounded-xl"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
