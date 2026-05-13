import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { generateAndUploadContract } from '@/services/contracts/contractService';
import { notifyLeaseCreated } from '@/services/notifications/leaseNotificationService';
import { ValidationService, type FormValidationResult } from '@/services/validation';
import { useFormValidation } from '@/hooks/shared/useFormValidation';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  ArrowLeft,
  Loader,
  CheckCircle,
  AlertCircle,
  Plus,
  MapPin,
  Building2,
  Clock,
  ChevronRight,
  X,
  Info,
  Star,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface ContractFormData {
  monthlyRent: string;
  depositAmount: string;
  chargesAmount: string;
  paymentDay: string;
  startDate: string;
  endDate: string;
  customClauses: string;
}

interface Property {
  id: string;
  title: string;
  address: string | null;
  city: string;
  monthly_rent: number;
  property_type: string;
  surface_area?: number;
  bedrooms?: number;
}

interface AcceptedApplication {
  id: string;
  tenant_id: string;
  property_id: string;
  status: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url?: string;
    trust_score?: number | null;
  } | null;
}

const STEP_LABELS = ['Sélection', 'Conditions', 'Durée'];

export default function CreateContractPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { propertyId: urlPropertyId } = useParams();
  const [searchParams] = useSearchParams();

  const initialPropertyId = urlPropertyId || searchParams.get('propertyId') || '';
  const initialTenantId = searchParams.get('tenantId') || '';
  const applicationId = searchParams.get('applicationId') || '';

  const [step, setStep] = useState(1);
  const [properties, setProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<AcceptedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedProperty, setSelectedProperty] = useState(initialPropertyId);
  const [selectedTenant, setSelectedTenant] = useState(initialTenantId);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [chargesAmount, setChargesAmount] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentDay, setPaymentDay] = useState('5');
  const [customClauses, setCustomClauses] = useState('');

  const { validateField, getFieldState, setFieldError, clearFieldError } =
    useFormValidation<ContractFormData>();

  const validateStep1 = (): boolean => {
    return !!selectedProperty && !!selectedTenant;
  };

  const validateStep2 = (): boolean => {
    const rentResult = ValidationService.validatePositiveNumber(monthlyRent, 'Loyer mensuel');
    const depositResult = ValidationService.validatePositiveNumber(
      depositAmount,
      'Dépôt de garantie'
    );
    const paymentDayNum = parseInt(paymentDay);

    return (
      rentResult.isValid &&
      depositResult.isValid &&
      !isNaN(paymentDayNum) &&
      paymentDayNum >= 1 &&
      paymentDayNum <= 28
    );
  };

  const validateContractForm = (): FormValidationResult => {
    const errors: Record<string, string> = {};

    const rentResult = ValidationService.validatePositiveNumber(monthlyRent, 'Loyer mensuel');
    if (!rentResult.isValid && rentResult.error) errors['monthlyRent'] = rentResult.error;

    const depositResult = ValidationService.validatePositiveNumber(
      depositAmount,
      'Dépôt de garantie'
    );
    if (!depositResult.isValid && depositResult.error)
      errors['depositAmount'] = depositResult.error;

    const paymentDayNum = parseInt(paymentDay);
    if (isNaN(paymentDayNum) || paymentDayNum < 1 || paymentDayNum > 28) {
      errors['paymentDay'] = 'Le jour de paiement doit être entre 1 et 28';
    }

    if (!startDate) errors['startDate'] = 'La date de début est obligatoire';
    if (!endDate) errors['endDate'] = 'La date de fin est obligatoire';

    if (startDate && endDate) {
      const dateRangeResult = ValidationService.validateDateRange(startDate, endDate);
      if (!dateRangeResult.isValid && dateRangeResult.error)
        errors['endDate'] = dateRangeResult.error;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, applicationId]);

  useEffect(() => {
    if (selectedProperty) {
      const property = properties.find((p) => p.id === selectedProperty);
      if (property) {
        setMonthlyRent(property.monthly_rent.toString());
        setDepositAmount((property.monthly_rent * 2).toString());
        clearFieldError('monthlyRent');
        clearFieldError('depositAmount');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty, properties]);

  useEffect(() => {
    if (selectedProperty) loadApplications(selectedProperty);
  }, [selectedProperty]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      // Si applicationId est fourni, charger uniquement la propriété de la candidature
      if (applicationId) {
        const { data: appData, error: appError } = await supabase
          .from('rental_applications')
          .select('id, tenant_id, property_id, status')
          .eq('id', applicationId)
          .eq('status', 'accepted')
          .single();

        if (appError) throw appError;

        if (appData) {
          // Charger uniquement la propriété de la candidature
          const { data: propData, error: propError } = await supabase
            .from('properties')
            .select('id, title, address, city, price, property_type, surface_area, bedrooms')
            .eq('id', appData.property_id)
            .single();

          if (propError) throw propError;

          if (propData) {
            const normalized = {
              ...propData,
              monthly_rent: propData.price ?? 0,
            };
            setProperties([normalized]);
            setSelectedProperty(appData.property_id);
            setSelectedTenant(appData.tenant_id);
          }

          // Charger les infos du locataire
          const { data: tenantData } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, avatar_url, trust_score')
            .eq('id', appData.tenant_id)
            .single();

          if (tenantData) {
            const appWithProfile: AcceptedApplication = {
              ...appData,
              profiles: tenantData,
            };
            setApplications([appWithProfile]);
          }
        }
      } else {
        // Pas d'applicationId : charger toutes les propriétés disponibles
        const { data: propsData, error: propsError } = await supabase
          .from('properties')
          .select('id, title, address, city, price, property_type, surface_area, bedrooms')
          .eq('owner_id', user.id)
          .eq('status', 'available');

        if (propsError) throw propsError;
        const normalized = (propsData || []).map((p: Property) => ({
          ...p,
          monthly_rent: p.price ?? 0,
        }));
        setProperties(normalized);
      }
    } catch (err: unknown) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select('id, tenant_id, property_id, status')
        .eq('property_id', propertyId)
        .eq('status', 'accepted');

      if (error) throw error;

      if (data && data.length > 0) {
        const applicantIds = data.map((app) => app.tenant_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, trust_score')
          .in('id', applicantIds);

        const appsWithProfiles = data.map((app) => ({
          ...app,
          profiles: profiles?.find((p) => p.id === app.tenant_id) || null,
        }));

        setApplications(appsWithProfiles);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
    }
  };

  const generateContractNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `MT-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedProperty || !selectedTenant) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const validation = validateContractForm();
    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, errorMsg]) => {
        setFieldError(field as keyof ContractFormData, errorMsg);
      });
      setError('Veuillez corriger les erreurs du formulaire');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Vérifier si un contrat existe déjà
      const { count: existingContracts, error: existingError } = await supabase
        .from('lease_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', selectedProperty)
        .eq('tenant_id', selectedTenant)
        .in('status', ['draft', 'pending_signature', 'active']);

      if (existingError) throw existingError;

      if ((existingContracts ?? 0) > 0) {
        setError(
          'Un contrat existe déjà pour ce locataire sur ce bien.'
        );
        setSubmitting(false);
        return;
      }

      const contractNumber = generateContractNumber();

      const { data, error: insertError } = await supabase
        .from('lease_contracts')
        .insert({
          contract_number: contractNumber,
          property_id: selectedProperty,
          owner_id: user.id,
          tenant_id: selectedTenant,
          monthly_rent: parseInt(monthlyRent),
          deposit_amount: parseInt(depositAmount),
          charges_amount: parseInt(chargesAmount),
          start_date: startDate,
          end_date: endDate,
          payment_day: parseInt(paymentDay),
          custom_clauses: customClauses || null,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      try {
        await generateAndUploadContract(data.id);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
      }

      await supabase.from('properties').update({ status: 'pending' }).eq('id', selectedProperty);

      try {
        await notifyLeaseCreated(data.id);
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      setSuccess('Contrat créé et PDF généré avec succès!');

      setTimeout(() => {
        navigate(`/proprietaire/contrats/${data.id}`);
      }, 2000);
    } catch (err: unknown) {
      console.error('Error creating contract:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du contrat');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <p className="text-gray-500">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <Loader className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  const selectedPropertyData = properties.find((p) => p.id === selectedProperty);
  const selectedTenantData = applications.find((a) => a.tenant_id === selectedTenant);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Retour</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Nouveau contrat de bail</h1>
                <p className="text-sm text-gray-500">Créez un contrat conforme au droit ivoirien</p>
              </div>
            </div>

            <div className="w-24" />
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {STEP_LABELS.map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                        step > index + 1
                          ? "bg-orange-500 text-white"
                          : step === index + 1
                          ? "bg-orange-500 text-white ring-4 ring-orange-100"
                          : "bg-green-500 text-white"
                      )}
                    >
                      {step > index + 1 ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1 font-medium transition-colors",
                        step === index + 1 ? "text-orange-600" : "text-gray-400"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {index < STEP_LABELS.length - 1 && (
                    <div
                      className={cn(
                        "w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300",
                        step > index + 1 ? "bg-orange-500" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Step 1: Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Property Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Propriété</h2>
                      <p className="text-sm text-gray-500">
                        {applicationId ? 'Bien associé à la candidature' : 'Sélectionnez le bien concerné'}
                      </p>
                    </div>
                  </div>
                  {applicationId && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      Prédéfini
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {properties.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6">Aucune propriété disponible</p>
                    <button
                      onClick={() => navigate('/proprietaire/ajouter-propriete')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Ajouter une propriété</span>
                    </button>
                  </div>
                ) : applicationId && properties.length === 1 ? (
                  // Affichage simple pour une propriété prédéfinie
                  <div className="relative p-6 rounded-xl border-2 border-orange-500 bg-orange-50 shadow-md">
                    <div className="absolute top-4 right-4 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{properties[0].title}</h3>
                        <div className="flex items-center gap-1 text-gray-600 mb-4">
                          <MapPin className="w-4 h-4" />
                          <span>{properties[0].city}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700">
                            {properties[0].property_type}
                          </span>
                          {properties[0].surface_area && (
                            <span className="text-sm text-gray-600">{properties[0].surface_area} m²</span>
                          )}
                          {properties[0].bedrooms && (
                            <span className="text-sm text-gray-600">{properties[0].bedrooms} chambres</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-orange-200">
                      <p className="text-2xl font-bold text-orange-600">
                        {properties[0].monthly_rent.toLocaleString()} FCFA
                        <span className="text-lg font-normal text-gray-500">/mois</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {properties.map((prop) => (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => setSelectedProperty(prop.id)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                          selectedProperty === prop.id
                            ? "border-orange-500 bg-orange-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm"
                        )}
                      >
                        {selectedProperty === prop.id && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <h3 className="font-semibold text-gray-900 mb-1">{prop.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span>{prop.city}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                            {prop.property_type}
                          </span>
                          {prop.surface_area && (
                            <span className="text-gray-500">{prop.surface_area} m²</span>
                          )}
                          {prop.bedrooms && (
                            <span className="text-gray-500">{prop.bedrooms} ch.</span>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="font-bold text-orange-600">
                            {prop.monthly_rent.toLocaleString()} FCFA
                            <span className="font-normal text-gray-500">/mois</span>
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tenant Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Locataire</h2>
                      <p className="text-sm text-gray-500">
                        {applicationId ? 'Candidat associé' : 'Sélectionnez le candidat accepté'}
                      </p>
                    </div>
                  </div>
                  {applicationId && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Prédéfini
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {!selectedProperty ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Sélectionnez d'abord une propriété</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Aucune candidature acceptée</p>
                    <p className="text-sm text-gray-400">
                      Les candidatures acceptées apparaîtront ici
                    </p>
                  </div>
                ) : applicationId && applications.length === 1 ? (
                  // Affichage simple pour un locataire prédéfini
                  <div className="relative p-6 rounded-xl border-2 border-blue-500 bg-blue-50 shadow-md">
                    <div className="absolute top-4 right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">
                          {applications[0].profiles?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {applications[0].profiles?.full_name || 'Nom non renseigné'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{applications[0].profiles?.email}</span>
                          {applications[0].profiles?.phone && (
                            <>
                              <span>•</span>
                              <span>{applications[0].profiles.phone}</span>
                            </>
                          )}
                        </div>
                        {/* Score de confiance */}
                        {applications[0].profiles?.trust_score !== undefined && applications[0].profiles?.trust_score !== null && (
                          <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-600 uppercase">Score de confiance</span>
                              <span className="text-sm font-bold text-gray-900">
                                {applications[0].profiles.trust_score}/100
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  applications[0].profiles.trust_score >= 70
                                    ? "bg-green-500"
                                    : applications[0].profiles.trust_score >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${applications[0].profiles.trust_score}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Candidature acceptée
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedTenant(app.tenant_id)}
                        className={cn(
                          "w-full relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                          selectedTenant === app.tenant_id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {app.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {app.profiles?.full_name || 'Nom non renseigné'}
                              </h3>
                              {app.profiles?.trust_score !== undefined && app.profiles?.trust_score !== null && (
                                <div className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold",
                                  app.profiles.trust_score >= 70
                                    ? "bg-green-100 text-green-700"
                                    : app.profiles.trust_score >= 50
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                )}>
                                  <Star className="w-3 h-3" />
                                  {app.profiles.trust_score}/100
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{app.profiles?.email}</p>
                            {app.profiles?.phone && (
                              <p className="text-sm text-gray-400">{app.profiles.phone}</p>
                            )}
                          </div>
                          {selectedTenant === app.tenant_id && (
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!validateStep1()}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                  validateStep1()
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-orange-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <span>Suivant</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Financial Conditions */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Conditions financières</h2>
                    <p className="text-sm text-gray-500">Définissez les termes du bail</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Monthly Rent */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Loyer mensuel (FCFA)
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        onBlur={() =>
                          validateField('monthlyRent', () =>
                            ValidationService.validatePositiveNumber(monthlyRent, 'Loyer mensuel')
                          )
                        }
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 transition-all",
                          getFieldState('monthlyRent').error
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : getFieldState('monthlyRent').isValid
                            ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                            : "border-gray-200 focus:border-orange-500 focus:ring-orange-200"
                        )}
                        placeholder="Ex: 150000"
                      />
                      {getFieldState('monthlyRent').isValid && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {getFieldState('monthlyRent').error && (
                      <p className="text-sm text-red-500">{getFieldState('monthlyRent').error}</p>
                    )}
                  </div>

                  {/* Deposit Amount */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Dépôt de garantie (FCFA)
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        onBlur={() =>
                          validateField('depositAmount', () =>
                            ValidationService.validatePositiveNumber(depositAmount, 'Dépôt de garantie')
                          )
                        }
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 transition-all",
                          getFieldState('depositAmount').error
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : getFieldState('depositAmount').isValid
                            ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                            : "border-gray-200 focus:border-orange-500 focus:ring-orange-200"
                        )}
                        placeholder="Ex: 300000"
                      />
                      {getFieldState('depositAmount').isValid && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {getFieldState('depositAmount').error && (
                      <p className="text-sm text-red-500">{getFieldState('depositAmount').error}</p>
                    )}
                  </div>

                  {/* Charges */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Charges mensuelles (FCFA)
                    </label>
                    <input
                      type="number"
                      value={chargesAmount}
                      onChange={(e) => setChargesAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-200 transition-all"
                      placeholder="Ex: 10000"
                      min={0}
                    />
                  </div>

                  {/* Payment Day */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Clock className="w-4 h-4 text-green-600" />
                      Jour de paiement (1-28)
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={paymentDay}
                        onChange={(e) => setPaymentDay(e.target.value)}
                        onBlur={() => {
                          const day = parseInt(paymentDay);
                          if (isNaN(day) || day < 1 || day > 28) {
                            setFieldError('paymentDay', 'Le jour doit être entre 1 et 28');
                          } else {
                            clearFieldError('paymentDay');
                          }
                        }}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 transition-all",
                          getFieldState('paymentDay').error
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : getFieldState('paymentDay').isValid
                            ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                            : "border-gray-200 focus:border-orange-500 focus:ring-orange-200"
                        )}
                        min={1}
                        max={28}
                      />
                      {getFieldState('paymentDay').isValid && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {getFieldState('paymentDay').error && (
                      <p className="text-sm text-red-500">{getFieldState('paymentDay').error}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
                <span>Précédent</span>
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!validateStep2()}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                  validateStep2()
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-orange-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <span>Suivant</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Duration & Summary */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Duration */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Durée du bail</h2>
                      <p className="text-sm text-gray-500">Définissez la période</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Date de début <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 transition-all",
                          getFieldState('startDate').error
                            ? "border-red-300"
                            : getFieldState('startDate').isValid
                            ? "border-green-300"
                            : "border-gray-200 focus:border-purple-500"
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Date de fin <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        onBlur={() => {
                          if (startDate && endDate) {
                            const result = ValidationService.validateDateRange(startDate, endDate);
                            if (!result.isValid && result.error) {
                              setFieldError('endDate', result.error);
                            } else {
                              clearFieldError('endDate');
                            }
                          }
                        }}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border-2 transition-all",
                          getFieldState('endDate').error
                            ? "border-red-300"
                            : getFieldState('endDate').isValid
                            ? "border-green-300"
                            : "border-gray-200 focus:border-purple-500"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Clauses */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Clauses personnalisées</h2>
                      <p className="text-sm text-gray-500">Ajoutez des conditions spécifiques (optionnel)</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <textarea
                    value={customClauses}
                    onChange={(e) => setCustomClauses(e.target.value)}
                    rows={4}
                    placeholder="Ex: Le locataire s'engage à souscrire une assurance habitation..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-200 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Contract Summary */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-200 overflow-hidden">
                <div className="p-6 text-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Récapitulatif du contrat</h2>
                      <p className="text-sm text-white/80">Vérifiez les informations avant création</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Propriété</p>
                        <p className="font-semibold">{selectedPropertyData?.title}</p>
                        <p className="text-sm text-white/80">{selectedPropertyData?.city}</p>
                      </div>

                      <div>
                        <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Locataire</p>
                        <p className="font-semibold">{selectedTenantData?.profiles?.full_name}</p>
                        <p className="text-sm text-white/80">{selectedTenantData?.profiles?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Loyer</p>
                        <p className="text-2xl font-bold">
                          {parseInt(monthlyRent || 0).toLocaleString()} FCFA
                          <span className="text-sm font-normal text-white/80">/mois</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Durée</p>
                        <p className="font-semibold">
                          {startDate && new Date(startDate).toLocaleDateString('fr-FR')} → {endDate && new Date(endDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  <span>Précédent</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all",
                    submitting
                      ? "bg-gray-400 text-white cursor-wait"
                      : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-200 hover:from-green-600 hover:to-green-700"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Création...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>Générer le contrat</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
