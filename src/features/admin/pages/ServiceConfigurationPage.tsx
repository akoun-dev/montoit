import { Settings, ArrowLeft, ToggleLeft, Database, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export default function ServiceConfigurationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Configuration</h1>
            <p className="text-gray-600">Paramètres système et configuration générale</p>
          </div>
        </div>
        <Link to="/admin/tableau-de-bord">
          <Button variant="outline" className="gap-2">
            Retour au Dashboard
          </Button>
        </Link>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Module Configuration en Développement
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Cette page permettra de configurer les paramètres système : fonctionnalités, limites,
          maintenance, et options avancées.
        </p>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <ToggleLeft className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Feature Flags</p>
            <p className="text-xs text-gray-400 mt-1">Activer/Désactiver</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Base de données</p>
            <p className="text-xs text-gray-400 mt-1">Maintenance</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Globe className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Localisation</p>
            <p className="text-xs text-gray-400 mt-1">Langue, devise</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Lock className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Sécurité</p>
            <p className="text-xs text-gray-400 mt-1">Politiques</p>
          </div>
        </div>
      </div>
    </div>
  );
}
