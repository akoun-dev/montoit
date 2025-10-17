import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ONECIForm from '@/components/verification/ONECIForm';
import VerificationStatus from '@/components/verification/VerificationStatus';
import FaceVerification from '@/components/verification/FaceVerification';
import PassportVerificationForm from '@/components/verification/PassportVerificationForm';
import { Shield } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

const Verification = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background" translate="no">
        <Navbar />
      
        <main className="flex-grow container mx-auto px-4 py-8 pt-24">
          <div className="max-w-4xl mx-auto">
            <DynamicBreadcrumb />
            
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-3 mb-4">
                <Shield className="h-10 w-10 text-secondary" />
                <h1 className="text-3xl font-bold">Vérification d'Identité</h1>
              </div>
              <p className="text-muted-foreground">
                Complétez vos vérifications ONECI et Face ID pour augmenter votre crédibilité
              </p>
            </div>

            <VerificationStatus />

            <Tabs defaultValue="oneci" className="mt-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oneci">
                  ONECI (Ivoiriens)
                </TabsTrigger>
                <TabsTrigger value="face">
                  Vérification Faciale
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oneci">
                <ONECIForm />
              </TabsContent>

              <TabsContent value="face">
                <Card>
                  <CardHeader>
                    <CardTitle>Vérification Faciale</CardTitle>
                    <CardDescription>
                      Renforcez votre profil avec une vérification biométrique Smile ID
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FaceVerification />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default Verification;
