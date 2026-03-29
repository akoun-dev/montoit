/**
 * Page de signature électronique du mandat
 * Workflow en 3 étapes: Détails → Signature simple → Confirmation
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
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import type { AgencyMandate } from '@/hooks/useAgencyMandates';
import { FormStepper, FormStepContent, useFormStepper } from '@/shared/ui/FormStepper';
import Button from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AGENCY_ROLES } from '@/shared/constants/roles';

const STEP_LABELS = ['Détails du mandat', 'Acceptation', 'Confirmation'];

export default function SignMandatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [mandate, setMandate] = useState<AgencyMandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedResponsibilities, setAcceptedResponsibilities] = useState(false);
  const [signerType, setSignerType] = useState<'owner' | 'agency' | null>(null);
   
  const [_signatureComplete, setSignatureComplete] = useState(false);

  const { step: currentStep, slideDirection, goToStep, nextStep, prevStep } = useFormStepper(3);

  // Log when step changes to confirmation
  useEffect(() => {
    if (currentStep === 3 && mandate) {
      console.log('[SignMandatePage] Confirmation step - Mandate state:', {
        owner_signed_at: mandate.owner_signed_at,
        agency_signed_at: mandate.agency_signed_at,
        status: mandate.status,
        cryptoneo_signature_status: mandate.cryptoneo_signature_status,
        signerType,
      });
    }
  }, [currentStep, mandate, signerType]);

  // Fetch mandate data - fetch directly from DB instead of relying on local list
  useEffect(() => {
    const fetchMandate = async () => {
      if (!id) return;

      setLoading(true);

      try {
        // Fetch mandate directly from database
        const { data: mandateData, error } = await supabase
          .from('agency_mandates')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching mandate:', error);
          toast.error('Erreur lors du chargement du mandat');
          navigate('/agences/mandats');
          return;
        }

        if (!mandateData) {
          toast.error('Mandat introuvable');
          navigate('/agences/mandats');
          return;
        }

        // Fetch related data separately
        let agencyData = null;
        let propertyData = null;
        let ownerData = null;

        // Fetch agency if exists
        if (mandateData.agency_id) {
          const { data: agency } = await supabase
            .from('agencies')
            .select('agency_name, user_id, logo_url')
            .eq('id', mandateData.agency_id)
            .maybeSingle();
          agencyData = agency;
        }

        // Fetch property if exists
        if (mandateData.property_id) {
          const { data: property } = await supabase
            .from('properties')
            .select('id, title, city, neighborhood, monthly_rent')
            .eq('id', mandateData.property_id)
            .maybeSingle();
          propertyData = property;
        }

        // Fetch owner with more details
        const { data: owner, error: ownerError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, city')
          .eq('id', mandateData.owner_id)
          .single();

        if (ownerError || !owner) {
          console.error('Error fetching owner:', ownerError);
        } else {
          ownerData = owner;
        }

        // Combine all data
        const completeMandate: AgencyMandate = {
          ...mandateData,
          agency: agencyData,
          property: propertyData,
          owner: ownerData,
        } as AgencyMandate;

        console.log('[SignMandatePage] Mandate loaded:', {
          mandateId: mandateData.id,
          ownerId: mandateData.owner_id,
          agencyId: mandateData.agency_id,
          agencyUserId: agencyData?.user_id,
          userId: user?.id,
          owner_signed_at: mandateData.owner_signed_at,
          agency_signed_at: mandateData.agency_signed_at,
        });

        setMandate(completeMandate);

        // Determine signer type
        if (mandateData.owner_id === user?.id) {
          console.log('[SignMandatePage] Signer type determined: owner');
          setSignerType('owner');
        } else if (agencyData?.user_id === user?.id) {
          console.log('[SignMandatePage] Signer type determined: agency');
          setSignerType('agency');
        } else {
          console.error('[SignMandatePage] Cannot determine signer type!', {
            mandateOwnerId: mandateData.owner_id,
            agencyUserId: agencyData?.user_id,
            userId: user?.id,
          });
        }

      } catch (err) {
        console.error('Error loading mandate:', err);
        toast.error('Erreur lors du chargement du mandat');
        navigate('/agences/mandats');
      } finally {
        setLoading(false);
      }
    };

    fetchMandate();
  }, [id, user, navigate]);

  // Check if already signed by current user
  const alreadySigned =
    mandate &&
    ((signerType === 'owner' && mandate.owner_signed_at) ||
      (signerType === 'agency' && mandate.agency_signed_at));

  const canSign =
    mandate &&
    !alreadySigned &&
    (mandate.status === 'pending' ||
      mandate.status === 'active' ||
      mandate.cryptoneo_signature_status === 'owner_signed' ||
      mandate.cryptoneo_signature_status === 'agency_signed');

  const handleSignMandate = async () => {
    if (!mandate || !signerType || !acceptedTerms || !acceptedResponsibilities) {
      toast.error('Veuillez accepter toutes les conditions');
      return;
    }

    console.log('[SignMandatePage] Starting signature process:', {
      mandateId: mandate.id,
      signerType,
      currentOwnerSigned: mandate.owner_signed_at,
      currentAgencySigned: mandate.agency_signed_at,
      currentStatus: mandate.status,
      currentCryptoStatus: mandate.cryptoneo_signature_status,
    });

    setSigning(true);

    try {
      const { data, error } = await supabase.functions.invoke('cryptoneo-sign-mandate', {
        body: {
          mandateId: mandate.id,
          signerType,
          signatureMethod: 'simple',
        },
      });

      console.log('[SignMandatePage] Response received:', {
        error,
        data,
        fullResponse: { data, error }
      });

      if (error) {
        console.error('[SignMandatePage] Signature error:', error);
        toast.error('Erreur lors de la signature');
        return;
      }

      if (data?.error) {
        console.error('[SignMandatePage] API error:', data.error);
        toast.error(data.error);
        return;
      }

      console.log('[SignMandatePage] Signature successful:', {
        signedAt: data.signedAt,
        signatureStatus: data.signatureStatus,
        isComplete: data.isComplete,
        signerType: data.signerType
      });

      // Update local mandate state with new signature data
      if (signerType === 'owner') {
        console.log('[SignMandatePage] Updating owner signature in local state');
        setMandate(prev => prev ? {
          ...prev,
          owner_signed_at: data.signedAt,
          cryptoneo_signature_status: data.signatureStatus,
          ...(data?.isComplete && { status: 'active', signed_at: data.signedAt })
        } : null);
      } else {
        console.log('[SignMandatePage] Updating agency signature in local state');
        setMandate(prev => prev ? {
          ...prev,
          agency_signed_at: data.signedAt,
          cryptoneo_signature_status: data.signatureStatus,
          ...(data?.isComplete && { status: 'active', signed_at: data.signedAt })
        } : null);
      }

      setSignatureComplete(true);
      nextStep();

      if (data?.isComplete) {
        toast.success('🎉 Mandat signé par les deux parties !');
      } else {
        toast.success('Signature enregistrée avec succès');
      }
    } catch (err) {
      console.error('[SignMandatePage] Sign mandate error:', err);
      toast.error('Erreur lors de la signature du mandat');
    } finally {
      setSigning(false);
    }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAgencyUser = profile?.user_type
    ? (AGENCY_ROLES as readonly string[]).includes(profile.user_type)
    : false;

  if (loading) {
    return (
      <div>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!mandate) {
    return (
      <div>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Mandat introuvable</h2>
            <Button onClick={() => navigate('/agences/mandats')}>Retour aux mandats</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-background py-8 px-4">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/agences/mandats')}
              className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour aux mandats</span>
            </button>

            <div className="flex items-center gap-3 mb-2">
              <FileSignature className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Signature du Mandat</h1>
            </div>
            <p className="text-muted-foreground">
              {signerType === 'owner'
                ? "Signez le mandat pour autoriser l'agence à gérer vos biens"
                : 'Signez le mandat pour accepter la gestion des biens'}
            </p>
          </div>

          {/* Already signed notice */}
          {alreadySigned && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Vous avez déjà signé ce mandat</p>
                    <p className="text-sm text-green-600">
                      Signé le{' '}
                      {format(
                        new Date(
                          signerType === 'owner'
                            ? mandate.owner_signed_at!
                            : mandate.agency_signed_at!
                        ),
                        'dd MMMM yyyy à HH:mm',
                        { locale: fr }
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stepper */}
          {canSign && (
            <FormStepper
              currentStep={currentStep}
              totalSteps={3}
              labels={STEP_LABELS}
              onStepChange={goToStep}
              allowClickNavigation={currentStep > 0}
              className="mb-8"
            />
          )}

          {/* Step 1: Mandate Details */}
          <FormStepContent step={1} currentStep={currentStep} slideDirection={slideDirection}>
            <Card>
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
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">Propriétaire</span>
                      {signerType === 'owner' && (
                        <Badge variant="secondary" className="text-xs">
                          Vous
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{mandate.owner?.full_name || 'Propriétaire'}</p>
                    <p className="text-xs text-muted-foreground">
                      {mandate.owner?.email || mandate.owner_id.slice(0, 8) + '...'}
                    </p>
                    {mandate.owner_signed_at && (
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signé
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">Agence</span>
                      {signerType === 'agency' && (
                        <Badge variant="secondary" className="text-xs">
                          Vous
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{mandate.agency?.agency_name || 'Agence'}</p>
                    {mandate.agency_signed_at && (
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signé
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Property or Scope */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Portée du mandat</h4>
                  {mandate.mandate_scope === 'all_properties' ? (
                    <p className="text-sm text-muted-foreground">
                      Ce mandat couvre <strong>tous vos biens immobiliers</strong>
                    </p>
                  ) : mandate.property ? (
                    <div>
                      <p className="font-medium">{mandate.property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {mandate.property.city}
                        {mandate.property.neighborhood && `, ${mandate.property.neighborhood}`}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {mandate.property.monthly_rent?.toLocaleString()} FCFA/mois
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Bien spécifique</p>
                  )}
                </div>

                {/* Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Date de début</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Commission</span>
                    </div>
                    <p className="font-medium">{mandate.commission_rate}%</p>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h4 className="font-medium mb-3">Permissions accordées</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries({
                      can_view_properties: mandate.can_view_properties,
                      can_edit_properties: mandate.can_edit_properties,
                      can_create_properties: mandate.can_create_properties,
                      can_delete_properties: mandate.can_delete_properties,
                      can_view_applications: mandate.can_view_applications,
                      can_manage_applications: mandate.can_manage_applications,
                      can_create_leases: mandate.can_create_leases,
                      can_view_financials: mandate.can_view_financials,
                      can_manage_maintenance: mandate.can_manage_maintenance,
                      can_communicate_tenants: mandate.can_communicate_tenants,
                      can_manage_documents: mandate.can_manage_documents,
                    }).map(([key, value]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-2 p-2 rounded ${
                          value ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {value ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className="text-sm">{getPermissionLabel(key)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {mandate.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-800 mb-1">Notes</h4>
                    <p className="text-sm text-amber-700">{mandate.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {canSign && (
              <div className="flex justify-end mt-6">
                <Button onClick={nextStep} size="large">
                  Continuer vers la signature
                </Button>
              </div>
            )}
          </FormStepContent>

          {/* Step 2: Acceptance */}
          <FormStepContent step={2} currentStep={currentStep} slideDirection={slideDirection}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Acceptation des conditions
                </CardTitle>
                <CardDescription>Lisez et acceptez les conditions du mandat</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Terms */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-3">Conditions générales du mandat</h4>
                  <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                    <p>
                      En signant ce mandat,{' '}
                      {signerType === 'owner'
                        ? "vous autorisez l'agence à gérer vos biens selon les permissions définies ci-dessus."
                        : 'vous acceptez de gérer les biens du propriétaire selon les permissions définies.'}
                    </p>
                    <p>Les parties s'engagent à respecter les termes de ce mandat, notamment :</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>La commission de {mandate.commission_rate}% sur les loyers perçus</li>
                      <li>
                        La durée du mandat à partir du{' '}
                        {format(new Date(mandate.start_date), 'dd/MM/yyyy')}
                      </li>
                      <li>Les permissions et restrictions définies dans le mandat</li>
                      <li>L'obligation de transparence sur la gestion des biens</li>
                      <li>La possibilité de résilier avec un préavis de 30 jours</li>
                    </ul>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      J'ai lu et j'accepte les conditions générales du mandat de gestion immobilière
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="responsibilities"
                      checked={acceptedResponsibilities}
                      onCheckedChange={(checked) => setAcceptedResponsibilities(checked === true)}
                    />
                    <Label
                      htmlFor="responsibilities"
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      {signerType === 'owner'
                        ? 'Je confirme être le propriétaire légitime des biens concernés et autorise cette agence à les gérer en mon nom'
                        : "Je confirme représenter l'agence et m'engage à gérer les biens du propriétaire avec diligence"}
                    </Label>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSignature className="h-5 w-5 text-primary" />
                    <span className="font-medium">Signature électronique</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Votre signature sera enregistrée de manière sécurisée. Cette signature a valeur
                    légale conformément aux dispositions de la loi ivoirienne sur les transactions
                    électroniques.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevStep}>
                Retour
              </Button>
              <Button
                onClick={handleSignMandate}
                disabled={!acceptedTerms || !acceptedResponsibilities || signing}
                size="large"
                className="min-w-[200px]"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signature en cours...
                  </>
                ) : (
                  <>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Signer le mandat
                  </>
                )}
              </Button>
            </div>
          </FormStepContent>

          {/* Step 3: Confirmation */}
          <FormStepContent step={3} currentStep={currentStep} slideDirection={slideDirection}>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-green-800 mb-2">Signature enregistrée !</h2>

                <p className="text-green-700 mb-6 max-w-md mx-auto">
                  {mandate.cryptoneo_signature_status === 'completed'
                    ? 'Le mandat est maintenant actif. Les deux parties ont signé.'
                    : signerType === 'owner'
                      ? "Votre signature a été enregistrée. En attente de la signature de l'agence."
                      : 'Votre signature a été enregistrée. En attente de la signature du propriétaire.'}
                </p>

                {/* Status summary */}
                <div className="inline-flex items-center gap-4 p-4 bg-white rounded-lg border mb-6">
                  <div className="text-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${
                        mandate.owner_signed_at || signerType === 'owner'
                          ? 'bg-green-100'
                          : 'bg-muted'
                      }`}
                    >
                      <User
                        className={`h-5 w-5 ${
                          mandate.owner_signed_at || signerType === 'owner'
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <span className="text-xs">Propriétaire</span>
                    {(mandate.owner_signed_at || signerType === 'owner') && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                    )}
                  </div>

                  <div className="w-12 h-0.5 bg-muted" />

                  <div className="text-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${
                        mandate.agency_signed_at || signerType === 'agency'
                          ? 'bg-green-100'
                          : 'bg-muted'
                      }`}
                    >
                      <Building2
                        className={`h-5 w-5 ${
                          mandate.agency_signed_at || signerType === 'agency'
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <span className="text-xs">Agence</span>
                    {(mandate.agency_signed_at || signerType === 'agency') && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => navigate('/agences/mandats')}>
                    Voir mes mandats
                  </Button>
                  <Button onClick={() => navigate(`/agences/mandats/${mandate.id}`)}>
                    Voir le détail du mandat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FormStepContent>
        </div>
      </div>
    </div>
  );
}
