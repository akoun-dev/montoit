import React from 'react';
import Header from '../features/shared/components/Header';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  PlusCircleIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

/**
 * Page de test pour le menu hamburger mobile
 * Cette page démontre le fonctionnement du menu sur différentes tailles d'écran
 */
const MobileMenuDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec menu hamburger */}
      <Header />
      
      {/* Contenu principal pour la démonstration */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Démonstration Menu Mobile
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Testez le menu hamburger responsive sur différentes tailles d'écran. 
            Réduisez la fenêtre de votre navigateur pour voir le menu mobile en action.
          </p>
        </div>

        {/* Instructions de test */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            🧪 Instructions de Test
          </h2>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="font-medium mr-2">1.</span>
              Redimensionnez votre navigateur en dessous de 768px de largeur
            </li>
            <li className="flex items-start">
              <span className="font-medium mr-2">2.</span>
              Cliquez sur l'icône hamburger (☰) en haut à droite
            </li>
            <li className="flex items-start">
              <span className="font-medium mr-2">3.</span>
              Testez la navigation dans le menu avec le clavier (Tab, Escape)
            </li>
            <li className="flex items-start">
              <span className="font-medium mr-2">4.</span>
              Testez les animations et les interactions tactiles
            </li>
          </ul>
        </div>

        {/* Fonctionnalités testées */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <MagnifyingGlassIcon className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Navigation Responsive</h3>
            <p className="text-gray-600">
              Le menu s'adapte automatiquement aux différentes tailles d'écran
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <HomeIcon className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Animations Fluides</h3>
            <p className="text-gray-600">
              Transitions et animations optimisées pour mobile et desktop
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <PlusCircleIcon className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Accessibilité</h3>
            <p className="text-gray-600">
              Support complet ARIA, navigation clavier et lecteurs d'écran
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <MapPinIcon className="w-8 h-8 text-red-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Touch Optimisé</h3>
            <p className="text-gray-600">
              Targets tactiles de 44px minimum pour une utilisation mobile parfaite
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <CalendarIcon className="w-8 h-8 text-yellow-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gestion d'État</h3>
            <p className="text-gray-600">
              État global avec hook personnalisé pour une gestion centralisée
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <HomeIcon className="w-8 h-8 text-indigo-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Performance</h3>
            <p className="text-gray-600">
              Animations GPU-accélérées et optimisations pour mobile
            </p>
          </div>
        </div>

        {/* Résolution de test */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">📱 Points de rupture testés</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📱</div>
              <div className="font-semibold">Mobile</div>
              <div className="text-sm text-gray-600">&lt; 768px</div>
              <div className="text-xs text-green-600 mt-1">Menu hamburger</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📱</div>
              <div className="font-semibold">Tablet</div>
              <div className="text-sm text-gray-600">769px - 1024px</div>
              <div className="text-xs text-green-600 mt-1">Menu adaptatif</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">💻</div>
              <div className="font-semibold">Desktop</div>
              <div className="text-sm text-gray-600">&gt; 1024px</div>
              <div className="text-xs text-blue-600 mt-1">Navigation desktop</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">🖥️</div>
              <div className="font-semibold">Large</div>
              <div className="text-sm text-gray-600">&gt; 1440px</div>
              <div className="text-xs text-blue-600 mt-1">Navigation complète</div>
            </div>
          </div>
        </div>

        {/* Détails techniques */}
        <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">⚙️ Détails Techniques</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-2">Fonctionnalités Implémentées</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>✅ Hook useMobileMenu avec état global</li>
                <li>✅ Composant MobileMenu avec animations</li>
                <li>✅ Header responsive avec hamburger</li>
                <li>✅ Accessibilité ARIA complète</li>
                <li>✅ Navigation clavier (Tab, Escape)</li>
                <li>✅ Support dark mode</li>
                <li>✅ Optimisations tactiles</li>
                <li>✅ Animations GPU-accélérées</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Tests d'Accessibilité</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>✅ Navigation au clavier</li>
                <li>✅ Lecteurs d'écran</li>
                <li>✅ Focus management</li>
                <li>✅ ARIA labels et roles</li>
                <li>✅ High contrast mode</li>
                <li>✅ Reduced motion support</li>
                <li>✅ Touch targets 44px+</li>
                <li>✅ Screen reader friendly</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Espace de démonstration */}
        <div className="h-96 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <HomeIcon className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg">Contenu principal de la page</p>
            <p className="text-sm">Le menu hamburger ne devrait pas affecter cette zone</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MobileMenuDemo;