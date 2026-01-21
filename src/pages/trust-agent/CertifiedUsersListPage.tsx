import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Mail,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';

interface CertifiedUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  oneci_verified: boolean;
  trust_score: number;
  facial_verification_status: string;
  user_type: string;
  created_at: string;
  updated_at: string;
  // Additional verification fields
  oneci_number?: string | null;
  oneci_verification_date?: string | null;
  bio?: string | null;
}

type FilterType =
  | 'all'
  | 'verified'
  | 'partial'
  | 'oneci'
  | 'facial'
  | 'locataire'
  | 'proprietaire'
  | 'agence'
  | 'admin_ansut'
  | 'trust_agent';

export default function CertifiedUsersListPage() {
  const [users, setUsers] = useState<CertifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadCertifiedUsers();
  }, []);

  const loadCertifiedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply filter
    switch (activeFilter) {
      case 'verified':
        filtered = users.filter((u) => u.is_verified);
        break;
      case 'partial':
        filtered = users.filter(
          (u) => (u.oneci_verified || u.facial_verification_status !== 'none') && !u.is_verified
        );
        break;
      case 'oneci':
        filtered = users.filter((u) => u.oneci_verified);
        break;
      case 'facial':
        filtered = users.filter((u) => u.facial_verification_status !== 'none');
        break;
      case 'locataire':
      case 'proprietaire':
      case 'agence':
      case 'admin_ansut':
      case 'trust_agent':
        filtered = users.filter((u) => u.user_type === activeFilter);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.phone?.includes(query) ||
          u.city?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, activeFilter, searchQuery]);

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'locataire':
        return 'Locataire';
      case 'proprietaire':
        return 'Propriétaire';
      case 'agence':
        return 'Agence';
      case 'admin_ansut':
        return 'Admin ANSUT';
      case 'trust_agent':
        return 'Agent de confiance';
      default:
        return userType;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'locataire':
        return 'bg-blue-100 text-blue-800';
      case 'proprietaire':
        return 'bg-purple-100 text-purple-800';
      case 'agence':
        return 'bg-orange-100 text-orange-800';
      case 'admin_ansut':
        return 'bg-red-100 text-red-800';
      case 'trust_agent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatus = (user: CertifiedUser) => {
    if (user.is_verified) return { label: 'Vérifié', color: 'bg-green-100 text-green-800' };
    if (user.oneci_verified || user.facial_verification_status !== 'none') {
      return { label: 'Partiel', color: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'Non vérifié', color: 'bg-gray-100 text-gray-800' };
  };

  const getVerificationScore = (user: CertifiedUser) => {
    let score = 0;
    if (user.is_verified) score += 45;
    if (user.oneci_verified) score += 35;
    if (user.facial_verification_status === 'verified') score += 20;
    return score;
  };

  const exportUsers = async () => {
    try {
      const csvContent = [
        ['Nom', 'Email', 'Téléphone', 'Ville', 'Statut', 'ONECI', 'Facial', 'Trust Score'],
        ...filteredUsers.map((u) => [
          u.full_name || '',
          u.email,
          u.phone || '',
          u.city || '',
          getVerificationStatus(u).label,
          u.oneci_verified ? 'Oui' : 'Non',
          u.facial_verification_status !== 'none' ? 'Oui' : 'Non',
          `${getVerificationScore(u)}%`,
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `certified_users_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Export réussi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TrustAgentHeader title="Utilisateurs Certifiés" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Tous les Utilisateurs" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vérifiés</p>
                  <p className="text-2xl font-bold">{users.filter((u) => u.is_verified).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Shield className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ONECI</p>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.oneci_verified).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <UserCheck className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Facial</p>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.facial_verification_status !== 'none').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={exportUsers} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Verification Filters */}
              <div className="w-full text-sm font-medium text-muted-foreground mb-2">
                Filtres de vérification:
              </div>
              {[
                { id: 'all', label: 'Tous', count: users.length },
                {
                  id: 'verified',
                  label: 'Vérifiés',
                  count: users.filter((u) => u.is_verified).length,
                },
                {
                  id: 'partial',
                  label: 'Partiels',
                  count: users.filter(
                    (u) =>
                      (u.oneci_verified || u.facial_verification_status !== 'none') &&
                      !u.is_verified
                  ).length,
                },
                {
                  id: 'oneci',
                  label: 'ONECI',
                  count: users.filter((u) => u.oneci_verified).length,
                },
                {
                  id: 'facial',
                  label: 'Facial',
                  count: users.filter((u) => u.facial_verification_status !== 'none').length,
                },
              ].map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id as FilterType)}
                >
                  {filter.label} ({filter.count})
                </Button>
              ))}

              {/* User Type Filters */}
              <div className="w-full text-sm font-medium text-muted-foreground mb-2 mt-4">
                Filtres par type d'utilisateur:
              </div>
              {[
                {
                  id: 'locataire',
                  label: 'Locataires',
                  count: users.filter((u) => u.user_type === 'locataire').length,
                },
                {
                  id: 'proprietaire',
                  label: 'Propriétaires',
                  count: users.filter((u) => u.user_type === 'proprietaire').length,
                },
                {
                  id: 'agence',
                  label: 'Agences',
                  count: users.filter((u) => u.user_type === 'agence').length,
                },
                {
                  id: 'admin_ansut',
                  label: 'Admins',
                  count: users.filter((u) => u.user_type === 'admin_ansut').length,
                },
                {
                  id: 'trust_agent',
                  label: 'Agents',
                  count: users.filter((u) => u.user_type === 'trust_agent').length,
                },
              ].map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id as FilterType)}
                >
                  {filter.label} ({filter.count})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste de tous les utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((user) => {
                  const status = getVerificationStatus(user);
                  const verificationScore = getVerificationScore(user);

                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name || ''}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <UserCheck className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">
                                {user.full_name || 'Nom non renseigné'}
                              </h3>
                              <Badge className={getUserTypeColor(user.user_type)}>
                                {getUserTypeLabel(user.user_type)}
                              </Badge>
                              <Badge className={status.color}>{status.label}</Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </span>
                              )}
                              {user.city && <span>{user.city}</span>}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {user.is_verified && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Identité
                                </Badge>
                              )}
                              {user.oneci_verified && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  ONECI
                                </Badge>
                              )}
                              {user.facial_verification_status === 'verified' && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Facial
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {verificationScore}%
                          </div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              (window.location.href = `/trust-agent/certification/${user.id}`)
                            }
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Voir
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
