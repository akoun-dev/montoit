import { AlertTriangle, ArrowLeft, Info, AlertCircle, XCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export default function LogsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs & Erreurs</h1>
            <p className="text-gray-600">Journal des événements et erreurs système</p>
          </div>
        </div>
        <Link to="/admin/tableau-de-bord">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour au Dashboard
          </Button>
        </Link>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Module Logs en Développement</h2>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Cette page affichera les logs système, les erreurs applicatives, les tentatives de
          connexion et les événements de sécurité.
        </p>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Info className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Info</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Warnings</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Erreurs</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <AlertTriangle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Critiques</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
        </div>
      </div>
    </div>
  );
}
