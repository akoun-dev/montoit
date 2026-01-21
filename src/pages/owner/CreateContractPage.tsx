import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { generateAndUploadContract } from '@/services/contracts/contractService';
import { notifyLeaseCreated } from '@/services/notifications/leaseNotificationService';
import { ValidationService, type FormValidationResult } from '@/services/validation';
import { useFormValidation } from '@/hooks/shared/useFormValidation';
import { ValidatedInput, FormStepper, FormStepContent, useFormStepper } from '@/shared/ui';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Home,
  ArrowLeft,
  ArrowRight,
  Loader,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import '@/styles/form-premium.css';

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
  } | null;
}

const STEP_LABELS = ['Sélection', 'Conditions', 'Durée'];

export default function CreateContractPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { propertyId: urlPropertyId } = useParams();
  const [searchParams] = useSearchParams();
  const { step, slideDirection, nextStep, prevStep, goToStep } = useFormStepper(1, 3);

  const initialPropertyId = urlPropertyId || searchParams.get('propertyId') || '';
  const initialTenantId = searchParams.get('tenantId') || '';

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

  const { validateField, getFieldState, touched, setFieldError, clearFieldError } =
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
  }, [user]);

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
  }, [selectedProperty, properties]);

  useEffect(() => {
    if (selectedProperty) loadApplications(selectedProperty);
  }, [selectedProperty]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const { data: propsData, error: propsError } = await supabase
        .from('properties')
        .select('id, title, address, city, price')
        .eq('owner_id', user.id)
        .eq('status', 'disponible');

      if (propsError) throw propsError;
      const normalized = (propsData || []).map((p: any) => ({
        ...p,
        monthly_rent: p.price ?? 0,
      }));
      setProperties(normalized);
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
        .eq('status', 'acceptee');

      if (error) throw error;

      if (data && data.length > 0) {
        const applicantIds = data.map((app) => app.tenant_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
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
      const { count: existingContracts, error: existingError } = await supabase
        .from('lease_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', selectedProperty)
        .eq('tenant_id', selectedTenant)
        .in('status', ['brouillon', 'en_attente_signature', 'actif']);

      if (existingError) throw existingError;

      if ((existingContracts ?? 0) > 0) {
        setError(
          'Un contrat existe déjà pour ce locataire sur ce bien (brouillon/en attente/actif).'
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
          status: 'brouillon',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      try {
        await generateAndUploadContract(data.id);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
      }

      await supabase.from('properties').update({ status: 'reserve' }).eq('id', selectedProperty);

      try {
        await notifyLeaseCreated(data.id);
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      setSuccess('Contrat créé et PDF généré avec succès!');

      setTimeout(() => {
        navigate(`/contrat/${data.id}`);
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
      <div className="min-h-[60vh] bg-[#FAF7F4] flex items-center justify-center rounded-2xl">
        <p className="text-[#A69B95]">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#FAF7F4] flex items-center justify-center rounded-2xl">
        <Loader className="w-12 h-12 text-[#F16522] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#FAF7F4] pt-6 pb-12 rounded-2xl">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          {/* Header Premium */}
          <div className="mb-8">
            <button
              onClick={() => (step > 1 ? prevStep() : navigate(-1))}
              className="flex items-center space-x-2 text-[#2C1810] hover:text-[#F16522] mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-[#F16522]/10 rounded-xl">
                <FileText className="w-8 h-8 text-[#F16522]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#2C1810]">Créer un contrat de bail</h1>
                <p className="text-[#A69B95]">Générez un contrat conforme au droit ivoirien</p>
              </div>
            </div>

            {/* Stepper */}
            <FormStepper
              currentStep={step}
              totalSteps={3}
              onStepChange={goToStep}
              labels={STEP_LABELS}
              allowClickNavigation={false}
            />
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-600">{success}</p>
            </div>
          )}

          {/* Étape 1: Sélection Propriété + Locataire */}
          <FormStepContent step={1} currentStep={step} slideDirection={slideDirection}>
            <div className="space-y-6">
              {/* Propriété */}
              <div className="form-section-premium">
                <div className="flex items-center space-x-3 mb-4">
                  <Home className="w-5 h-5 text-[#F16522]" />
                  <h2 className="form-label-premium text-lg">Propriété</h2>
                </div>

                {properties.length === 0 ? (
                  <div className="text-center py-6">
                    <Home className="w-12 h-12 text-[#A69B95] mx-auto mb-3" />
                    <p className="text-[#A69B95] mb-4">Aucune propriété disponible</p>
                    <button
                      type="button"
                      onClick={() => navigate('/proprietaire/ajouter-propriete')}
                      className="form-button-primary inline-flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une propriété</span>
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    required
                    className="form-input-premium"
                  >
                    <option value="">Sélectionner une propriété</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title} - {prop.city} ({prop.monthly_rent.toLocaleString()} FCFA/mois)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Locataire */}
              <div className="form-section-premium">
                <div className="flex items-center space-x-3 mb-4">
                  <User className="w-5 h-5 text-[#F16522]" />
                  <h2 className="form-label-premium text-lg">Locataire</h2>
                </div>

                {!selectedProperty ? (
                  <p className="text-[#A69B95] text-sm">Sélectionnez d'abord une propriété</p>
                ) : applications.length === 0 ? (
                  <div className="text-center py-6">
                    <User className="w-12 h-12 text-[#A69B95] mx-auto mb-3" />
                    <p className="text-[#A69B95]">
                      Aucune candidature acceptée pour cette propriété
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    required
                    className="form-input-premium"
                  >
                    <option value="">Sélectionner un locataire</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.tenant_id}>
                        {app.profiles?.full_name || 'Nom non renseigné'} - {app.profiles?.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateStep1()}
                  className="form-button-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </FormStepContent>

          {/* Étape 2: Conditions financières */}
          <FormStepContent step={2} currentStep={step} slideDirection={slideDirection}>
            <div className="space-y-6">
              <div className="form-section-premium">
                <div className="flex items-center space-x-3 mb-4">
                  <DollarSign className="w-5 h-5 text-[#F16522]" />
                  <h2 className="form-label-premium text-lg">Conditions financières</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label-premium">Loyer mensuel (FCFA) *</label>
                    <div className="mt-2">
                      <ValidatedInput
                        name="monthlyRent"
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        onBlur={() =>
                          validateField('monthlyRent', () =>
                            ValidationService.validatePositiveNumber(monthlyRent, 'Loyer mensuel')
                          )
                        }
                        required
                        min={0}
                        error={getFieldState('monthlyRent').error}
                        touched={touched['monthlyRent']}
                        isValid={getFieldState('monthlyRent').isValid}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label-premium">Dépôt de garantie (FCFA) *</label>
                    <div className="mt-2">
                      <ValidatedInput
                        name="depositAmount"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        onBlur={() =>
                          validateField('depositAmount', () =>
                            ValidationService.validatePositiveNumber(
                              depositAmount,
                              'Dépôt de garantie'
                            )
                          )
                        }
                        required
                        min={0}
                        error={getFieldState('depositAmount').error}
                        touched={touched['depositAmount']}
                        isValid={getFieldState('depositAmount').isValid}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label-premium">Charges mensuelles (FCFA)</label>
                    <input
                      type="number"
                      value={chargesAmount}
                      onChange={(e) => setChargesAmount(e.target.value)}
                      className="form-input-premium mt-2"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="form-label-premium">Jour de paiement (1-28) *</label>
                    <div className="mt-2">
                      <ValidatedInput
                        name="paymentDay"
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
                        required
                        min={1}
                        max={28}
                        error={getFieldState('paymentDay').error}
                        touched={touched['paymentDay']}
                        isValid={getFieldState('paymentDay').isValid}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="form-button-secondary flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Précédent</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateStep2()}
                  className="form-button-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </FormStepContent>

          {/* Étape 3: Durée + Clauses */}
          <FormStepContent step={3} currentStep={step} slideDirection={slideDirection}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-section-premium">
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="w-5 h-5 text-[#F16522]" />
                  <h2 className="form-label-premium text-lg">Durée du bail</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label-premium">Date de début *</label>
                    <div className="mt-2">
                      <ValidatedInput
                        name="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        error={getFieldState('startDate').error}
                        touched={touched['startDate']}
                        isValid={getFieldState('startDate').isValid}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label-premium">Date de fin *</label>
                    <div className="mt-2">
                      <ValidatedInput
                        name="endDate"
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
                        required
                        error={getFieldState('endDate').error}
                        touched={touched['endDate']}
                        isValid={getFieldState('endDate').isValid}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section-premium">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="w-5 h-5 text-[#F16522]" />
                  <h2 className="form-label-premium text-lg">Clauses personnalisées</h2>
                </div>

                <textarea
                  value={customClauses}
                  onChange={(e) => setCustomClauses(e.target.value)}
                  rows={4}
                  placeholder="Ajoutez des clauses spécifiques au contrat (optionnel)..."
                  className="form-input-premium resize-none"
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="form-button-secondary flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Précédent</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="form-button-primary flex items-center space-x-2"
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
          </FormStepContent>
        </div>
      </div>
    </>
  );
}
