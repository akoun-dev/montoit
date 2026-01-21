import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  Camera,
  Edit,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { cn } from '@/shared/lib/utils';

interface UserDetails {
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
  bio?: string | null;
  oneci_number?: string | null;
  oneci_verification_date?: string | null;
  agency_name?: string | null;
  agency_description?: string | null;
}

interface VerificationRecord {
  id: string;
  verification_type: string;
  status: string;
  created_at: string;
  verified_at?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export default function UserCertificationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadUserDetails(id);
    }
  }, [id]);

  const loadUserDetails = async (userId: string) => {
    setLoading(true);
    try {
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Get verification history
      const { data: verificationData, error: verificationError } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (verificationError) {
        console.warn('Could not fetch verification history:', verificationError);
      } else {
        setVerificationHistory(verificationData || []);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Erreur lors du chargement des détails utilisateur');
      navigate('/trust-agent/certifications/users');
    } finally {
      setLoading(false);
    }
  };

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

  const getVerificationTypeLabel = (type: string) => {
    switch (type) {
      case 'identity':
        return 'Identité';
      case 'address':
        return 'Adresse';
      case 'income':
        return 'Revenus';
      case 'professional':
        return 'Professionnel';
      default:
        return type;
    }
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'verifie':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Vérifié
          </Badge>
        );
      case 'en_attente':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'rejete':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      case 'expiré':
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <XCircle className="h-3 w-3 mr-1" />
            Expiré
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TrustAgentHeader title="Détails Utilisateur" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TrustAgentHeader title="Utilisateur non trouvé" />
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Utilisateur non trouvé</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/trust-agent/certifications/users')}
              >
                Retour à la liste
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Détails de Certification" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Header Actions */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/trust-agent/certifications/users')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
          <Button
            onClick={() => navigate(`/trust-agent/certifications/users/certify?id=${user.id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier la certification
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil Utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || ''}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{user.full_name || 'Nom non renseigné'}</h3>
                  <Badge className={cn(getUserTypeColor(user.user_type), 'mt-2')}>
                    {getUserTypeLabel(user.user_type)}
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                {user.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.city}</span>
                  </div>
                )}
              </div>

              {/* Trust Score */}
              <div className="p-4 rounded-lg bg-primary/10">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Trust Score</span>
                  <span className="text-2xl font-bold text-primary">{user.trust_score}%</span>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                </div>
              )}

              {/* Agency Info */}
              {user.user_type === 'agence' && user.agency_name && (
                <div>
                  <h4 className="font-medium mb-2">Informations Agence</h4>
                  <p className="text-sm font-medium">{user.agency_name}</p>
                  {user.agency_description && (
                    <p className="text-sm text-muted-foreground mt-1">{user.agency_description}</p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Mis à jour le {new Date(user.updated_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Statuts de Certification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Identity Verification */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Vérification d'identité</span>
                    </div>
                    {user.is_verified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Non vérifié
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ONECI Verification */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Vérification ONECI</span>
                    </div>
                    {user.oneci_verified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Non vérifié
                      </Badge>
                    )}
                  </div>
                  {user.oneci_number && (
                    <p className="text-sm text-muted-foreground">N° ONECI: {user.oneci_number}</p>
                  )}
                  {user.oneci_verification_date && (
                    <p className="text-sm text-muted-foreground">
                      Vérifié le{' '}
                      {new Date(user.oneci_verification_date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {/* Facial Verification */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Vérification faciale</span>
                    </div>
                    {user.facial_verification_status === 'verified' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        {user.facial_verification_status || 'Non vérifié'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Verification History */}
              {verificationHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historique des vérifications
                  </h3>
                  <div className="space-y-3">
                    {verificationHistory.map((record) => (
                      <div key={record.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {getVerificationTypeLabel(record.verification_type)}
                          </span>
                          {getVerificationStatusBadge(record.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Créé le {new Date(record.created_at).toLocaleDateString('fr-FR')}
                          {record.verified_at && (
                            <span>
                              {' • '}Vérifié le{' '}
                              {new Date(record.verified_at).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        {record.notes && <p className="text-sm mt-2">Notes: {record.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
