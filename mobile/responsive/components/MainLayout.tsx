import React from 'react';
import Header from '../features/shared/components/Header';
import MobileMenuDemo from '../mobile/responsive/components/MobileMenuDemo';

/**
 * Layout principal pour les démonstrations
 * Intègre le header avec menu hamburger et le contenu
 */
interface MainLayoutProps {
  children: React.ReactNode;
  showDemo?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  showDemo = false 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec menu hamburger */}
      <Header />
      
      {/* Contenu principal */}
      <main className="flex-1">
        {showDemo ? <MobileMenuDemo /> : children}
      </main>
      
      {/* Footer de base */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">MonToit</h3>
              <p className="text-gray-400">
                Votre plateforme immobilière de confiance.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/" className="hover:text-white transition-colors">Accueil</a></li>
                <li><a href="/recherche" className="hover:text-white transition-colors">Rechercher</a></li>
                <li><a href="/ajouter-bien" className="hover:text-white transition-colors">Publier</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Légal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="/cgu" className="hover:text-white transition-colors">CGU</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MonToit. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;