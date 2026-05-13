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
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Camera,
  Edit,
  History,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { cn } from '@/shared/lib/utils';
import { ScoringService } from '@/services/scoringService';

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
  profile_setup_completed?: boolean | null;
  gender?: string | null;
  address?: Record<string, unknown> | string | null;
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

interface DossierApplication {
  id: string;
  status: string;
  submitted_at?: string | null;
}

export default function UserCertificationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [dossierApplication, setDossierApplication] = useState<DossierApplication | null>(null);
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

      // Get dossier application
      const { data: dossierData, error: dossierError } = await supabase
        .from('verification_applications')
        .select('*')
        .eq('user_id', userId)
        .eq('dossier_type', 'tenant')
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (dossierError) {
        console.warn('Could not fetch dossier application:', dossierError);
      } else {
        setDossierApplication(dossierData?.[0] || null);
      }

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
      case 'tenant':
        return 'Locataire';
      case 'owner':
        return 'Propriétaire';
      case 'agency':
        return 'Agence';
      case 'admin':
        return 'Admin ANSUT';
      case 'trust_agent':
        return 'Tiers de confiance';
      default:
        return userType;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'tenant':
        return 'bg-blue-100 text-blue-800';
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'agency':
        return 'bg-orange-100 text-orange-800';
      case 'admin':
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
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Vérifié
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      case 'expired':
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
              {user.user_type === 'agency' && user.agency_name && (
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
              {(() => {
                const profileScoreResult = ScoringService.calculateProfileScore(user);
                const profileComplete = ScoringService.isProfileComplete(profileScoreResult.details);
                const profileCompletionChecks = [
                  { label: 'Nom', ok: profileScoreResult?.details.fullName ?? false },
                  { label: 'Téléphone', ok: profileScoreResult?.details.phone ?? false },
                  { label: 'Ville', ok: profileScoreResult?.details.city ?? false },
                  { label: 'Adresse', ok: profileScoreResult?.details.address ?? false },
                  { label: 'Genre', ok: profileScoreResult?.details.gender ?? false },
                ];

                return (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Profil complet */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">Profil complet</span>
                          </div>
                          {profileComplete ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complété
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Incomplet
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {profileComplete
                            ? 'Informations de base complétées'
                            : `${profileCompletionChecks.filter((c) => c.ok).length}/5 champs remplis`}
                        </p>
                        <div className="space-y-1">
                          {profileCompletionChecks.map((check, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              {check.ok ? (
                                <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className={check.ok ? 'text-foreground' : 'text-muted-foreground'}>
                                {check.label}
                              </span>
                            </div>
                          ))}
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
                        <p className="text-sm text-muted-foreground">
                          {user.oneci_verified ? 'Carte d\'identité vérifiée' : 'Pièce d\'identité requise'}
                        </p>
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
                            <span className="font-medium">Reconnaissance faciale</span>
                          </div>
                          {user.facial_verification_status === 'verified' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Vérifié
                            </Badge>
                          ) : user.facial_verification_status === 'pending' || user.facial_verification_status === 'in_review' ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3 mr-1" />
                              En cours
                            </Badge>
                          ) : user.facial_verification_status === 'failed' ? (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Échoué
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Non vérifié
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user.facial_verification_status === 'verified'
                            ? 'Vérification biométrique validée'
                            : user.facial_verification_status === 'pending' || user.facial_verification_status === 'in_review'
                              ? 'Vérification biométrique en cours'
                              : user.facial_verification_status === 'failed'
                                ? 'Vérification biométrique échouée'
                                : 'Vérification biométrique requise'}
                        </p>
                      </div>

                      {/* Dossier de certification */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">Dossier de certification</span>
                          </div>
                          {dossierApplication?.status === 'approved' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Validé
                            </Badge>
                          ) : dossierApplication?.status === 'pending' || dossierApplication?.status === 'in_review' ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3 mr-1" />
                              En cours
                            </Badge>
                          ) : dossierApplication?.status === 'rejected' ? (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Refusé
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="h-3 w-3 mr-1" />
                              Non soumis
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {dossierApplication?.status === 'approved'
                            ? 'Certification ANSUT obtenue'
                            : dossierApplication?.status === 'pending'
                              ? 'Dossier soumis - En attente'
                              : dossierApplication?.status === 'in_review'
                                ? 'Dossier en cours d\'examen'
                                : dossierApplication?.status === 'rejected'
                                  ? 'Dossier refusé'
                                  : dossierApplication?.status === 'more_info_requested'
                                    ? 'Informations supplémentaires demandées'
                                    : 'Documents pour certification'}
                        </p>
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
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
