import { Outlet, useLocation } from 'react-router-dom';
import TenantDashboardLayout from './TenantDashboardLayout';
import { useAuth } from '@/app/providers/AuthProvider';
import { TENANT_ROLES, OWNER_ROLES, AGENCY_ROLES } from '@/shared/constants/roles';
import OwnerDashboardLayout from '@/features/owner/components/OwnerDashboardLayout';
import AgencyDashboardLayout from '@/features/agency/components/AgencyDashboardLayout';

const ROUTE_TITLES = [
  { prefix: '/mon-espace', title: 'Mon Espace' },
  { prefix: '/messages', title: 'Messages' },
  { prefix: '/recherches-sauvegardees', title: 'Recherches sauvegardées' },
  { prefix: '/dashboard/calendrier', title: 'Calendrier' },
  { prefix: '/maintenance/nouvelle', title: 'Maintenance' },
  { prefix: '/visiter', title: 'Planifier une visite' },
  { prefix: '/candidature', title: 'Candidature' },
  { prefix: '/contrat', title: 'Contrat' },
  { prefix: '/signer-bail', title: 'Signature du bail' },
  { prefix: '/effectuer-paiement', title: 'Paiement' },
];

const getTitleForPath = (pathname: string) => {
  const match = ROUTE_TITLES.find(({ prefix }) => pathname.startsWith(prefix));
  return match?.title ?? 'Mon espace';
};

export default function TenantSidebarLayout() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const title = getTitleForPath(pathname);

  // Vérifier le rôle de l'utilisateur
  const userRole = profile?.user_type;
  const isTenant = userRole ? (TENANT_ROLES as readonly string[]).includes(userRole) : false;
  const isOwner = userRole ? (OWNER_ROLES as readonly string[]).includes(userRole) : false;
  const isAgency = userRole ? (AGENCY_ROLES as readonly string[]).includes(userRole) : false;

  // Si l'utilisateur n'a pas de rôle valide, afficher le contenu sans layout
  if (!isTenant && !isOwner && !isAgency) {
    return <Outlet />;
  }

  // Rediriger vers le bon layout selon le rôle
  if (isAgency) {
    return (
      <AgencyDashboardLayout title={title}>
        <Outlet />
      </AgencyDashboardLayout>
    );
  }

  if (isOwner) {
    return (
      <OwnerDashboardLayout title={title}>
        <Outlet />
      </OwnerDashboardLayout>
    );
  }

  // Locataire (par défaut)
  return (
    <TenantDashboardLayout title={title}>
      <Outlet />
    </TenantDashboardLayout>
  );
}
