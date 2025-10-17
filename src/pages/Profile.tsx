import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, CheckCircle2, XCircle, Award, Settings, Home, MapPin, DollarSign, Bed, Bath } from 'lucide-react';
import { TenantScoreBadge } from '@/components/ui/tenant-score-badge';
import { TenantScoreExplanation } from '@/components/verification/TenantScoreExplanation';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';
import { PreferencesModal } from '@/components/recommendations/PreferencesModal';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { RoleSelectorFull } from '@/components/profile/RoleSelectorFull';
import { PropertyAlertsSettings } from '@/components/settings/PropertyAlertsSettings';
import { logger } from '@/services/logger';

const Profile = () => {
  const { user, profile, refreshProfile, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tenantScore, setTenantScore] = useState<number | null>(null);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [matchingPropertiesCount, setMatchingPropertiesCount] = useState(0);
  const [notifyNewMatches, setNotifyNewMatches] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setBio(profile.bio || '');
      
      // Fetch tenant score and preferences
      const fetchData = async () => {
        const { data: scoreData } = await supabase
          .from('user_verifications')
          .select('tenant_score')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (scoreData?.tenant_score) {
          setTenantScore(scoreData.tenant_score);
        }

        // Fetch user preferences
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (prefsData) {
          setPreferences(prefsData);

          // Count matching properties
          let query = supabase.from('properties').select('id', { count: 'exact', head: true });

          if (prefsData.preferred_cities?.length > 0) {
            query = query.in('city', prefsData.preferred_cities);
          }
          if (prefsData.min_budget) {
            query = query.gte('monthly_rent', prefsData.min_budget);
          }
          if (prefsData.max_budget) {
            query = query.lte('monthly_rent', prefsData.max_budget);
          }

          const { count } = await query;
          setMatchingPropertiesCount(count || 0);
        }

        // Check notification preferences
        const { data: notifPrefs } = await supabase
          .from('notification_preferences')
          .select('enabled')
          .eq('user_id', profile.id)
          .eq('category', 'recommendations')
          .maybeSingle();

        setNotifyNewMatches(notifPrefs?.enabled || false);
      };
      
      fetchData();
    }
  }, [profile]);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          category: 'recommendations',
          enabled,
          email_enabled: enabled,
          push_enabled: enabled,
        });

      if (error) throw error;

      setNotifyNewMatches(enabled);
      toast({
        title: 'Préférences mises à jour',
        description: enabled 
          ? 'Vous serez notifié des nouvelles recommandations'
          : 'Les notifications de recommandations sont désactivées',
      });
    } catch (error) {
      logger.logError(error, { context: 'Profile', action: 'updateNotificationPreferences' });
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les préférences',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        city,
        bio,
      })
      .eq('id', user!.id);

    setLoading(false);

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });
      refreshProfile();
    }
  };

  if (!profile) {
    return null;
  }

  const userTypeLabels = {
    locataire: '🏠 Locataire',
    proprietaire: '🏢 Propriétaire',
    agence: '🏪 Agence',
    admin_ansut: '👔 Admin ANSUT',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <DynamicBreadcrumb />
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{fullName}</h1>
              <p className="text-muted-foreground">{userTypeLabels[profile.user_type]}</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="preferences">Préférences de recherche</TabsTrigger>
              <TabsTrigger value="alerts">Alertes</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">

          {/* Tenant Score */}
          {tenantScore && tenantScore > 0 && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Score de Fiabilité
                </CardTitle>
                <CardDescription>
                  Votre évaluation en tant que locataire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ce score est calculé automatiquement selon vos vérifications et votre profil
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TenantScoreBadge score={tenantScore} size="lg" />
                    <TenantScoreExplanation
                      currentScore={tenantScore}
                      oneciVerified={profile.oneci_verified}
                      faceVerified={profile.face_verified}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Management */}
          <RoleSelectorFull />

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Statut de vérification
              </CardTitle>
              <CardDescription>
                Vérifiez votre identité pour améliorer votre score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Vérification ONECI (Identité)</span>
                {profile.oneci_verified ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Vérifié</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">Non vérifié</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Vérification CNAM (Emploi)</span>
                {profile.cnam_verified ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Vérifié</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">Non vérifié</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Mettez à jour vos informations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Nom complet</Label>
                  <Input
                    id="fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+225 07 XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    placeholder="Ex: Abidjan, Yamoussoukro"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Biographie</Label>
                  <Textarea
                    id="bio"
                    placeholder="Parlez-nous de vous..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </form>
            </CardContent>
          </Card>

              {/* Notification Preferences */}
              <NotificationPreferences />

              {/* 2FA for Admins */}
              {hasRole('admin') && (
                <div className="mt-6">
                  <TwoFactorSetup />
                </div>
              )}
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Mes Préférences de recherche
                  </CardTitle>
                  <CardDescription>
                    Configurez vos critères pour recevoir des recommandations personnalisées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {preferences ? (
                    <>
                      {/* Current preferences display */}
                      <div className="space-y-4">
                        {preferences.preferred_cities && preferences.preferred_cities.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              Villes préférées
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {preferences.preferred_cities.map((city: string) => (
                                <Badge key={city} variant="secondary">{city}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {preferences.preferred_property_types && preferences.preferred_property_types.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <Home className="h-4 w-4 text-primary" />
                              Types de biens
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {preferences.preferred_property_types.map((type: string) => (
                                <Badge key={type} variant="secondary">{type}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {(preferences.min_budget || preferences.max_budget) && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <DollarSign className="h-4 w-4 text-primary" />
                              Budget
                            </div>
                            <Badge variant="secondary">
                              {preferences.min_budget?.toLocaleString() || '0'} - {preferences.max_budget?.toLocaleString() || '∞'} FCFA/mois
                            </Badge>
                          </div>
                        )}

                        {(preferences.min_bedrooms > 0 || preferences.min_bathrooms > 0) && (
                          <div className="flex gap-4">
                            {preferences.min_bedrooms > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                  <Bed className="h-4 w-4 text-primary" />
                                  Chambres min.
                                </div>
                                <Badge variant="secondary">{preferences.min_bedrooms}+</Badge>
                              </div>
                            )}
                            {preferences.min_bathrooms > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                  <Bath className="h-4 w-4 text-primary" />
                                  Salles de bain min.
                                </div>
                                <Badge variant="secondary">{preferences.min_bathrooms}+</Badge>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {preferences.requires_parking && <Badge variant="outline">Parking requis</Badge>}
                          {preferences.requires_garden && <Badge variant="outline">Jardin requis</Badge>}
                          {preferences.requires_ac && <Badge variant="outline">Climatisation requise</Badge>}
                          {preferences.requires_furnished && <Badge variant="outline">Meublé requis</Badge>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Biens correspondants actuellement</p>
                            <p className="text-2xl font-bold text-primary">{matchingPropertiesCount}</p>
                          </div>
                          <Home className="h-12 w-12 text-primary/20" />
                        </div>
                      </div>

                      {/* Notification toggle */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">Notifications pour nouvelles recommandations</p>
                          <p className="text-sm text-muted-foreground">
                            Recevez une notification quotidienne quand de nouveaux biens matchent vos critères
                          </p>
                        </div>
                        <Switch
                          checked={notifyNewMatches}
                          onCheckedChange={handleNotificationToggle}
                        />
                      </div>

                      <Button 
                        onClick={() => setPreferencesModalOpen(true)}
                        className="w-full"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Modifier mes préférences
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        Vous n'avez pas encore configuré vos préférences de recherche
                      </p>
                      <Button onClick={() => setPreferencesModalOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configurer mes préférences
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6 mt-6">
              <PropertyAlertsSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <PreferencesModal 
        open={preferencesModalOpen}
        onOpenChange={setPreferencesModalOpen}
      />

      <Footer />
    </div>
  );
};

export default Profile;
