import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Home, Heart, Users, Calendar, FileText, CreditCard, Bell, Wrench, Settings, History, Star, Search, MessageSquare, FolderOpen, Handshake, Key, Wallet, type LucideIcon } from 'lucide-react';
import TenantDashboardLayout from './TenantDashboardLayout';
import { useAuth } from '@/app/providers/AuthProvider';
import { TENANT_ROLES, OWNER_ROLES, AGENCY_ROLES } from '@/shared/constants/roles';
import OwnerDashboardLayout from '@/features/owner/components/OwnerDashboardLayout';
import AgencyDashboardLayout from '@/features/agency/components/AgencyDashboardLayout';
import type { ReactNode } from 'react';

interface RouteMeta {
  prefix: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const ROUTE_METAS: RouteMeta[] = [
  { prefix: '/locataire/dashboard', title: 'Tableau de bord', description: 'Vue d\'ensemble de votre activité', icon: LayoutDashboard },
  { prefix: '/locataire/mon-espace', title: 'Mon Espace', description: 'Gérez votre location et vos paiements', icon: Home },
  { prefix: '/locataire/messages', title: 'Messages', description: 'Vos échanges avec les propriétaires', icon: MessageSquare },
  { prefix: '/locataire/favoris', title: 'Mes Favoris', description: 'Propriétés sauvegardées', icon: Heart },
  { prefix: '/locataire/mes-candidatures', title: 'Mes Candidatures', description: 'Suivez vos demandes de location', icon: Users },
  { prefix: '/locataire/mes-visites', title: 'Mes Visites', description: 'Planifiez et suivez vos visites', icon: Calendar },
  { prefix: '/locataire/mes-contrats', title: 'Mes Contrats', description: 'Gérez vos contrats de bail', icon: FileText },
  { prefix: '/locataire/mes-paiements', title: 'Mes Paiements', description: 'Gérez et suivez vos paiements', icon: CreditCard },
  { prefix: '/locataire/notifications', title: 'Notifications', description: 'Restez informé des actualités', icon: Bell },
  { prefix: '/locataire/maintenance', title: 'Maintenance', description: 'Suivez vos demandes de maintenance', icon: Wrench },
  { prefix: '/locataire/parametres', title: 'Paramètres', description: 'Gérez votre compte et vos préférences', icon: Settings },
  { prefix: '/locataire/profil/historique-locations', title: 'Historique des Locations', description: 'Ajoutez vos locations passées', icon: History },
  { prefix: '/locataire/avis', title: 'Mes Avis', description: 'Gérez vos avis', icon: Star },
  { prefix: '/locataire/recherches-sauvegardees', title: 'Recherches sauvegardées', description: 'Vos recherches enregistrées', icon: Search },
  { prefix: '/locataire/dashboard/calendrier', title: 'Calendrier', description: 'Votre agenda', icon: Calendar },
  { prefix: '/locataire/maintenance/nouvelle', title: 'Maintenance', description: 'Nouvelle demande', icon: Wrench },
  { prefix: '/locataire/visiter', title: 'Planifier une visite', description: 'Organisez une visite', icon: Calendar },
  { prefix: '/locataire/candidature', title: 'Candidature', description: 'Votre candidature', icon: FileText },
  { prefix: '/locataire/contrat', title: 'Contrat', description: 'Votre contrat', icon: FileText },
  { prefix: '/locataire/signer-bail', title: 'Signature du bail', description: 'Finalisez votre bail', icon: FileText },
  { prefix: '/locataire/effectuer-paiement', title: 'Paiement', description: 'Effectuez un paiement', icon: CreditCard },
  { prefix: '/locataire/mes-mandats', title: 'Mes Mandats', description: 'Gérez vos mandats', icon: Handshake },
  { prefix: '/locataire/mes-locataires', title: 'Mes Locataires', description: 'Gérez vos locataires', icon: Key },
  { prefix: '/locataire/documents', title: 'Mes Documents', description: 'Vos documents', icon: FolderOpen },
  { prefix: '/locataire/rappels', title: 'Mes Rappels', description: 'Vos rappels', icon: Bell },
  { prefix: '/locataire/profil', title: 'Mon Profil', description: 'Vos informations personnelles', icon: Settings },
];

const getRouteMeta = (pathname: string): RouteMeta => {
  const match = ROUTE_METAS.find(({ prefix }) => pathname.startsWith(prefix));
  return match ?? { prefix: '', title: 'Mon espace', description: 'Bienvenue', icon: Home };
};

export default function TenantSidebarLayout() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const meta = getRouteMeta(pathname);
  const IconComponent = meta.icon;
  const icon = IconComponent ? <IconComponent className="h-5 w-5" /> : undefined;
  const { title, description } = meta;

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
      <AgencyDashboardLayout title={title} icon={icon} description={description}>
        <Outlet />
      </AgencyDashboardLayout>
    );
  }

  if (isOwner) {
    return (
      <OwnerDashboardLayout title={title} icon={icon} description={description}>
        <Outlet />
      </OwnerDashboardLayout>
    );
  }

  // Locataire (par défaut)
  return (
    <TenantDashboardLayout title={title} icon={icon} description={description}>
      <Outlet />
    </TenantDashboardLayout>
  );
}
