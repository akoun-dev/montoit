import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Home } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

export default function AccessDenied({
  message = "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
  showHomeButton = true,
  showBackButton = true,
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-[32px] shadow-lg shadow-[#2C1810]/5 border border-[#EFEBE9]">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#2C1810] mb-3">Accès refusé</h1>

        {/* Message */}
        <p className="text-[#6B5A4E] mb-8 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#EFEBE9] text-[#2C1810] font-medium hover:bg-[#FAF7F4] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          )}

          {showHomeButton && (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F16522] text-white font-medium hover:bg-[#D55A1E] transition-colors"
            >
              <Home className="w-4 h-4" />
              Accueil
            </Link>
          )}
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-[#8B7A6E]">
          Si vous pensez qu'il s'agit d'une erreur, veuillez{' '}
          <Link to="/contact" className="text-[#F16522] hover:underline">
            nous contacter
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
