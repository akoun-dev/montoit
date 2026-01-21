import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useContextualRoles } from '@/hooks/shared/useContextualRoles';
import { User, Building2, Key, Home, FileText, Loader2 } from 'lucide-react';

interface RoleTab {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  count?: number;
  description: string;
}

/**
 * Affiche les onglets de rôles contextuels basés sur les données réelles de l'utilisateur.
 * Pas de basculement manuel - tout est déduit dynamiquement.
 */
export default function ContextualRoleSwitcher() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { isOwner, isTenant, propertiesCount, activeLeasesAsTenantCount, loading } =
    useContextualRoles();

  if (!user) return null;

  // Build tabs based on contextual roles
  const tabs: RoleTab[] = [];

  // Always show profile tab
  tabs.push({
    id: 'profile',
    label: 'Mon Profil',
    icon: User,
    href: '/locataire/profil',
    description: 'Gérer mon profil',
  });

  // Show tenant tab if user has active leases as tenant
  if (isTenant) {
    tabs.push({
      id: 'tenant',
      label: 'Mes Locations',
      icon: Key,
      href: '/locataire/dashboard',
      count: activeLeasesAsTenantCount,
      description: 'Mon logement actuel',
    });
  }

  // Show owner tab if user has properties
  if (isOwner) {
    tabs.push({
      id: 'owner',
      label: 'Mes Propriétés',
      icon: Building2,
      href: '/proprietaire/dashboard/proprietaire',
      count: propertiesCount,
      description: 'Gérer mes biens',
    });
  }

  // If user has neither, show a "get started" state
  // But only show "Publish" button to owners/agencies, NOT tenants
  const hasNoRoles = !isTenant && !isOwner && !loading;
  const canPublishProperties = profile?.user_type === 'proprietaire' || profile?.user_type === 'agence';

  const isActiveTab = (href: string) => {
    if (href === '/locataire/profil') return location.pathname === '/locataire/profil';
    if (href === '/locataire/dashboard')
      return location.pathname.startsWith('/locataire/dashboard');
    if (href === '/proprietaire/dashboard/proprietaire')
      return location.pathname.startsWith('/proprietaire/dashboard/proprietaire');
    return false;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-[#EFEBE9] p-4">
        <div className="flex items-center justify-center gap-2 text-[#A69B95]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EFEBE9] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#EFEBE9] bg-[#FAF7F4]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#2C1810]">
              {profile?.full_name || 'Mon Espace'}
            </h3>
            <p className="text-xs text-[#A69B95]">
              {isOwner && isTenant
                ? 'Locataire & Propriétaire'
                : isOwner
                  ? 'Propriétaire'
                  : isTenant
                    ? 'Locataire'
                    : 'Nouveau membre'}
            </p>
          </div>
          <Home className="h-5 w-5 text-[#F16522]" />
        </div>
      </div>

      {/* Tabs */}
      <div className="p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isActiveTab(tab.href);

          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-[#F16522]/10 text-[#F16522]'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#2C1810]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#F16522] text-white'
                      : 'bg-[#FAF7F4] text-[#A69B95] group-hover:bg-[#F16522]/10 group-hover:text-[#F16522]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isActive ? 'text-[#F16522]' : ''}`}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-[#A69B95]">{tab.description}</p>
                </div>
              </div>

              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isActive ? 'bg-[#F16522] text-white' : 'bg-[#FAF7F4] text-[#6B5A4E]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}

        {/* Get started section for new users */}
        {hasNoRoles && (
          <div className="mt-2 p-3 bg-gradient-to-br from-[#F16522]/5 to-[#F16522]/10 rounded-xl border border-[#F16522]/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#F16522]/10 rounded-lg">
                <FileText className="h-4 w-4 text-[#F16522]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#2C1810]">Commencez votre parcours</p>
                <p className="text-xs text-[#6B5A4E] mt-0.5">
                  {canPublishProperties
                    ? 'Publiez votre première annonce'
                    : 'Recherchez votre logement idéal'}
                </p>
                <div className="flex gap-2 mt-3">
                  <Link
                    to={canPublishProperties ? '/recherche' : '/recherche'}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-center rounded-lg border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
                  >
                    {canPublishProperties ? 'Explorer' : 'Rechercher'}
                  </Link>
                  {canPublishProperties && (
                    <Link
                      to="/ajouter-propriete"
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-center rounded-lg bg-[#F16522] text-white hover:bg-[#D95318] transition-colors"
                    >
                      Publier
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
