/**
 * Exemple d'utilisation pratique du menu hamburger mobile
 * Ce fichier montre comment intégrer le menu dans une application React
 */

import React from 'react';
import Header from '../src/features/shared/components/Header';
import { useMobileMenu } from '../src/features/shared/hooks/useMobileMenu';

// Exemple 1: Utilisation simple avec le Header
export function SimpleUsage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-4">Mon Application</h1>
        <p>Contenu principal de l'application...</p>
      </main>
    </div>
  );
}

// Exemple 2: Utilisation avec hooks personnalisés
export function CustomUsage() {
  const { isOpen, toggleMenu, closeMenu } = useMobileMenu();

  return (
    <div className="min-h-screen">
      {/* Header avec menu */}
      <Header />
      
      {/* Bouton personnalisé pour trigger le menu */}
      <button 
        onClick={toggleMenu}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30"
      >
        {isOpen ? 'Fermer' : 'Ouvrir'} Menu
      </button>
      
      {/* Contenu qui change selon l'état du menu */}
      <main className={`transition-opacity duration-300 ${isOpen ? 'opacity-50' : 'opacity-100'}`}>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Application Custom</h1>
          <p>État du menu: {isOpen ? 'Ouvert' : 'Fermé'}</p>
        </div>
      </main>
    </div>
  );
}

// Exemple 3: Layout avec sidebar conditionnel
export function ConditionalLayout() {
  const { isOpen } = useMobileMenu();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:block w-64 bg-gray-100 p-4">
        <nav className="space-y-2">
          <a href="/" className="block p-2 rounded hover:bg-gray-200">Accueil</a>
          <a href="/recherche" className="block p-2 rounded hover:bg-gray-200">Recherche</a>
          <a href="/ajouter" className="block p-2 rounded hover:bg-gray-200">Ajouter</a>
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1">
        <Header />
        <main className={`p-8 transition-all duration-300 ${isOpen ? 'ml-0' : ''}`}>
          <h1 className="text-3xl font-bold mb-4">Layout Conditionnel</h1>
          <p>Ce layout s'adapte automatiquement à la taille d'écran.</p>
        </main>
      </div>
    </div>
  );
}

// Exemple 4: Page avec gestion d'état complexe
export function ComplexPage() {
  const { isOpen, openMenu, closeMenu } = useMobileMenu();
  const [user, setUser] = React.useState(null);

  // Auto-close menu on navigation (simulation)
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        closeMenu();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, closeMenu]);

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Header avec user info */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <h2>Bienvenue {user?.name || 'Utilisateur'}</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Connecté</span>
          <button 
            onClick={openMenu}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Contenu principal avec état du menu */}
      <main className={`p-8 transition-all duration-300 ${
        isOpen ? 'pointer-events-none select-none' : ''
      }`}>
        <div className={`transition-all duration-300 ${
          isOpen ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
        }`}>
          <h1 className="text-2xl font-bold mb-4">Page Complexe</h1>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Statistiques</h3>
              <p>Menu {isOpen ? 'ouvert' : 'fermé'}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Actions</h3>
              <button 
                onClick={toggleMenu}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Toggle Menu
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Overlay indicators */}
      {isOpen && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-10 pointer-events-none z-20" />
      )}
    </div>
  );
}

// Exemple 5: Integration avec routing
export function AppWithRouting() {
  const [currentPage, setCurrentPage] = React.useState('home');
  const { isOpen } = useMobileMenu();

  const navigationItems = [
    { id: 'home', label: 'Accueil', href: '/' },
    { id: 'search', label: 'Recherche', href: '/recherche' },
    { id: 'add', label: 'Ajouter', href: '/ajouter' },
    { id: 'contact', label: 'Contact', href: '/contact' }
  ];

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    // Le menu se fermera automatiquement via useMobileMenu
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className={`transition-all duration-300 ${isOpen ? 'hidden' : 'block'}`}>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">
            {navigationItems.find(item => item.id === currentPage)?.label || 'Accueil'}
          </h1>
          
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="mb-4">Page actuelle: <strong>{currentPage}</strong></p>
            <div className="space-y-2">
              {navigationItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`block w-full text-left p-3 rounded transition-colors ${
                    currentPage === item.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Exemple 6: Test de performance
export function PerformanceTest() {
  const { isOpen, toggleMenu } = useMobileMenu();
  const [metrics, setMetrics] = React.useState({});

  React.useEffect(() => {
    if (isOpen) {
      // Mesure performance
      const start = performance.now();
      
      setTimeout(() => {
        const end = performance.now();
        setMetrics(prev => ({
          ...prev,
          openTime: end - start
        }));
      }, 0);
    }
  }, [isOpen]);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">Test de Performance</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Métriques</h3>
            <p>État: {isOpen ? 'Ouvert' : 'Fermé'}</p>
            <p>Temps d'ouverture: {metrics.openTime?.toFixed(2) || 'N/A'}ms</p>
            
            <button 
              onClick={toggleMenu}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Toggle pour mesurer
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Informations</h3>
            <ul className="space-y-2 text-sm">
              <li>• Animations GPU-accélérées</li>
              <li>• 60fps garantis</li>
              <li>• Event listeners optimisés</li>
              <li>• Memory leaks préventifs</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

// Exemple par défaut à exporter
export default function MenuExamples() {
  const [example, setExample] = React.useState('simple');

  const examples = {
    simple: SimpleUsage,
    custom: CustomUsage,
    conditional: ConditionalLayout,
    complex: ComplexPage,
    routing: AppWithRouting,
    performance: PerformanceTest
  };

  const ExampleComponent = examples[example];

  return (
    <div>
      {/* Sélecteur d'exemple */}
      <div className="fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-semibold mb-2">Exemples</h3>
        <select 
          value={example}
          onChange={(e) => setExample(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="simple">Usage Simple</option>
          <option value="custom">Usage Custom</option>
          <option value="conditional">Layout Conditionnel</option>
          <option value="complex">Page Complexe</option>
          <option value="routing">Avec Routing</option>
          <option value="performance">Test Performance</option>
        </select>
      </div>

      {/* Composant actif */}
      <ExampleComponent />
    </div>
  );
}