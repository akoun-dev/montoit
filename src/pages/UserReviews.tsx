import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReputationBadge } from '@/components/reviews/ReputationBadge';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { Award, Home, User } from 'lucide-react';
import { logger } from '@/services/logger';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: string;
}

interface ReputationScore {
  overall_score: number;
  total_reviews: number;
  as_tenant_score: number;
  as_tenant_reviews: number;
  as_landlord_score: number;
  as_landlord_reviews: number;
}

const UserReviews = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_type')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch reputation
      const { data: reputationData } = await supabase
        .from('reputation_scores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      setReputation(reputationData);
    } catch (error) {
      logger.logError(error, { context: 'UserReviews', action: 'fetchUserData' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Utilisateur introuvable</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const userTypeLabels = {
    locataire: 'Locataire',
    proprietaire: 'Propriétaire',
    agence: 'Agence',
    admin_ansut: 'Admin ANSUT',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{profile.full_name}</h1>
                  <p className="text-muted-foreground mb-3">
                    {userTypeLabels[profile.user_type as keyof typeof userTypeLabels]}
                  </p>
                  {reputation && reputation.total_reviews > 0 && (
                    <ReputationBadge
                      score={Number(reputation.overall_score)}
                      totalReviews={reputation.total_reviews}
                      showDetails
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Avis et réputation
              </CardTitle>
              <CardDescription>
                Consultez les avis laissés par d'autres utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Tous ({reputation?.total_reviews || 0})
                  </TabsTrigger>
                  <TabsTrigger value="tenant">
                    <User className="h-4 w-4 mr-2" />
                    Locataire ({reputation?.as_tenant_reviews || 0})
                  </TabsTrigger>
                  <TabsTrigger value="landlord">
                    <Home className="h-4 w-4 mr-2" />
                    Propriétaire ({reputation?.as_landlord_reviews || 0})
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="all">
                    <ReviewsList userId={userId!} reviewType="all" />
                  </TabsContent>

                  <TabsContent value="tenant">
                    <ReviewsList userId={userId!} reviewType="as_tenant" />
                  </TabsContent>

                  <TabsContent value="landlord">
                    <ReviewsList userId={userId!} reviewType="as_landlord" />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserReviews;
