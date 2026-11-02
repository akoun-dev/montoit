/**
 * Breadcrumb - Fil d'Ariane pour la navigation
 * Améliore l'UX en montrant où l'utilisateur se trouve
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// Mapping des routes vers leurs labels
const ROUTE_LABELS: Record<string, string> = {
  '': 'Accueil',
  recherche: 'Recherche',
  propriete: 'Propriété',
  properties: 'Propriété',
  proprietes: 'Propriété',
  favoris: 'Favoris',
  messages: 'Messages',
  'recherches-sauvegardees': 'Recherches sauvegardées',
  candidature: 'Candidature',
  visiter: 'Planifier une visite',
  'mes-visites': 'Mes visites',
  dashboard: 'Tableau de bord',
  locataire: 'Locataire',
  proprietaire: 'Propriétaire',
  calendrier: 'Calendrier',
  maintenance: 'Maintenance',
  'mon-score': 'Mon Score',
  'ajouter-propriete': 'Ajouter une propriété',
  'add-property': 'Ajouter une propriété',
  connexion: 'Connexion',
  inscription: 'Inscription',
  auth: 'Authentification',
  'mot-de-passe-oublie': 'Mot de passe oublié',
  'completer-profil': 'Compléter le profil',
  'choix-profil': 'Choix du profil',
  'a-propos': 'À propos',
  'conditions-utilisation': "Conditions d'utilisation",
  'politique-confidentialite': 'Politique de confidentialité',
  'mentions-legales': 'Mentions légales',
  contact: 'Contact',
  aide: 'Aide',
  faq: 'FAQ',
  'comment-ca-marche': 'Comment ça marche',
  guide: 'Guide',
  'louer-mon-bien': 'Louer mon bien',
  admin: 'Administration',
  'tableau-de-bord': 'Tableau de bord',
  utilisateurs: 'Utilisateurs',
  'gestion-roles': 'Gestion des rôles',
  'api-keys': 'Clés API',
  'cev-management': 'Gestion CEV',
  'trust-agents': 'Agents de confiance',
  nouvelle: 'Nouvelle demande',
  // Routes propriétaires
  'mes-biens': 'Mes biens',
  contrats: 'Contrats',
  candidatures: 'Candidatures',
  visites: 'Visites',
  'mes-locataires': 'Locataires',
  paiements: 'Paiements',
  documents: 'Documents',
  'mes-mandats': 'Mandats',
  profil: 'Mon profil',
  'creer-contrat': 'Créer un contrat',
  contrat: 'Contrat',
  signer: 'Signer',
  'mes-applications': 'Candidatures',
};

// Pages où ne pas afficher le breadcrumb
const EXCLUDED_ROUTES = [
  '/',
  '/connexion',
  '/inscription',
  '/auth',
  '/auth/callback',
  '/mot-de-passe-oublie',
  '/completer-profil',
];

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Toujours commencer par l'accueil
  breadcrumbs.push({
    label: 'Accueil',
    path: '/',
    isLast: segments.length === 0,
  });

  // Construire le chemin progressivement
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Ignorer les IDs (UUIDs ou nombres)
    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
      /^\d+$/.test(segment);

    if (!isId) {
      const label =
        ROUTE_LABELS[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label,
        path: currentPath,
        isLast: index === segments.length - 1,
      });
    } else {
      // Pour les IDs, mettre à jour le dernier élément comme étant le dernier
      if (breadcrumbs.length > 0 && breadcrumbs[breadcrumbs.length - 1]) {
        breadcrumbs[breadcrumbs.length - 1]!.isLast = true;
      }
    }
  });

  return breadcrumbs;
}

interface BreadcrumbProps {
  className?: string;
}

export function Breadcrumb({ className = '' }: BreadcrumbProps) {
  const location = useLocation();

  // Ne pas afficher sur les pages exclues
  if (EXCLUDED_ROUTES.includes(location.pathname)) {
    return null;
  }

  const breadcrumbs = generateBreadcrumbs(location.pathname);

  // Ne pas afficher s'il n'y a que l'accueil
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Fil d'Ariane"
      className={`bg-white/80 backdrop-blur-sm border-b border-gray-100 ${className}`}
    >
      <div className="container mx-auto px-4">
        <ol className="flex items-center py-3 text-sm overflow-x-auto">
          {breadcrumbs.map((item, index) => (
            <li key={item.path} className="flex items-center whitespace-nowrap">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400 flex-shrink-0" />}

              {item.isLast ? (
                <span className="text-terracotta-600 font-medium flex items-center gap-1.5">
                  {index === 0 && <Home className="h-4 w-4" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-gray-600 hover:text-terracotta-600 transition-colors flex items-center gap-1.5"
                >
                  {index === 0 && <Home className="h-4 w-4" />}
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

export default Breadcrumb;
