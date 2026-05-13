/**
 * Page de signature de mandat avec choix de méthode
 * Utilisée dans les routes propriétaires et agences avec sidebar
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
  ChevronRight,
  Home,
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

      // Fetch mandate without joins first
      const { data: mandateData, error: mandateError } = await supabase
        .from('agency_mandates')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (mandateError || !mandateData) {
        console.error('Mandate not found:', mandateError);
        toast.error('Mandat introuvable');
        navigate(-1);
        return;
      }

      console.log('Mandate data:', mandateData);

      // Fetch property separately
      let property = null;
      if (mandateData.property_id) {
        const { data: propData } = await supabase
          .from('properties')
          .select('id, title, city, neighborhood, price')
          .eq('id', mandateData.property_id)
          .maybeSingle();
        property = propData;
      }

      // Fetch agency profile separately
      let agency = null;
      if (mandateData.agency_id) {
        const { data: agencyData } = await supabase
          .from('profiles')
          .select('id, agency_name, email, phone')
          .eq('id', mandateData.agency_id)
          .maybeSingle();
        agency = agencyData;
      }

      // Fetch owner profile separately
      let owner = null;
      if (mandateData.owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .eq('id', mandateData.owner_id)
          .maybeSingle();
        owner = ownerData;
      }

      const fullMandate = {
        ...mandateData,
        property,
        agency,
        owner,
      } as MandateDetails;

      console.log('Full mandate:', fullMandate);

      setMandate(fullMandate);

      // Determine signer type
      if (user) {
        if (user.id === fullMandate.owner_id) {
          setSignerType('owner');
        } else if (user.id === fullMandate.agency?.id) {
          setSignerType('agency');
        }
      }

      // Determine current step based on signature status
      if (fullMandate.cryptoneo_signature_status === 'completed' ||
          (fullMandate.owner_signed_at && fullMandate.agency_signed_at)) {
        setCurrentStep('complete');
      } else if (user && (fullMandate.owner_signed_at || fullMandate.agency_signed_at)) {
        // Already signed by one party, go to method choice
        setCurrentStep('method-choice');
      } else {
        setCurrentStep('viewing');
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
    navigate('/connexion', { state: { redirectTo: window.location.pathname } });
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  if (currentStep === 'error' || !mandate) {
    return (
      <div className="text-center py-20 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[#2C1810] mb-2">Mandat introuvable</h3>
        <p className="text-[#6B5A4E] mb-6">Le mandat que vous recherchez n'existe pas.</p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="text-center py-20 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-[#2C1810] mb-2">Mandat déjà signé !</h2>
        <p className="text-[#6B5A4E] mb-6">
          Ce mandat a déjà été signé par votre partie.
        </p>
        <Button
          onClick={() => navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats')}
        >
          Voir mes mandats
        </Button>
      </div>
    );
  }

  if (currentStep === 'viewing') {
    return (
      <div className="space-y-6">
        {/* Mandate Summary */}
        <Card className="border-[#EFEBE9] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#2C1810]">Détails du Mandat</CardTitle>
            <CardDescription className="text-[#6B5A4E]">
              Vérifiez les informations avant de signer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-[#F16522]" />
                  <span className="font-medium text-[#2C1810]">Propriétaire</span>
                  {mandate.owner_signed_at && (
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#6B5A4E]">{mandate.owner?.full_name || 'Propriétaire'}</p>
              </div>

              <div className="p-4 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-[#F16522]" />
                  <span className="font-medium text-[#2C1810]">Agence</span>
                  {mandate.agency_signed_at && (
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#6B5A4E]">{mandate.agency?.agency_name || 'Agence'}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
                <Calendar className="h-4 w-4 text-[#F16522]" />
                <span>Début: {format(new Date(mandate.start_date), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
                <Percent className="h-4 w-4 text-[#F16522]" />
                <span>Commission: {mandate.commission_rate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth required message */}
        {!user ? (
          <Card className="border-[#F16522] bg-[#FFF5F0]">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 text-[#F16522] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#2C1810] mb-2">Connexion requise</h3>
              <p className="text-[#6B5A4E] mb-6">
                Vous devez être connecté pour signer ce mandat.
              </p>
              <Button onClick={handleSignInRequired}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setCurrentStep('method-choice')}
            className="w-full"
            size="lg"
          >
            Continuer vers la signature
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mandate Details Card */}
      <Card className="border-[#EFEBE9] shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2C1810]">
            <FileText className="h-5 w-5 text-[#F16522]" />
            Détails du Mandat
          </CardTitle>
          <CardDescription className="text-[#6B5A4E]">
            Vérifiez les informations avant de signer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property */}
          {mandate.property && (
            <div className="p-4 border border-[#EFEBE9] rounded-xl">
              <h4 className="font-medium mb-2 text-[#2C1810]">Bien immobilier</h4>
              <p className="text-sm font-medium text-[#2C1810]">{mandate.property.title}</p>
              <p className="text-sm text-[#6B5A4E]">{mandate.property.city}{mandate.property.neighborhood && ` • ${mandate.property.neighborhood}`}</p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
              <Calendar className="h-4 w-4 text-[#F16522]" />
              <span>Début: {format(new Date(mandate.start_date), 'dd MMM yyyy', { locale: fr })}</span>
            </div>
            {mandate.end_date && (
              <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
                <Calendar className="h-4 w-4 text-[#F16522]" />
                <span>Fin: {format(new Date(mandate.end_date), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
              <Percent className="h-4 w-4 text-[#F16522]" />
              <span>Commission: {mandate.commission_rate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Method Choice */}
      {user && currentStep === 'method-choice' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center text-[#2C1810] mb-6">
            Choisissez votre méthode de signature
          </h2>

          {/* Handwritten Signature Option */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-[#F16522] border-2 shadow-sm"
            onClick={() => handleMethodSelect('handwritten')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#E8F2FF] rounded-xl flex items-center justify-center flex-shrink-0">
                  <PenTool className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 text-[#2C1810]">Signature manuscrite</h3>
                  <p className="text-sm text-[#6B5A4E]">
                    Dessinez votre signature directement sur l'écran
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      Simple et rapide
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#6B5A4E]" />
              </div>
            </CardContent>
          </Card>

          {/* CryptoNeo OTP Signature Option */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-[#F16522] border-2 shadow-sm"
            onClick={() => handleMethodSelect('cryptoneo')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#FFF5F0] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-8 w-8 text-[#F16522]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 text-[#2C1810]">Signature SMS (CryptoNeo)</h3>
                  <p className="text-sm text-[#6B5A4E]">
                    Recevez un code de sécurité par SMS
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[#F16522] border-orange-300">
                      Sécurisé
                    </Badge>
                    <Badge variant="outline" className="text-[#F16522] border-orange-300">
                      Valeur légale
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#6B5A4E]" />
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-[#EFEBE9] bg-[#FAF7F4] shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-[#F16522] mt-0.5" />
                <div className="text-sm text-[#6B5A4E]">
                  <p className="font-medium mb-1 text-[#2C1810]">Sécurité et validité légale</p>
                  <p>
                    Les deux méthodes de signature ont une valeur légale. Vos données sont
                    protégées et la signature est enregistrée de manière sécurisée.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signing Step - Redirect to appropriate page */}
      {user && currentStep === 'signing' && selectedMethod && (
        <Card className="shadow-sm border-[#EFEBE9]">
          <CardContent className="pt-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#F16522] mx-auto mb-4" />
            <p className="text-[#6B5A4E]">Redirection vers la page de signature...</p>
            {(() => {
              // Redirect to appropriate signature page based on signer type
              if (selectedMethod === 'handwritten') {
                const path = signerType === 'owner'
                  ? `/proprietaire/mes-mandats/signer/${id}`
                  : `/agences/mandats/signer/${id}`;
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
  );
}
