import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  User,
  Building,
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';

type DossierType = 'tenant' | 'owner' | 'agency';
type DossierStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

interface Dossier {
  id: string;
  type: DossierType;
  full_name: string;
  email: string;
  phone: string | null;
  verification_status: DossierStatus;
  submitted_at: string;
  reviewed_at: string | null;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_review: { label: 'En cours', variant: 'default' as const, color: 'bg-blue-100 text-blue-700', icon: Eye },
  approved: { label: 'Approuvé', variant: 'secondary' as const, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejeté', variant: 'destructive' as const, color: 'bg-red-100 text-red-700', icon: XCircle },
};

const TYPE_CONFIG = {
  tenant: { label: 'Locataire', icon: User, color: 'bg-blue-100 text-blue-700' },
  owner: { label: 'Propriétaire', icon: Building, color: 'bg-orange-100 text-orange-700' },
  agency: { label: 'Agence', icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
};

export default function DossiersListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DossierType>('tenant');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DossierStatus | 'all'>('all');

  const [dossiers, setDossiers] = useState<Record<DossierType, Dossier[]>>({
    tenant: [],
    owner: [],
    agency: [],
  });

  useEffect(() => {
    loadDossiers();
  }, []);

  const loadDossiers = async () => {
    try {
      setLoading(true);

      // Load tenant dossiers from tenant_applications
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_applications')
        .select('id, full_name, email, phone, verification_status, submitted_at, reviewed_at')
        .order('submitted_at', { ascending: false });

      if (tenantError && tenantError.code !== 'PGRST116') {
        console.error('Error loading tenant dossiers:', tenantError);
      }

      // Note: Owner and Agency dossiers would be loaded from their respective tables
      // For now, we'll just use empty arrays
      setDossiers({
        tenant: (tenantData || []) as Dossier[],
        owner: [],
        agency: [],
      });
    } catch (error) {
      console.error('Error loading dossiers:', error);
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = dossiers[activeTab]?.filter((dossier) => {
    // Status filter
    if (statusFilter !== 'all' && dossier.verification_status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        dossier.full_name.toLowerCase().includes(query) ||
        dossier.email.toLowerCase().includes(query) ||
        dossier.phone?.includes(query)
      );
    }

    return true;
  }) || [];

  const stats = {
    tenant: {
      total: dossiers.tenant.length,
      pending: dossiers.tenant.filter((d) => d.verification_status === 'pending').length,
      in_review: dossiers.tenant.filter((d) => d.verification_status === 'in_review').length,
      approved: dossiers.tenant.filter((d) => d.verification_status === 'approved').length,
      rejected: dossiers.tenant.filter((d) => d.verification_status === 'rejected').length,
    },
    owner: {
      total: dossiers.owner.length,
      pending: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    },
    agency: {
      total: dossiers.agency.length,
      pending: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    },
  };

  const handleDossierClick = (dossier: Dossier) => {
    const basePath = `/trust-agent/dossiers/${activeTab}`;
    navigate(`${basePath}/${dossier.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <h1 className="text-2xl font-bold">Validation des Dossiers</h1>
          <p className="text-muted-foreground">Gérez les dossiers de vérification des locataires, propriétaires et agences</p>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Type Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DossierType)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tenant" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Locataires
              <Badge variant="secondary">{stats.tenant.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="owner" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Propriétaires
              <Badge variant="secondary">{stats.owner.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="agency" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Agences
              <Badge variant="secondary">{stats.agency.total}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'secondary' : 'outline'}
                  size="small"
                  onClick={() => setStatusFilter('all')}
                >
                  Tous
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'secondary' : 'outline'}
                  size="small"
                  onClick={() => setStatusFilter('pending')}
                >
                  En attente
                </Button>
                <Button
                  variant={statusFilter === 'in_review' ? 'secondary' : 'outline'}
                  size="small"
                  onClick={() => setStatusFilter('in_review')}
                >
                  En cours
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'secondary' : 'outline'}
                  size="small"
                  onClick={() => setStatusFilter('approved')}
                >
                  Approuvés
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'secondary' : 'outline'}
                  size="small"
                  onClick={() => setStatusFilter('rejected')}
                >
                  Rejetés
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{stats[activeTab].total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{stats[activeTab].pending}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats[activeTab].in_review}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats[activeTab].approved}</p>
                  <p className="text-sm text-muted-foreground">Approuvés</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{stats[activeTab].rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejetés</p>
                </CardContent>
              </Card>
            </div>

            {/* Dossiers List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-24" />
                  </Card>
                ))}
              </div>
            ) : filteredDossiers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun dossier trouvé</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredDossiers.map((dossier) => {
                  const statusConfig = STATUS_CONFIG[dossier.verification_status];
                  const StatusIcon = statusConfig.icon;
                  const typeConfig = TYPE_CONFIG[activeTab];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <Card
                      key={dossier.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleDossierClick(dossier)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${typeConfig.color}`}>
                              <TypeIcon className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{dossier.full_name}</h3>
                                <Badge variant={statusConfig.variant} className={statusConfig.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{dossier.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Soumis le {new Date(dossier.submitted_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
