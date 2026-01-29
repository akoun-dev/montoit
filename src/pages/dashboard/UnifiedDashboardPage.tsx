import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useContextualRoles } from '@/hooks/shared/useContextualRoles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Key, Loader2, Home, PlusCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

// Lazy load tab content
const TenantDashboardContent = lazy(
  () => import('@/features/tenant/components/TenantDashboardContent')
);
const ProfileContent = lazy(() => import('@/features/auth/components/ProfileContent'));

type TabId = 'profile' | 'tenant';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  available: boolean;
  count?: number;
}

/**
 * Dashboard unifié avec onglets adaptatifs selon les rôles contextuels.
 * Les onglets sont affichés dynamiquement selon que l'utilisateur:
 * - Est locataire (a des baux actifs)
 * - Est propriétaire (a des propriétés)
 */
export default function UnifiedDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    isTenant,
    activeLeasesAsTenantCount,
    loading: rolesLoading,
  } = useContextualRoles();

  // Determine initial tab from URL or defaults
  const getInitialTab = (): TabId => {
    const urlTab = searchParams.get('tab') as TabId;
    if (urlTab && ['profile', 'tenant'].includes(urlTab)) {
      return urlTab;
    }
    // Default to first available contextual role
    if (isTenant) return 'tenant';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  // Update tab when roles load
  useEffect(() => {
    if (!rolesLoading) {
      const urlTab = searchParams.get('tab') as TabId;
      if (!urlTab) {
        // No URL tab specified, set default based on roles
        if (isTenant) setActiveTab('tenant');
      }
    }
  }, [rolesLoading, isTenant, searchParams]);

  // Sync URL with active tab
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Build available tabs
  const tabs: Tab[] = [
    {
      id: 'profile',
      label: 'Mon Profil',
      icon: User,
      available: true,
    },
    {
      id: 'tenant',
      label: 'Mes Locations',
      icon: Key,
      available: isTenant,
      count: activeLeasesAsTenantCount,
    },
  ];

  const availableTabs = tabs.filter((t) => t.available);
  const hasNoContextualRoles = !isTenant && !rolesLoading;

  if (!user) {
    navigate('/connexion');
    return null;
  }

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6B5A4E]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement de votre espace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F4] w-full">
      {/* Header */}
      <div className="bg-white border-b border-[#EFEBE9]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#2C1810]">
                  Bonjour, {profile?.full_name?.split(' ')[0] || 'Bienvenue'} 👋
                </h1>
                <p className="text-[#6B5A4E] mt-1">
                  {isTenant
                    ? 'Gérez votre location et vos paiements'
                    : 'Bienvenue sur Mon Toit'}
                </p>
              </div>

              {/* Quick actions */}
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/recherche"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span className="font-medium">Rechercher</span>
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 -mb-px overflow-x-auto">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-[#F16522] text-[#F16522]'
                        : 'border-transparent text-[#6B5A4E] hover:text-[#2C1810] hover:border-[#EFEBE9]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          isActive
                            ? 'bg-[#F16522]/10 text-[#F16522]'
                            : 'bg-[#FAF7F4] text-[#6B5A4E]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Empty state for new users */}
        {hasNoContextualRoles && activeTab === 'profile' && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-[#F16522]/5 to-[#F16522]/10 rounded-2xl border border-[#F16522]/20 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#F16522]/10 rounded-xl">
                  <Home className="h-6 w-6 text-[#F16522]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#2C1810]">Bienvenue sur Mon Toit !</h3>
                  <p className="text-[#6B5A4E] mt-1">
                    Vous n'avez pas encore de location. Commencez par rechercher un logement.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Link
                      to="/recherche"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors font-medium"
                    >
                      <Search className="h-4 w-4" />
                      Rechercher un logement
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab content */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
            </div>
          }
        >
          {activeTab === 'profile' && <ProfileContent />}
          {activeTab === 'tenant' && isTenant && <TenantDashboardContent />}
        </Suspense>
      </div>
    </div>
  );
}
