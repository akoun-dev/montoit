import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import HeaderPremium from './HeaderPremium';
import FooterPremium from './FooterPremium';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/shared/ui/ChunkLoadErrorBoundary';
import { ToastContainer } from '@/hooks/shared/useToast';
import PageTransition from '@/shared/ui/PageTransition';
import { Breadcrumb } from '@/shared/ui/Breadcrumb';
import { GlobalLoadingSkeleton } from '@/shared/ui/GlobalLoadingSkeleton';
import { FloatingCallButton } from '@/shared/ui/FloatingCallButton';
import SUTAChatWidget from '@/shared/components/SUTAChatWidget';
import { CookieConsent } from '@/shared/ui/CookieConsent';
const noLayoutRoutes = ['/auth/callback'];
const noHeaderFooterRoutes = [
  '/admin',
  '/visiter',
  '/mes-visites',
  '/verification',
  '/mes-certificats',
];

// Routes qui n'affichent pas le breadcrumb global (héros ou breadcrumb interne)
const noBreadcrumbRoutes = ['/', '/recherche'];

// Routes avec navigation latérale pour locataire (éviter header + breadcrumb doublons)
const tenantSidebarPrefixes = [
  '/locataire',
  '/mon-espace',
  '/mes-candidatures',
  '/mes-contrats',
  '/mes-paiements',
  '/mes-visites',
  '/mes-favoris',
  '/recherches-sauvegardees',
  '/maintenance',
  '/maintenance/nouvelle',
  '/profil',
  '/mon-score',
  '/profil/historique-locations',
  '/effectuer-paiement',
  '/messages',
  '/score-locataire',
];

// Routes avec navigation latérale pour propriétaire (éviter header + breadcrumb doublons)
const ownerSidebarPrefixes = [
  '/proprietaire',
  '/proprietaire/ajouter-propriete',
  '/proprietaire/creer-contrat',
  '/proprietaire/contrats',
  '/proprietaire/candidatures',
  '/proprietaire/candidature',
  '/proprietaire/mes-proprietes',
];

// Routes avec navigation latérale pour agence (éviter header + breadcrumb doublons)
const agencySidebarPrefixes = ['/agences', '/agences/mandats', '/mandat'];

// Routes avec layout dédié pour trust agent
const trustAgentSidebarPrefixes = ['/trust-agent'];

// Map routes to skeleton variants
function getSkeletonVariant(path: string): 'default' | 'dashboard' | 'property' | 'list' | 'form' {
  if (path.includes('dashboard') || path.includes('tableau-de-bord')) return 'dashboard';
  if (path.includes('propriete/') || path.includes('annonce/')) return 'property';
  if (path.includes('recherche') || path.includes('favoris') || path.includes('visites'))
    return 'list';
  if (path.includes('ajouter') || path.includes('modifier') || path.includes('inscription'))
    return 'form';
  return 'default';
}

export default function Layout() {
  const location = useLocation();
  const path = location.pathname;

  const shouldShowLayout = !noLayoutRoutes.includes(path);
  const isTenantSidebarRoute = tenantSidebarPrefixes.some((prefix) => path.startsWith(prefix));
  const isOwnerSidebarRoute = ownerSidebarPrefixes.some((prefix) => path.startsWith(prefix));
  const isAgencySidebarRoute = agencySidebarPrefixes.some((prefix) => path.startsWith(prefix));
  const isTrustAgentSidebarRoute = trustAgentSidebarPrefixes.some((prefix) =>
    path.startsWith(prefix)
  );
  const isAnySidebarRoute =
    isTenantSidebarRoute || isOwnerSidebarRoute || isAgencySidebarRoute || isTrustAgentSidebarRoute;
  const shouldShowBreadcrumb =
    !noBreadcrumbRoutes.some((route) => path.startsWith(route)) &&
    !isAnySidebarRoute &&
    shouldShowLayout;
  const shouldShowHeaderFooter =
    !noHeaderFooterRoutes.some((route) => path.startsWith(route)) &&
    !noLayoutRoutes.includes(path) &&
    !isAnySidebarRoute;
  const skeletonVariant = getSkeletonVariant(path);

  // Si c'est une route avec layout dédié (agence, tenant, admin), laisser le composant gérer son propre layout
  if (
    !shouldShowLayout ||
    isAgencySidebarRoute ||
    isTenantSidebarRoute ||
    isTrustAgentSidebarRoute
  ) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<GlobalLoadingSkeleton variant={skeletonVariant} />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {shouldShowHeaderFooter && <HeaderPremium />}
      {shouldShowHeaderFooter && shouldShowBreadcrumb && <Breadcrumb />}
      <ToastContainer />
      {shouldShowHeaderFooter && <FloatingCallButton />}
      {shouldShowHeaderFooter && <SUTAChatWidget mode="floating" position="bottom-right" />}
      <ChunkLoadErrorBoundary>
        <Suspense fallback={<GlobalLoadingSkeleton variant={skeletonVariant} />}>
          <main className={shouldShowHeaderFooter ? 'min-h-screen' : ''}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </main>
        </Suspense>
      </ChunkLoadErrorBoundary>
      {shouldShowHeaderFooter && <FooterPremium />}
      <CookieConsent />
    </ErrorBoundary>
  );
}
