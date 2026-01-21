import { Activity, ArrowLeft, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export default function ServiceMonitoringPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Monitoring</h1>
            <p className="text-gray-600">État des services et APIs externes</p>
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
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Activity className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Module Monitoring en Développement
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Cette page affichera l'état en temps réel des services : Brevo, InTouch, Mapbox, Supabase,
          et autres intégrations.
        </p>

        {/* Preview Services */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Opérationnels</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Dégradés</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Hors ligne</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Latence moy.</p>
            <p className="text-lg font-bold text-gray-400">-- ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
