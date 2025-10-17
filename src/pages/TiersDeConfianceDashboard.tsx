import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import DossierValidationQueue from '@/components/tiers/DossierValidationQueue';
import TiersVerificationQueue from '@/components/tiers/TiersVerificationQueue';

const TiersDeConfianceDashboard = () => {
  const { user, hasRole, loading } = useAuth();
  const [stats, setStats] = useState({
    validated: 0,
    pending: 0,
    rejected: 0,
    urgent: 0,
    avgProcessingTime: 0
  });

  useEffect(() => {
    if (user && hasRole('tiers_de_confiance')) {
      fetchStats();
    }
  }, [user, hasRole]);

  const fetchStats = async () => {
    const { count: validated } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: pending } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: rejected } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    // Dossiers urgents (en retard)
    const { count: urgent } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('is_overdue', true);

    // Temps moyen de traitement (en heures)
    const { data: processed } = await supabase
      .from('rental_applications')
      .select('created_at, reviewed_at')
      .not('reviewed_at', 'is', null)
      .limit(100);

    let avgTime = 0;
    if (processed && processed.length > 0) {
      const totalTime = processed.reduce((acc, app) => {
        const diff = new Date(app.reviewed_at!).getTime() - new Date(app.created_at).getTime();
        return acc + diff;
      }, 0);
      avgTime = Math.round(totalTime / (processed.length * 1000 * 60 * 60)); // Convertir en heures
    }

    setStats({
      validated: validated || 0,
      pending: pending || 0,
      rejected: rejected || 0,
      urgent: urgent || 0,
      avgProcessingTime: avgTime
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasRole('tiers_de_confiance')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Espace Tiers de Confiance</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">🔴 Urgents</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
              <p className="text-xs text-muted-foreground mt-1">En retard</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validés</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.validated}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProcessingTime}h</div>
              <p className="text-xs text-muted-foreground mt-1">De traitement</p>
            </CardContent>
          </Card>
        </div>

        {/* Validation Queue */}
        <Tabs defaultValue="verifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="verifications">Vérifications d'identité</TabsTrigger>
            <TabsTrigger value="dossiers">Dossiers de location</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
            <Card>
              <CardHeader>
                <CardTitle>Vérifications ONECI et CNAM en attente</CardTitle>
              </CardHeader>
              <CardContent>
                <TiersVerificationQueue />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dossiers">
            <Card>
              <CardHeader>
                <CardTitle>Validation des dossiers de location</CardTitle>
              </CardHeader>
              <CardContent>
                <DossierValidationQueue onUpdate={fetchStats} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des validations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Fonctionnalité à venir</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default TiersDeConfianceDashboard;
