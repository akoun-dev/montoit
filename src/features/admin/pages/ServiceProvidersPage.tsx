import { TrendingUp, ArrowLeft, MessageSquare, CreditCard, Map, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export default function ServiceProvidersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Providers</h1>
            <p className="text-gray-600">Configuration des fournisseurs externes</p>
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
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <TrendingUp className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Module Providers en Développement
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Cette page permettra de configurer les fournisseurs de services : SMS/WhatsApp, paiements,
          cartes, signature électronique.
        </p>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">SMS/WhatsApp</p>
            <p className="text-xs text-gray-400 mt-1">Brevo, InTouch</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <CreditCard className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Paiements</p>
            <p className="text-xs text-gray-400 mt-1">InTouch, Wave</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Map className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Cartographie</p>
            <p className="text-xs text-gray-400 mt-1">Mapbox</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Shield className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Signature</p>
            <p className="text-xs text-gray-400 mt-1">CryptoNeo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
