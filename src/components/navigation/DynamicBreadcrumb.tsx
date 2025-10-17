import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  '/': 'Accueil',
  '/dashboard': 'Tableau de bord',
  '/analytics': 'Analytics',
  '/profil': 'Mon Profil',
  '/mes-biens': 'Mes Biens',
  '/ajouter-bien': 'Publier un bien',
  '/editer-bien': 'Modifier le bien',
  '/modifier-bien': 'Modifier le bien',
  '/verification': 'Vérification d\'identité',
  '/favoris': 'Mes Favoris',
  '/candidatures': 'Mes Candidatures',
  '/candidature': 'Postuler',
  '/recherche': 'Recherche avancée',
  '/explorer': 'Explorer la carte',
  '/publier': 'Publier un bien',
  '/baux': 'Mes Baux',
  '/messages': 'Messagerie',
  '/paiements': 'Paiements',
  '/maintenance': 'Maintenance',
  '/a-propos': 'À propos',
  '/admin': 'Administration',
  '/admin/certifications': 'Certifications',
  '/admin/dashboard': 'Dashboard Admin',
  '/property': 'Détails du bien',
  '/certification': 'Certification',
  '/guide': 'Guide',
  '/tarifs': 'Tarifs',
  '/conditions': 'Conditions',
  '/confidentialite': 'Confidentialité',
  '/mentions-legales': 'Mentions légales',
  '/legal': 'Mentions légales',
};

export const DynamicBreadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  const buildPath = (index: number) => {
    return `/${pathnames.slice(0, index + 1).join('/')}`;
  };

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1 hover:text-primary transition-smooth">
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathnames.map((_, index) => {
          const path = buildPath(index);
          const isLast = index === pathnames.length - 1;
          const label = routeLabels[path] || pathnames[index];

          return (
            <div key={path} className="flex items-center gap-2">
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium text-foreground">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path} className="hover:text-primary transition-smooth">
                      {label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
