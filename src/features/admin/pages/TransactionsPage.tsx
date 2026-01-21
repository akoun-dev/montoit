import { FileText, ArrowLeft, CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600">Suivi des paiements et transactions financières</p>
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
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Module Transactions en Développement
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Cette page affichera l'historique des paiements, les remboursements, les commissions et
          les rapports financiers.
        </p>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Réussies</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">En attente</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Échouées</p>
            <p className="text-lg font-bold text-gray-400">--</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <CreditCard className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Volume</p>
            <p className="text-lg font-bold text-gray-400">-- FCFA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
