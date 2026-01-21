/**
 * Breadcrumb Component (Fil d'Ariane)
 * Mon Toit - Amélioration Navigation Cognitive
 *
 * Objectif: Améliorer la navigation et réduire la charge cognitive
 * - Montrer où l'utilisateur se trouve dans la hiérarchie
 * - Permettre de remonter facilement
 * - Améliorer le SEO avec structured data
 * - Responsive mobile
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  autoGenerate?: boolean;
  homeLabel?: string;
  separator?: React.ReactNode;
  className?: string;
}

/**
 * Mapping des routes vers des labels lisibles
 */
const ROUTE_LABELS: Record<string, string> = {
  // Pages principales
  '/': 'Accueil',
  '/rechercher': 'Rechercher',
  '/recherche': 'Recherche',
  '/publier': 'Publier une annonce',
  '/ajouter-propriete': 'Ajouter une propriété',
  '/messages': 'Messages',
  '/messagerie': 'Messagerie',
  '/profil': 'Mon Profil',
  '/compte': 'Mon Compte',

  // Authentification
  '/connexion': 'Connexion',
  '/inscription': 'Inscription',
  '/verification-otp': 'Vérification',
  '/mot-de-passe-oublie': 'Mot de passe oublié',

  // Propriétés
  '/proprietes': 'Propriétés',
  '/propriete': 'Détail de la propriété',
  '/mes-proprietes': 'Mes Propriétés',

  // Propriétaire
  '/proprietaire': 'Espace Propriétaire',
  '/proprietaire/dashboard': 'Tableau de bord',
  '/proprietaire/mes-proprietes': 'Mes Propriétés',
  '/proprietaire/candidatures': 'Candidatures',
  '/proprietaire/contrats': 'Contrats',

  // Locataire
  '/locataire': 'Espace Locataire',
  '/locataire/dashboard': 'Tableau de bord',
  '/locataire/score': 'Mon Score',
  '/locataire/candidatures': 'Mes Candidatures',
  '/locataire/contrats': 'Mes Contrats',
  '/locataire/favoris': 'Mes Favoris',

  // Candidatures
  '/candidature': 'Candidature',
  '/candidatures': 'Candidatures',
  '/mes-candidatures': 'Mes Candidatures',

  // Visites
  '/visiter': 'Planifier une visite',
  '/visites': 'Mes Visites',
  '/mes-visites': 'Mes Visites',

  // Contrats
  '/contrats': 'Contrats',
  '/contrat': 'Contrat',
  '/mes-contrats': 'Mes Contrats',
  '/signer-bail': 'Signer le bail',

  // Paiements
  '/paiements': 'Paiements',
  '/paiement': 'Effectuer un paiement',
  '/mes-paiements': 'Mes Paiements',

  // Vérification
  '/verification': "Vérification d'identité",
  '/verification-identite': "Vérification d'identité",

  // Support
  '/aide': 'Aide',
  '/faq': 'FAQ',
  '/contact': 'Contact',
  '/support': 'Support',

  // Légal
  '/mentions-legales': 'Mentions Légales',
  '/confidentialite': 'Confidentialité',
  '/cgu': 'Conditions Générales',

  // Admin
  '/admin': 'Administration',
  '/admin/dashboard': 'Tableau de bord Admin',
  '/admin/utilisateurs': 'Utilisateurs',
  '/admin/proprietes': 'Propriétés',
  '/admin/moderation': 'Modération',
};

/**
 * Génère automatiquement les breadcrumbs à partir de l'URL
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';

  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Essayer de trouver un label personnalisé
    let label = ROUTE_LABELS[currentPath];

    // Si pas de label, utiliser le segment avec première lettre en majuscule
    if (!label) {
      // Remplacer les tirets par des espaces
      label = segment
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        // Première lettre en majuscule
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    // Le dernier élément n'a pas de lien (page actuelle)
    const isLast = index === paths.length - 1;

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
};

/**
 * Composant Breadcrumb
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  autoGenerate = true,
  homeLabel = 'Accueil',
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />,
  className = '',
}) => {
  const location = useLocation();

  // Générer automatiquement les breadcrumbs si non fournis
  const breadcrumbItems = items || (autoGenerate ? generateBreadcrumbs(location.pathname) : []);

  // Ne rien afficher sur la page d'accueil
  if (location.pathname === '/' && !items) {
    return null;
  }

  // Ne rien afficher si pas d'items
  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Fil d'Ariane" className={`breadcrumb ${className}`}>
      <ol
        className="flex items-center flex-wrap gap-2 text-sm"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {/* Lien Accueil */}
        <li
          className="flex items-center"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <Link
            to="/"
            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
            itemProp="item"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline" itemProp="name">
              {homeLabel}
            </span>
            <meta itemProp="position" content="1" />
          </Link>
        </li>

        {/* Séparateur après Accueil */}
        {breadcrumbItems.length > 0 && <li aria-hidden="true">{separator}</li>}

        {/* Items du breadcrumb */}
        {breadcrumbItems.map((item, index) => {
          const position = index + 2; // +2 car Accueil est position 1
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <React.Fragment key={index}>
              <li
                className="flex items-center"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.label}</span>
                    <meta itemProp="position" content={position.toString()} />
                  </Link>
                ) : (
                  <span
                    className="text-gray-900 font-medium"
                    itemProp="name"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                    <meta itemProp="position" content={position.toString()} />
                  </span>
                )}
              </li>

              {/* Séparateur (sauf pour le dernier) */}
              {!isLast && <li aria-hidden="true">{separator}</li>}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * Hook pour définir des breadcrumbs personnalisés
 */
export const useBreadcrumbs = (items: BreadcrumbItem[]) => {
  return items;
};

/**
 * Composant Breadcrumb Compact (pour mobile)
 */
export const BreadcrumbCompact: React.FC<BreadcrumbProps> = (props) => {
  const location = useLocation();
  const breadcrumbItems = props.items || generateBreadcrumbs(location.pathname);

  if (breadcrumbItems.length === 0 || location.pathname === '/') {
    return null;
  }

  // Sur mobile, afficher seulement le dernier item avec un bouton retour
  const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
  const previousItem = breadcrumbItems[breadcrumbItems.length - 2];

  if (!lastItem) {
    return null;
  }

  return (
    <nav aria-label="Fil d'Ariane" className={`breadcrumb-compact ${props.className || ''}`}>
      <div className="flex items-center gap-2 text-sm">
        {previousItem?.href && (
          <Link
            to={previousItem.href}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">{previousItem.label}</span>
          </Link>
        )}
        <span className="text-gray-900 font-medium">{lastItem.label}</span>
      </div>
    </nav>
  );
};

/**
 * Styles CSS à ajouter (Tailwind)
 */
export const breadcrumbStyles = `
/* Breadcrumb Styles */
.breadcrumb {
  padding: 12px 0;
  margin-bottom: 16px;
}

.breadcrumb ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

.breadcrumb li {
  display: inline-flex;
  align-items: center;
}

/* Responsive */
@media (max-width: 640px) {
  .breadcrumb {
    padding: 8px 0;
    margin-bottom: 12px;
  }
  
  /* Masquer les items intermédiaires sur mobile */
  .breadcrumb li:not(:first-child):not(:last-child):not(:nth-last-child(2)) {
    display: none;
  }
  
  /* Afficher "..." pour indiquer les items cachés */
  .breadcrumb li:nth-child(2)::after {
    content: "...";
    margin: 0 8px;
    color: #9ca3af;
  }
}

/* Accessibilité */
.breadcrumb a:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .breadcrumb a {
    color: #d1d5db;
  }
  
  .breadcrumb a:hover {
    color: #60a5fa;
  }
  
  .breadcrumb [aria-current="page"] {
    color: #f9fafb;
  }
}
`;

export default Breadcrumb;
