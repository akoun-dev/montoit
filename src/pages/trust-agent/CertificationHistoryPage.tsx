import { useState, useEffect, useMemo } from 'react';
import {
  History,
  UserCheck,
  Home,
  Calendar,
  Filter,
  Download,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserCertification {
  id: string;
  full_name: string | null;
  email: string;
  is_verified: boolean;
  oneci_verified: boolean;
  cnam_verified: boolean;
  facial_verification_status: string;
  user_type: string;
  city: string | null;
  updated_at: string;
  created_at: string;
}

interface PropertyCertification {
  id: string;
  title: string;
  address: Record<string, unknown>;
  city: string;
  ansut_verified: boolean;
  ansut_verification_date: string | null;
  ansut_certificate_url: string | null;
  updated_at: string;
  created_at: string;
}

export default function CertificationHistoryPage() {
  const { user } = useAuth();
  const [userCertifications, setUserCertifications] = useState<UserCertification[]>([]);
  const [propertyCertifications, setPropertyCertifications] = useState<PropertyCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadCertificationHistory();
  }, [user]);

  const loadCertificationHistory = async () => {
    if (!user) return;

    try {
      // Load user certifications (verified users)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_verified, oneci_verified, cnam_verified, facial_verification_status, user_type, city, updated_at, created_at')
        .or('is_verified.eq.true,oneci_verified.eq.true,cnam_verified.eq.true')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (usersError) {
        console.warn('Could not load user certifications:', usersError);
      } else {
        setUserCertifications((usersData || []) as UserCertification[]);
      }

      // Load property certifications (ANSUT verified properties)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, address, city, ansut_verified, ansut_verification_date, ansut_certificate_url, updated_at, created_at')
        .eq('ansut_verified', true)
        .order('ansut_verification_date', { ascending: false })
        .limit(100);

      if (propertiesError) {
        console.warn('Could not load property certifications:', propertiesError);
      } else {
        setPropertyCertifications((propertiesData || []) as PropertyCertification[]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const combinedCertifications = useMemo(() => {
    const items: Array<{ type: 'user' | 'property'; data: UserCertification | PropertyCertification; date: string }> = [];

    // Add user certifications
    userCertifications.forEach((u) => {
      items.push({
        type: 'user',
        data: u,
        date: u.updated_at,
      });
    });

    // Add property certifications
    propertyCertifications.forEach((p) => {
      items.push({
        type: 'property',
        data: p,
        date: p.ansut_verification_date || p.updated_at,
      });
    });

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userCertifications, propertyCertifications]);

  const filteredCertifications = useMemo(() => {
    return combinedCertifications.filter((item) => {
      // Tab filter
      if (activeTab === 'users' && item.type !== 'user') return false;
      if (activeTab === 'properties' && item.type !== 'property') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (item.type === 'user') {
          const user = item.data as UserCertification;
          return (
            user.full_name?.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.city?.toLowerCase().includes(query)
          );
        } else {
          const prop = item.data as PropertyCertification;
          return (
            prop.title.toLowerCase().includes(query) ||
            prop.city.toLowerCase().includes(query)
          );
        }
      }

      return true;
    });
  }, [combinedCertifications, activeTab, searchQuery]);

  const stats = useMemo(() => ({
    total: userCertifications.length + propertyCertifications.length,
    users: userCertifications.length,
    properties: propertyCertifications.length,
    thisMonth: combinedCertifications.filter((item) => {
      const logDate = new Date(item.date);
      const now = new Date();
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }).length,
  }), [userCertifications, propertyCertifications, combinedCertifications]);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'Nom/Titre', 'Détails'].join(','),
      ...filteredCertifications.map((item) => {
        if (item.type === 'user') {
          const user = item.data as UserCertification;
          const verifications = [
            user.is_verified ? 'Identité' : null,
            user.oneci_verified ? 'ONECI' : null,
            user.cnam_verified ? 'CNAM' : null,
          ].filter(Boolean).join(', ');
          return [
            format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
            'Utilisateur',
            user.full_name || user.email,
            `${verifications} - ${user.user_type}`,
          ].join(',');
        } else {
          const prop = item.data as PropertyCertification;
          return [
            format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
            'Propriété',
            prop.title,
            `${prop.city}`,
          ].join(',');
        }
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certifications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Export téléchargé');
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Historique des Certifications" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.users}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Home className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.properties}</p>
                  <p className="text-sm text-muted-foreground">Propriétés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                  <p className="text-sm text-muted-foreground">Ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, titre, ville..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all" className="flex items-center justify-center gap-2">
              <Filter className="h-4 w-4" />
              Toutes ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-center gap-2">
              <UserCheck className="h-4 w-4" />
              Utilisateurs ({stats.users})
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              Propriétés ({stats.properties})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-20" />
                  </Card>
                ))}
              </div>
            ) : filteredCertifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune certification trouvée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCertifications.map((item, index) => {
                  const isUserCert = item.type === 'user';
                  const Icon = isUserCert ? UserCheck : Home;

                  if (isUserCert) {
                    const user = item.data as UserCertification;
                    return (
                      <Card key={`user-${user.id}-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-blue-100">
                              <Icon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold">
                                    Certification Utilisateur
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {user.full_name || user.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.city && `${user.city} • `}{user.user_type}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="default">Utilisateur</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(item.date), 'dd MMM yyyy à HH:mm', {
                                      locale: fr,
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Verification badges */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge
                                  variant={user.is_verified ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  Identité {user.is_verified ? '✓' : '✗'}
                                </Badge>
                                <Badge
                                  variant={user.oneci_verified ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  ONECI {user.oneci_verified ? '✓' : '✗'}
                                </Badge>
                                <Badge
                                  variant={user.cnam_verified ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  CNAM {user.cnam_verified ? '✓' : '✗'}
                                </Badge>
                                {user.facial_verification_status && user.facial_verification_status !== 'none' && (
                                  <Badge variant="outline" className="text-xs">
                                    Facial ✓
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  } else {
                    const prop = item.data as PropertyCertification;
                    return (
                      <Card key={`prop-${prop.id}-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-green-100">
                              <Icon className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold">
                                    Certification Propriété ANSUT
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {prop.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {prop.city}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="secondary">Propriété</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(item.date), 'dd MMM yyyy à HH:mm', {
                                      locale: fr,
                                    })}
                                  </span>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="text-xs">
                                    Certifié ANSUT ✓
                                  </Badge>
                                  {prop.ansut_certificate_url && (
                                    <a
                                      href={prop.ansut_certificate_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      Voir le certificat
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
