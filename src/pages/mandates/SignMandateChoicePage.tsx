/**
 * Page de signature de mandat avec choix de méthode
 * Accessible sans restriction de rôle (via le lien direct)
 * Permet de choisir entre signature manuscrite et CryptoNeo OTP
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSignature,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Percent,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
  PenTool,
  Smartphone,
  Shield,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import Button from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MandateDetails {
  id: string;
  mandate_scope: string;
  start_date: string;
  end_date: string | null;
  commission_rate: number;
  status: string;
  cryptoneo_signature_status: string | null;
  owner_signed_at: string | null;
  agency_signed_at: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    price?: number;
  };
  agency?: {
    id: string;
    agency_name: string;
    email?: string;
    phone?: string;
  };
  owner?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
}

type SignatureMethod = 'handwritten' | 'cryptoneo' | null;
type SignatureStep = 'viewing' | 'method-choice' | 'signing' | 'complete' | 'error';

export default function SignMandateChoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mandate, setMandate] = useState<MandateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<SignatureStep>('viewing');
  const [signerType, setSignerType] = useState<'owner' | 'agency' | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<SignatureMethod>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Fetch mandate on mount
  useEffect(() => {
    if (!id) return;
    fetchMandate();
  }, [id]);

  const fetchMandate = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city, neighborhood, price),
          agency:agencies(id, agency_name, email, phone),
          owner:profiles(full_name, email, phone)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Mandat introuvable');
        setError('Mandat introuvable');
        setCurrentStep('error');
        return;
      }

      setMandate(data as MandateDetails);

      // Determine signer type based on logged-in user
      if (user) {
        if (data.owner_id === user.id) {
          setSignerType('owner');
        } else if (data.agency?.id === user.id || data.agency?.user_id === user.id) {
          setSignerType('agency');
        }
      }

      // Check if already signed by current user
      const alreadySigned =
        (signerType === 'owner' && data.owner_signed_at) ||
        (signerType === 'agency' && data.agency_signed_at);

      if (alreadySigned) {
        setCurrentStep('complete');
      } else {
        setCurrentStep('method-choice');
      }
    } catch (err) {
      console.error('Error fetching mandate:', err);
      setError('Erreur lors du chargement du mandat');
      setCurrentStep('error');
      toast.error('Erreur lors du chargement du mandat');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method: SignatureMethod) => {
    setSelectedMethod(method);
    setCurrentStep('signing');
  };

  const handleSignInRequired = () => {
    // Store the mandate ID for redirect after login
    sessionStorage.setItem('pendingMandateId', id || '');
    navigate('/connexion', { state: { redirectTo: `/mandat/signer/${id}` } });
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      can_view_properties: 'Voir les propriétés',
      can_edit_properties: 'Modifier les propriétés',
      can_delete_properties: 'Supprimer les propriétés',
      can_create_properties: 'Créer des propriétés',
      can_view_applications: 'Voir les candidatures',
      can_manage_applications: 'Gérer les candidatures',
      can_create_leases: 'Créer des baux',
      can_view_financials: 'Accès financier',
      can_manage_maintenance: 'Gérer la maintenance',
      can_communicate_tenants: 'Communiquer avec locataires',
      can_manage_documents: 'Gérer les documents',
    };
    return labels[permission] || permission;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (currentStep === 'error' || !mandate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error || 'Mandat introuvable'}</p>
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Mandat déjà signé !</h2>
              <p className="text-green-700 mb-6">
                Ce mandat a déjà été signé par votre partie.
              </p>
              <Button
                onClick={() => navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats')}
              >
                Voir mes mandats
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <FileSignature className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Signature du Mandat</h1>
          </div>
          <p className="text-gray-600">
            Choisissez votre méthode de signature préférée
          </p>
        </div>

        {/* Mandate Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Détails du Mandat
            </CardTitle>
            <CardDescription>Vérifiez les informations avant de signer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Propriétaire</span>
                  {mandate.owner_signed_at && (
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{mandate.owner?.full_name || 'Propriétaire'}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Agence</span>
                  {mandate.agency_signed_at && (
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{mandate.agency?.agency_name || 'Agence'}</p>
              </div>
            </div>

            {/* Property or Scope */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Portée du mandat</h4>
              {mandate.mandate_scope === 'all_properties' ? (
                <p className="text-sm text-gray-600">
                  Ce mandat couvre <strong>tous les biens immobiliers</strong>
                </p>
              ) : mandate.property ? (
                <div>
                  <p className="font-medium">{mandate.property.title}</p>
                  <p className="text-sm text-gray-600">
                    {mandate.property.city}
                    {mandate.property.neighborhood && `, ${mandate.property.neighborhood}`}
                  </p>
                  {mandate.property.price && (
                    <p className="text-sm font-medium text-orange-600">
                      {mandate.property.price.toLocaleString()} FCFA/mois
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Bien spécifique</p>
              )}
            </div>

            {/* Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Date de début</span>
                </div>
                <p className="font-medium">
                  {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Commission</span>
                </div>
                <p className="font-medium">{mandate.commission_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Required Notice */}
        {!user && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Connexion requise</p>
                  <p className="text-sm text-amber-700">
                    Vous devez être connecté pour signer ce mandat
                  </p>
                </div>
                <Button onClick={handleSignInRequired}>
                  Se connecter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Method Choice */}
        {user && currentStep === 'method-choice' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-6">
              Choisissez votre méthode de signature
            </h2>

            {/* Handwritten Signature Option */}
            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-500 border-2"
              onClick={() => handleMethodSelect('handwritten')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PenTool className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Signature manuscrite</h3>
                    <p className="text-sm text-gray-600">
                      Dessinez votre signature directement sur l'écran avec votre doigt ou un stylet
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        Simple et rapide
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        Sans SMS
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            {/* CryptoNeo OTP Signature Option */}
            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-500 border-2"
              onClick={() => handleMethodSelect('cryptoneo')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Signature SMS (CryptoNeo)</h3>
                    <p className="text-sm text-gray-600">
                      Recevez un code de sécurité par SMS pour signer électroniquement
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Sécurisé
                      </Badge>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Valeur légale
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Sécurité et validité légale</p>
                    <p>
                      Les deux méthodes de signature ont une valeur légale. Vos données sont
                      protégées et la signature est enregistrée de manière sécurisée conformément
                      aux dispositions de la loi ivoirienne sur les transactions électroniques.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Signing Step - Redirect to appropriate page */}
        {user && currentStep === 'signing' && selectedMethod && (
          <Card>
            <CardContent className="pt-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
              <p className="text-gray-600">Redirection vers la page de signature...</p>
              {(() => {
                // Redirect to appropriate signature page based on signer type
                if (selectedMethod === 'handwritten') {
                  const path = signerType === 'owner'
                    ? `/proprietaire/mes-mandats/signer/${id}`
                    : `/agences/mes-mandats/signer/${id}`;
                  navigate(path, { replace: true });
                } else if (selectedMethod === 'cryptoneo') {
                  navigate(`/mandat/signer-otp/${id}`, { replace: true });
                }
                return null;
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
