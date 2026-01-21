import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import Header from '@/app/layout/Header';
import Footer from '@/app/layout/Footer';
import { FormStepper, FormStepContent, useFormStepper } from '@/shared/ui';
import {
  CreditCard,
  Smartphone,
  Building,
  Coins,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import '@/styles/form-premium.css';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface PaymentFormData {
  property_id: string;
  amount: number;
  payment_type: 'loyer' | 'depot_garantie' | 'charges' | 'frais_agence';
  payment_method: 'mobile_money' | 'carte_bancaire' | 'virement' | 'especes';
  mobile_money_provider?: 'orange_money' | 'mtn_money' | 'moov_money' | 'wave';
  mobile_money_number?: string;
}

interface Contract {
  id: string;
  lease_id: string | null;
  property_id: string;
  monthly_rent: number;
  deposit_amount: number | null;
  owner_id: string;
  property_title: string;
  property_address: AddressValue;
  property_city: string;
  property_main_image: string | null;
  owner_name: string;
}

const STEP_LABELS = ['Sélection', 'Paiement'];

export default function MakePayment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { step, slideDirection, nextStep, prevStep } = useFormStepper(1, 2);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [formData, setFormData] = useState<PaymentFormData>({
    property_id: '',
    amount: 0,
    payment_type: 'loyer',
    payment_method: 'mobile_money',
    mobile_money_provider: 'orange_money',
    mobile_money_number: '',
  });

  const loadUserContracts = async () => {
    if (!user) return;

    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('lease_contracts')
        .select('id, lease_id, property_id, monthly_rent, deposit_amount, owner_id')
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      interface ContractRow {
        id: string;
        lease_id: string | null;
        property_id: string;
        monthly_rent: number;
        deposit_amount: number | null;
        owner_id: string;
      }

      const formattedContracts: Contract[] = (contractsData || []).map((contract: ContractRow) => ({
        id: contract.id,
        lease_id: contract.lease_id,
        property_id: contract.property_id,
        monthly_rent: contract.monthly_rent,
        deposit_amount: contract.deposit_amount,
        owner_id: contract.owner_id,
        property_title: 'Propriété',
        property_address: null,
        property_city: '',
        property_main_image: null,
        owner_name: 'Propriétaire',
      }));

      for (const contract of formattedContracts) {
        const { data: propertyData } = await supabase
          .from('properties')
          .select('title, address, city, main_image')
          .eq('id', contract.property_id)
          .single();

        if (propertyData) {
          contract.property_title = propertyData.title;
          contract.property_address = propertyData.address;
          contract.property_city = propertyData.city;
          contract.property_main_image = propertyData.main_image;
        }
      }

      setContracts(formattedContracts);
    } catch (err: unknown) {
      console.error('Error loading contracts:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    setFormData({
      ...formData,
      property_id: contract.property_id,
      amount: contract.monthly_rent,
    });
    nextStep();
  };

  const handlePaymentTypeChange = (type: PaymentFormData['payment_type']) => {
    if (!selectedContract) return;

    let amount = 0;
    switch (type) {
      case 'loyer':
        amount = selectedContract.monthly_rent;
        break;
      case 'depot_garantie':
        amount = selectedContract.deposit_amount || 0;
        break;
      case 'charges':
        amount = 0;
        break;
      default:
        amount = 0;
    }

    setFormData({
      ...formData,
      payment_type: type,
      amount,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContract) return;

    setSubmitting(true);
    setError('');

    try {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: user.id,
          property_id: formData.property_id || null,
          lease_id: selectedContract.lease_id,
          amount: formData.amount,
          payment_type: formData.payment_type,
          payment_method: formData.payment_method,
          status: 'en_attente',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      if (
        formData.payment_method === 'mobile_money' &&
        formData.mobile_money_provider &&
        formData.mobile_money_number
      ) {
        await supabase
          .from('payments')
          .update({
            status: 'en_attente', // remains pending until payment confirmation
            transaction_id: `MM_${payment.id.substring(0, 8)}`,
          })
          .eq('id', payment.id);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/locataire/mes-paiements');
      }, 2000);
    } catch (err: unknown) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserContracts();
    }
  }, [user, loadUserContracts]);

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
          <div className="text-center">
            <Coins className="w-16 h-16 text-[#A69B95] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#2C1810] mb-2">Connexion requise</h2>
            <p className="text-[#A69B95]">Veuillez vous connecter pour effectuer un paiement</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="w-full min-h-screen bg-[#FAF7F4] pt-20 pb-12">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Premium Ivorian */}
          <div className="mb-8">
            <button
              onClick={() => (step > 1 ? prevStep() : navigate(-1))}
              className="flex items-center space-x-2 text-[#2C1810] hover:text-[#F16522] mb-6 transition-all duration-300 font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Retour</span>
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-[#F16522]/10 rounded-xl">
                <Coins className="w-8 h-8 text-[#F16522]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#2C1810]">Effectuer un paiement</h1>
                <p className="text-[#A69B95]">Payez votre loyer et vos charges en toute sécurité</p>
              </div>
            </div>

            {/* Stepper */}
            <FormStepper
              currentStep={step}
              totalSteps={2}
              onStepChange={() => {}}
              labels={STEP_LABELS}
              allowClickNavigation={false}
            />
          </div>

          {success ? (
            <div className="form-section-premium text-center p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#2C1810] mb-2">Paiement en cours</h2>
              <p className="text-[#A69B95] mb-4">
                Votre paiement est en cours de traitement. Vous recevrez une confirmation par email.
              </p>
              <p className="text-sm text-[#A69B95]">
                Redirection vers l'historique des paiements...
              </p>
            </div>
          ) : (
            <>
              {/* Étape 1: Sélection du contrat */}
              <FormStepContent step={1} currentStep={step} slideDirection={slideDirection}>
                <div className="form-section-premium">
                  <h2 className="form-label-premium text-lg mb-6">Sélectionnez une propriété</h2>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522] mx-auto"></div>
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center py-12">
                      <Building className="w-16 h-16 text-[#A69B95] mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-[#2C1810] mb-2">
                        Aucun contrat actif
                      </h3>
                      <p className="text-[#A69B95]">
                        Vous n'avez pas de contrat de location actif pour effectuer un paiement
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contracts.map((contract) => (
                        <button
                          key={contract.id}
                          onClick={() => handleContractSelect(contract)}
                          className="w-full bg-white border-2 border-[#A69B95]/30 rounded-xl p-6 hover:border-[#F16522] hover:shadow-lg transition-all duration-300 text-left group"
                        >
                          <div className="flex items-start space-x-4">
                            <img
                              src={
                                contract.property_main_image || 'https://via.placeholder.com/100'
                              }
                              alt={contract.property_title}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-[#2C1810] mb-1">
                                {contract.property_title}
                              </h3>
                              <p className="text-sm text-[#A69B95] mb-2">
                                {formatAddress(contract.property_address, contract.property_city)}
                              </p>
                              <div className="flex items-center space-x-4 text-sm">
                                <span className="font-semibold text-[#F16522]">
                                  Loyer: {contract.monthly_rent.toLocaleString()} FCFA
                                </span>
                                <span className="text-[#A69B95]">
                                  Propriétaire: {contract.owner_name}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-[#A69B95] group-hover:text-[#F16522] transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </FormStepContent>

              {/* Étape 2: Détails du paiement */}
              <FormStepContent step={2} currentStep={step} slideDirection={slideDirection}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-section-premium">
                    <h2 className="form-label-premium text-lg mb-6">Détails du paiement</h2>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700">{error}</p>
                      </div>
                    )}

                    {/* Propriété sélectionnée */}
                    {selectedContract && (
                      <div className="mb-6 p-4 bg-[#F16522]/5 border border-[#F16522]/20 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <img
                            src={
                              selectedContract.property_main_image ||
                              'https://via.placeholder.com/80'
                            }
                            alt={selectedContract.property_title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="font-bold text-[#2C1810]">
                              {selectedContract.property_title}
                            </h3>
                            <p className="text-sm text-[#A69B95]">
                              {formatAddress(
                                selectedContract.property_address,
                                selectedContract.property_city
                              )}
                            </p>
                            <p className="text-sm text-[#A69B95]">
                              À: {selectedContract.owner_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Type de paiement */}
                      <div>
                        <label className="form-label-premium">Type de paiement</label>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          {[
                            {
                              value: 'loyer',
                              label: 'Loyer mensuel',
                              amount: selectedContract?.monthly_rent || 0,
                            },
                            {
                              value: 'depot_garantie',
                              label: 'Dépôt de garantie',
                              amount: selectedContract?.deposit_amount || 0,
                            },
                            { value: 'charges', label: 'Charges', amount: 0 },
                            { value: 'frais_agence', label: "Frais d'agence", amount: 0 },
                          ].map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() =>
                                handlePaymentTypeChange(
                                  type.value as PaymentFormData['payment_type']
                                )
                              }
                              className={`p-4 border-2 rounded-xl text-left transition-all ${
                                formData.payment_type === type.value
                                  ? 'border-[#F16522] bg-[#F16522]/10'
                                  : 'border-[#A69B95]/30 hover:border-[#F16522]/50'
                              }`}
                            >
                              <p
                                className={`font-semibold ${formData.payment_type === type.value ? 'text-[#F16522]' : 'text-[#2C1810]'}`}
                              >
                                {type.label}
                              </p>
                              {type.amount > 0 && (
                                <p className="text-sm text-[#F16522] font-bold mt-1">
                                  {type.amount.toLocaleString()} FCFA
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Montant */}
                      <div>
                        <label className="form-label-premium">Montant</label>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                          }
                          className="form-input-premium mt-2 font-bold text-lg"
                          required
                        />
                      </div>

                      {/* Méthode de paiement */}
                      <div>
                        <label className="form-label-premium">Méthode de paiement</label>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, payment_method: 'mobile_money' })
                            }
                            className={`p-4 border-2 rounded-xl flex items-center space-x-3 transition-all ${
                              formData.payment_method === 'mobile_money'
                                ? 'border-[#F16522] bg-[#F16522]/10'
                                : 'border-[#A69B95]/30 hover:border-[#F16522]/50'
                            }`}
                          >
                            <Smartphone
                              className={`w-6 h-6 ${formData.payment_method === 'mobile_money' ? 'text-[#F16522]' : 'text-[#A69B95]'}`}
                            />
                            <span
                              className={`font-semibold ${formData.payment_method === 'mobile_money' ? 'text-[#F16522]' : 'text-[#2C1810]'}`}
                            >
                              Mobile Money
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, payment_method: 'carte_bancaire' })
                            }
                            className={`p-4 border-2 rounded-xl flex items-center space-x-3 transition-all ${
                              formData.payment_method === 'carte_bancaire'
                                ? 'border-[#F16522] bg-[#F16522]/10'
                                : 'border-[#A69B95]/30 hover:border-[#F16522]/50'
                            }`}
                          >
                            <CreditCard
                              className={`w-6 h-6 ${formData.payment_method === 'carte_bancaire' ? 'text-[#F16522]' : 'text-[#A69B95]'}`}
                            />
                            <span
                              className={`font-semibold ${formData.payment_method === 'carte_bancaire' ? 'text-[#F16522]' : 'text-[#2C1810]'}`}
                            >
                              Carte bancaire
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Mobile Money Options */}
                      {formData.payment_method === 'mobile_money' && (
                        <div className="space-y-4 p-4 bg-[#FAF7F4] rounded-xl border border-[#A69B95]/20">
                          <div>
                            <label className="form-label-premium">Opérateur Mobile Money</label>
                            <select
                              value={formData.mobile_money_provider}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  mobile_money_provider: e.target
                                    .value as PaymentFormData['mobile_money_provider'],
                                })
                              }
                              className="form-input-premium mt-2"
                              required
                            >
                              <option value="orange_money">🟠 Orange Money</option>
                              <option value="mtn_money">🟡 MTN Money</option>
                              <option value="moov_money">🔵 Moov Money</option>
                              <option value="wave">🌊 Wave</option>
                            </select>
                          </div>
                          <div>
                            <label className="form-label-premium">Numéro Mobile Money</label>
                            <input
                              type="tel"
                              value={formData.mobile_money_number}
                              onChange={(e) =>
                                setFormData({ ...formData, mobile_money_number: e.target.value })
                              }
                              className="form-input-premium mt-2"
                              placeholder="07 XX XX XX XX"
                              required
                            />
                          </div>
                        </div>
                      )}
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
                      type="submit"
                      disabled={submitting}
                      className="form-button-primary flex items-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Traitement...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmer le paiement</span>
                          <CheckCircle className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </FormStepContent>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
