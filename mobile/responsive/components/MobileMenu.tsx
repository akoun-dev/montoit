import React, { useRef, useEffect } from 'react';
import { useMobileMenu } from '../hooks/useMobileMenu';
import {
  XMarkIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
  UserIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface MobileMenuProps {
  className?: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ className = '' }) => {
  const { isOpen, isAnimating, closeMenu } = useMobileMenu();
  const menuRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Gestion du focus pour l'accessibilité
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Trappe le focus dans le menu
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      const focusableElements = menuRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  // Éléments de navigation
  const navigationItems = [
    {
      label: 'Accueil',
      href: '/',
      icon: HomeIcon,
      description: 'Retour à la page d\'accueil'
    },
    {
      label: 'Rechercher',
      href: '/recherche',
      icon: MagnifyingGlassIcon,
      description: 'Rechercher des propriétés'
    },
    {
      label: 'Ajouter un bien',
      href: '/ajouter-bien',
      icon: PlusCircleIcon,
      description: 'Publier une propriété'
    },
    {
      label: 'Contact',
      href: '/contact',
      icon: PhoneIcon,
      description: 'Nous contacter'
    },
    {
      label: 'Aide & FAQ',
      href: '/aide',
      icon: QuestionMarkCircleIcon,
      description: 'Questions fréquentes'
    }
  ];

  // Actions utilisateur
  const userActions = [
    {
      label: 'Mon compte',
      href: '/mon-compte',
      icon: UserIcon,
      description: 'Gérer mon profil'
    },
    {
      label: 'Paramètres',
      href: '/parametres',
      icon: Cog6ToothIcon,
      description: 'Configurer mon compte'
    }
  ];

  if (!isOpen && !isAnimating) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      
      {/* Menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isAnimating ? 'pointer-events-none' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        onKeyDown={handleKeyDown}
      >
        {/* En-tête du menu */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 id="mobile-menu-title" className="text-lg font-semibold text-gray-900">
            Menu
          </h2>
          <button
            ref={firstFocusableRef}
            onClick={closeMenu}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Fermer le menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu du menu */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Navigation principale */}
            <nav aria-label="Navigation principale">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="flex items-center p-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 group"
                        onClick={closeMenu}
                        aria-label={item.description}
                      >
                        <IconComponent className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Actions utilisateur */}
            <nav aria-label="Actions utilisateur">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider mb-3">
                Mon compte
              </h3>
              <ul className="space-y-2">
                {userActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <li key={action.label}>
                      <a
                        href={action.href}
                        className="flex items-center p-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 group"
                        onClick={closeMenu}
                        aria-label={action.description}
                      >
                        <IconComponent className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        <div>
                          <div className="font-medium">{action.label}</div>
                          <div className="text-xs text-gray-500">{action.description}</div>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Informations de contact rapide */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider mb-3">
                Contact rapide
              </h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  Besoin d'aide ? Notre équipe est là pour vous.
                </p>
                <a
                  href="tel:+33123456789"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  +33 1 23 45 67 89
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Pied du menu */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © 2025 MonToit - Tous droits réservés
            </p>
            <div className="mt-2 flex justify-center space-x-4">
              <a
                href="/mentions-legales"
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Mentions légales
              </a>
              <a
                href="/confidentialite"
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Confidentialité
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;