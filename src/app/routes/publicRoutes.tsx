// Force rebuild - 2025-12-07T20:00:00Z
import { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from '@/shared/utils/lazyLoad';
import SearchErrorBoundary from '@/features/tenant/components/SearchErrorBoundary';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import { TENANT_ROLES, OWNER_ROLES, PROPERTY_MANAGER_ROLES, AGENCY_ROLES } from '@/shared/constants/roles';

// TEST: Import direct de HomePage pour déboguer le problème de lazy loading
import Home from '@/pages/public/HomePage';

// Autres pages en lazy load
const NotFound = lazyWithRetry(() => import('@/pages/public/NotFoundPage'));
const AddPropertyLanding = lazyWithRetry(() => import('@/pages/public/AddPropertyLandingPage'));

// Agencies directory
const AgenciesDirectory = lazyWithRetry(() => import('@/pages/agencies/AgenciesDirectoryPage'));

// Property pages
const SearchProperties = lazyWithRetry(() => import('@/pages/tenant/SearchPropertiesPage'));
const PropertyDetail = lazyWithRetry(() => import('@/pages/tenant/PropertyDetailPage'));

// Static pages
const AboutPage = lazyWithRetry(() => import('@/pages/auth/AboutPage'));
const TermsOfServicePage = lazyWithRetry(() => import('@/pages/auth/TermsOfServicePage'));
const PrivacyPolicyPage = lazyWithRetry(() => import('@/pages/auth/PrivacyPolicyPage'));
const ContactPage = lazyWithRetry(() => import('@/pages/auth/ContactPage'));
const HelpPage = lazyWithRetry(() => import('@/pages/auth/HelpPage'));
const FAQPage = lazyWithRetry(() => import('@/pages/auth/FAQPage'));
const HowItWorksPage = lazyWithRetry(() => import('@/pages/auth/HowItWorksPage'));
const CGVPage = lazyWithRetry(() => import('@/pages/auth/CGVPage'));
const BlogPage = lazyWithRetry(() => import('@/pages/auth/BlogPage'));

// Contract detail page (shared across all user types)
const ContractDetail = lazyWithRetry(() => import('@/pages/tenant/ContractDetailPage'));

export const publicRoutes: RouteObject[] = [
  // Home - IMPORT DIRECT pour test
  { index: true, element: <Home /> },

  // Static pages
  { path: 'a-propos', element: <AboutPage /> },
  { path: 'conditions-utilisation', element: <TermsOfServicePage /> },
  { path: 'politique-confidentialite', element: <PrivacyPolicyPage /> },
  { path: 'mentions-legales', element: <TermsOfServicePage /> },
  { path: 'cgv', element: <CGVPage /> },
  { path: 'contact', element: <ContactPage /> },
  { path: 'aide', element: <HelpPage /> },
  { path: 'faq', element: <FAQPage /> },
  { path: 'comment-ca-marche', element: <HowItWorksPage /> },
  { path: 'guide', element: <HowItWorksPage /> },
  { path: 'blog', element: <BlogPage /> },

  // Property landing pages
  { path: 'ajouter-propriete', element: <AddPropertyLanding /> },
  { path: 'louer-mon-bien', element: <AddPropertyLanding /> },

  // Agencies directory
  { path: 'agences', element: <AgenciesDirectory /> },

  // Property search & details
  {
    path: 'recherche',
    element: (
      <SearchErrorBoundary>
        <SearchProperties />
      </SearchErrorBoundary>
    ),
  },
  { path: 'propriete/:id', element: <PropertyDetail /> },
  { path: 'properties/:id', element: <PropertyDetail /> },
  { path: 'proprietes/:id', element: <PropertyDetail /> },

  // Contract detail (global route - accessible to all authenticated users with appropriate roles)
  {
    path: 'contrat/:id',
    element: (
      <ProtectedRoute allowedRoles={[...TENANT_ROLES, ...OWNER_ROLES, ...PROPERTY_MANAGER_ROLES, ...AGENCY_ROLES]}>
        <ContractDetail />
      </ProtectedRoute>
    ),
  },

  // 404 fallback
  { path: '*', element: <NotFound /> },
];
