/**
 * Feature: tenant
 * Exports publics de la feature tenant
 *
 * NOTE: Les pages sont situées dans src/pages/tenant/
 * Ce fichier n'exporte que les composants de la feature tenant
 */

// Composants du tableau de bord
export { default as TenantSidebar } from './components/TenantSidebar';
export { default as TenantDashboardLayout } from './components/TenantDashboardLayout';
export { default as TenantSidebarLayout } from './components/TenantSidebarLayout';
export { default as TenantDashboardContent } from './components/TenantDashboardContent';
export { default as TenantApplicationCard } from './components/TenantApplicationCard';
export { default as SaveSearchDialog } from './components/SaveSearchDialog';
export { default as SearchErrorBoundary } from './components/SearchErrorBoundary';

// NOTE: Les pages sont importées directement depuis src/pages/tenant/
// et non depuis ce fichier pour éviter la duplication
