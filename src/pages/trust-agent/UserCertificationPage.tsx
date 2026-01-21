import { useState } from 'react';
import {
  Search,
  UserCheck,
  Shield,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Upload,
  Camera,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  is_verified: boolean;
  oneci_verified: boolean;
  cnam_verified: boolean;
  trust_score: number;
  oneci_number: string | null;
}

export default function UserCertificationPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [certifying, setCertifying] = useState(false);

  // Certification form
  const [certificationData, setCertificationData] = useState({
    identityVerified: false,
    oneciNumber: '',
    oneciVerified: false,
    cnamNumber: '',
    cnamVerified: false,
    notes: '',
    photoVerified: false,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(
          `email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`
        )
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Aucun utilisateur trouvé');
          setSearchedUser(null);
        } else {
          throw error;
        }
      } else {
        setSearchedUser(data as UserProfile);
        // Pre-fill existing verification data
        setCertificationData((prev) => ({
          ...prev,
          identityVerified: data.is_verified || false,
          oneciVerified: data.oneci_verified || false,
          oneciNumber: data.oneci_number || '',
          cnamVerified: data.cnam_verified || false,
        }));
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async () => {
    if (!searchedUser || !user) return;

    setCertifying(true);
    try {
      // Update profile with verification data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_verified: certificationData.identityVerified,
          oneci_verified: certificationData.oneciVerified,
          oneci_number: certificationData.oneciNumber || null,
          oneci_verification_date: certificationData.oneciVerified
            ? new Date().toISOString()
            : null,
          cnam_verified: certificationData.cnamVerified,
          trust_score: calculateTrustScore(),
        })
        .eq('user_id', searchedUser.user_id);

      if (updateError) throw updateError;

      // Log the certification action
      await supabase.rpc('log_admin_action', {
        p_action: 'USER_CERTIFIED',
        p_entity_type: 'profiles',
        p_entity_id: searchedUser.user_id,
        p_details: {
          certified_by: user.email,
          identity_verified: certificationData.identityVerified,
          oneci_verified: certificationData.oneciVerified,
          cnam_verified: certificationData.cnamVerified,
          notes: certificationData.notes,
        },
      });

      toast.success('Utilisateur certifié avec succès');

      // Refresh user data
      setSearchedUser((prev) =>
        prev
          ? {
              ...prev,
              is_verified: certificationData.identityVerified,
              oneci_verified: certificationData.oneciVerified,
              cnam_verified: certificationData.cnamVerified,
              trust_score: calculateTrustScore(),
            }
          : null
      );
    } catch (error) {
      console.error('Certification error:', error);
      toast.error('Erreur lors de la certification');
    } finally {
      setCertifying(false);
    }
  };

  const calculateTrustScore = () => {
    let score = 0;
    if (certificationData.identityVerified) score += 30;
    if (certificationData.oneciVerified) score += 35;
    if (certificationData.cnamVerified) score += 25;
    if (certificationData.photoVerified) score += 10;
    return score;
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Certification Utilisateurs" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Rechercher un utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Email, téléphone ou nom..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === 'Enter' && handleSearch()
                }
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {searchedUser && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Profil Utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {searchedUser.avatar_url ? (
                      <img
                        src={searchedUser.avatar_url}
                        alt={searchedUser.full_name || ''}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserCheck className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {searchedUser.full_name || 'Non renseigné'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{searchedUser.email}</p>
                    <p className="text-sm text-muted-foreground">{searchedUser.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Trust Score</p>
                    <p className="text-2xl font-bold text-primary">{searchedUser.trust_score}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <div className="flex items-center gap-2 mt-1">
                      {searchedUser.is_verified ? (
                        <Badge className="bg-green-100 text-green-800">Vérifié</Badge>
                      ) : (
                        <Badge variant="secondary">Non vérifié</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Vérifications actuelles</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={searchedUser.is_verified ? 'default' : 'outline'}
                      className="gap-1"
                    >
                      {searchedUser.is_verified ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Identité
                    </Badge>
                    <Badge
                      variant={searchedUser.oneci_verified ? 'default' : 'outline'}
                      className="gap-1"
                    >
                      {searchedUser.oneci_verified ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      ONECI
                    </Badge>
                    <Badge
                      variant={searchedUser.cnam_verified ? 'default' : 'outline'}
                      className="gap-1"
                    >
                      {searchedUser.cnam_verified ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      CNAM
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certification Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Formulaire de Certification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Identity Verification */}
                <div className="p-4 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <Label>Vérification d'identité (CNI/Passeport)</Label>
                    </div>
                    <Button
                      variant={certificationData.identityVerified ? 'secondary' : 'outline'}
                      size="small"
                      onClick={() =>
                        setCertificationData((prev) => ({
                          ...prev,
                          identityVerified: !prev.identityVerified,
                        }))
                      }
                    >
                      {certificationData.identityVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Vérifié
                        </>
                      ) : (
                        'Marquer vérifié'
                      )}
                    </Button>
                  </div>
                </div>

                {/* ONECI Verification */}
                <div className="p-4 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <Label>Vérification ONECI</Label>
                    </div>
                    <Button
                      variant={certificationData.oneciVerified ? 'secondary' : 'outline'}
                      size="small"
                      onClick={() =>
                        setCertificationData((prev) => ({
                          ...prev,
                          oneciVerified: !prev.oneciVerified,
                        }))
                      }
                    >
                      {certificationData.oneciVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Vérifié
                        </>
                      ) : (
                        'Marquer vérifié'
                      )}
                    </Button>
                  </div>
                  <Input
                    placeholder="Numéro ONECI"
                    value={certificationData.oneciNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCertificationData((prev) => ({ ...prev, oneciNumber: e.target.value }))
                    }
                  />
                </div>

                {/* CNAM Verification */}
                <div className="p-4 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <Label>Vérification CNAM</Label>
                    </div>
                    <Button
                      variant={certificationData.cnamVerified ? 'secondary' : 'outline'}
                      size="small"
                      onClick={() =>
                        setCertificationData((prev) => ({
                          ...prev,
                          cnamVerified: !prev.cnamVerified,
                        }))
                      }
                    >
                      {certificationData.cnamVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Vérifié
                        </>
                      ) : (
                        'Marquer vérifié'
                      )}
                    </Button>
                  </div>
                  <Input
                    placeholder="Numéro CNAM"
                    value={certificationData.cnamNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCertificationData((prev) => ({ ...prev, cnamNumber: e.target.value }))
                    }
                  />
                </div>

                {/* Photo Verification */}
                <div className="p-4 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <Label>Photo de vérification</Label>
                    </div>
                    <Button
                      variant={certificationData.photoVerified ? 'secondary' : 'outline'}
                      size="small"
                      onClick={() =>
                        setCertificationData((prev) => ({
                          ...prev,
                          photoVerified: !prev.photoVerified,
                        }))
                      }
                    >
                      {certificationData.photoVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Vérifié
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" /> Vérifier
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes de certification</Label>
                  <Textarea
                    placeholder="Observations, remarques..."
                    value={certificationData.notes}
                    onChange={(e) =>
                      setCertificationData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>

                {/* Score Preview */}
                <div className="p-4 rounded-lg bg-primary/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Nouveau Trust Score estimé</span>
                    <span className="text-2xl font-bold text-primary">
                      {calculateTrustScore()}%
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <Button className="w-full" onClick={handleCertify} disabled={certifying}>
                  {certifying ? 'Certification en cours...' : 'Certifier cet utilisateur'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!searchedUser && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Recherchez un utilisateur par email, téléphone ou nom pour commencer la
                certification
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
