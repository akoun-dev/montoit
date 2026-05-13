import { Home, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 relative">
          <div className="text-9xl font-bold text-orange-100 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <Home className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Page introuvable
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>

          <Link
            to="/search"
            className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-lg border-2 border-orange-600 hover:bg-orange-50 transition-colors font-medium"
          >
            <Search className="w-5 h-5" />
            Rechercher un logement
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              Besoin d'aide?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Contactez notre support
            </p>
            <Link
              to="/contact"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Nous contacter →
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              Propriétés récentes
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Découvrez nos dernières offres
            </p>
            <Link
              to="/search?sort=recent"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Voir les nouveautés →
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              Mon compte
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Accédez à votre espace
            </p>
            <Link
              to="/auth"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Se connecter →
            </Link>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Si vous pensez qu'il s'agit d'une erreur, veuillez{' '}
            <Link to="/contact" className="text-orange-600 hover:underline">
              nous signaler le problème
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
