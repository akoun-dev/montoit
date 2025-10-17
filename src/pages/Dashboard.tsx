import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Building2, Users, BarChart3, Plus, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RecommendationsCarousel } from '@/components/recommendations/RecommendationsCarousel';
import { PreferencesModal } from '@/components/recommendations/PreferencesModal';
import SearchHistory from '@/components/dashboard/SearchHistory';
import SmartReminders from '@/components/dashboard/SmartReminders';
import { ProfileScoreCardCompact } from '@/components/dashboard/ProfileScoreCardCompact';
import { QuickActionsGridCompact } from '@/components/dashboard/QuickActionsGridCompact';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { ApplicationsOverviewCompact } from '@/components/dashboard/ApplicationsOverviewCompact';
import { MarketInsightsWidget } from '@/components/dashboard/MarketInsightsWidget';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { StickyHeader } from '@/components/ui/sticky-header';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';

const Dashboard = () => {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Redirection intelligente pour les agences
  useEffect(() => {
    if (profile?.user_type === 'agence' && !loading) {
      navigate('/dashboard/agence');
    }
  }, [profile?.user_type, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const dashboardContent = {
    locataire: {
      title: 'Tableau de bord Locataire',
      cards: [
        { title: 'Mes Candidatures', icon: Home, description: 'Suivez vos candidatures', link: '/candidatures' },
        { title: 'Mes Baux', icon: Building2, description: 'Consulter mes baux', link: '/baux' },
        { title: 'Mes Favoris', icon: Building2, description: 'Biens sauvegardés', link: '/favoris' },
      ],
    },
    proprietaire: {
      title: 'Tableau de bord Propriétaire',
      cards: [
        { title: 'Mes Biens', icon: Building2, description: 'Gérer mes propriétés', link: '/mes-biens' },
        { title: 'Candidatures Reçues', icon: Users, description: 'Gérer les candidatures', link: '/candidatures' },
        { title: 'Statistiques', icon: BarChart3, description: 'Performance de vos biens', link: '/stats' },
      ],
    },
    agence: {
      title: 'Tableau de bord Agence',
      cards: [
        { title: 'Portfolio', icon: Building2, description: 'Tous les biens', link: '/portfolio' },
        { title: 'Équipe', icon: Users, description: 'Gestion de l\'équipe', link: '/equipe' },
        { title: 'Statistiques', icon: BarChart3, description: 'Performance globale', link: '/stats' },
      ],
    },
    admin_ansut: {
      title: 'Tableau de bord Admin ANSUT',
      cards: [
        { title: 'Utilisateurs', icon: Users, description: 'Gestion des utilisateurs', link: '/admin/users' },
        { title: 'Propriétés', icon: Building2, description: 'Toutes les propriétés', link: '/admin/properties' },
        { title: 'Rapports', icon: BarChart3, description: 'Statistiques globales', link: '/admin/reports' },
      ],
    },
  };

  const content = dashboardContent[profile.user_type];

  return (
    <MainLayout>
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <DynamicBreadcrumb />
          
          <WelcomeBanner />
          
          {/* Header */}
          <StickyHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <h1 className="text-3xl font-bold">{content.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Bienvenue, {profile.full_name}</p>
              </div>
              <div className="flex gap-2">
                {profile.user_type === 'locataire' && (
                  <Button variant="outline" size="sm" onClick={() => setPreferencesOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Préférences
                  </Button>
                )}
                {profile.user_type === 'proprietaire' && (
                  <Button asChild size="sm">
                    <Link to="/ajouter-bien">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un bien
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </StickyHeader>

          {/* Tenant Dashboard - Optimized Layout */}
          {user && profile.user_type === 'locataire' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sidebar gauche */}
              <div className="lg:col-span-1 space-y-4">
                <ProfileScoreCardCompact />
                <QuickActionsGridCompact />
              </div>

              {/* Contenu principal */}
              <div className="lg:col-span-3 space-y-4">
                <ApplicationsOverviewCompact />
                
                <CollapsibleSection 
                  title="Rappels intelligents" 
                  defaultOpen={false}
                  storageKey="dashboard-reminders"
                >
                  <SmartReminders />
                </CollapsibleSection>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[280px]">
                  <MarketInsightsWidget className="h-full" />
                  <ActivityTimeline className="h-full overflow-auto" />
                </div>

                <RecommendationsCarousel userId={user.id} limit={8} />

                <CollapsibleSection 
                  title="Historique de recherches" 
                  defaultOpen={false}
                  storageKey="dashboard-search-history"
                >
                  <SearchHistory />
                </CollapsibleSection>
              </div>
            </div>
          )}

          {user && profile.user_type === 'proprietaire' && (
            <>
              <Card className="mb-4">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle>Locataires recommandés</CardTitle>
                  </div>
                  <CardDescription>
                    Consultez vos candidatures pour voir les locataires les mieux notés pour chaque bien
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link to="/mes-biens">Voir mes biens et candidatures</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="mb-8">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Mes Mandats</CardTitle>
                  </div>
                  <CardDescription>
                    Gérez vos mandats avec les agences immobilières
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link to="/my-mandates">Voir mes mandats</Link>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.cards.map((card, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <card.icon className="h-5 w-5 text-primary" />
                    <CardTitle>{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={card.link}>Accéder</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <PreferencesModal open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </MainLayout>
  );
};

export default Dashboard;
