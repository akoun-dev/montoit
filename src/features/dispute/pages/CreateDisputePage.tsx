import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Banknote,
  Wrench,
  Volume2,
  FileWarning,
  Home,
  ArrowLeft,
  Upload,
  X,
  Loader2,
} from 'lucide-react';

const CATEGORIES = [
  {
    value: 'payment',
    label: 'Paiement',
    icon: Banknote,
    description: 'Loyer impayé, charges contestées',
  },
  {
    value: 'deposit',
    label: 'Caution',
    icon: Banknote,
    description: 'Retenue de caution, remboursement',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    description: 'Travaux non effectués, réparations',
  },
  {
    value: 'noise',
    label: 'Nuisances',
    icon: Volume2,
    description: 'Bruit, troubles de voisinage',
  },
  {
    value: 'damages',
    label: 'Dégâts',
    icon: FileWarning,
    description: 'Dégradations, état des lieux',
  },
  {
    value: 'lease_violation',
    label: 'Violation bail',
    icon: Home,
    description: 'Non-respect du contrat',
  },
  { value: 'other', label: 'Autre', icon: AlertTriangle, description: 'Autre type de litige' },
];

export default function CreateDisputePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contracts, setContracts] = useState<
    Array<{ id: string; property_title: string; other_party_name: string; other_party_id: string }>
  >([]);

  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
    contract_id: searchParams.get('contract') || '',
    respondent_id: searchParams.get('respondent') || '',
    evidence: [] as string[],
  });

  useEffect(() => {
    if (user) {
      loadContracts();
    }
  }, [user]);

  const loadContracts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('lease_contracts')
      .select(
        `
        id,
        owner_id,
        tenant_id,
        properties:property_id (title)
      `
      )
      .or(`owner_id.eq.${user.id},tenant_id.eq.${user.id}`)
      .eq('status', 'actif');

    if (!error && data) {
      const formattedContracts = await Promise.all(
        data.map(async (contract) => {
          const otherPartyId =
            contract.owner_id === user.id ? contract.tenant_id : contract.owner_id;

          const { data: profile } = await supabase.rpc('get_public_profile', {
            profile_user_id: otherPartyId,
          });

          const profileData = Array.isArray(profile) ? profile[0] : profile;

          return {
            id: contract.id,
            property_title: (contract.properties as { title?: string })?.title || 'Propriété',
            other_party_name: profileData?.full_name || 'Utilisateur',
            other_party_id: otherPartyId,
          };
        })
      );

      setContracts(formattedContracts);
    }
  };

  const handleCategorySelect = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    setStep(2);
  };

  const handleContractSelect = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    if (contract) {
      setFormData((prev) => ({
        ...prev,
        contract_id: contractId,
        respondent_id: contract.other_party_id,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (
      !formData.category ||
      !formData.subject ||
      !formData.description ||
      !formData.respondent_id
    ) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.description.length < 100) {
      toast.error('La description doit contenir au moins 100 caractères');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-dispute', {
        body: {
          respondent_id: formData.respondent_id,
          contract_id: formData.contract_id || null,
          category: formData.category,
          subject: formData.subject,
          description: formData.description,
          evidence: formData.evidence,
        },
      });

      if (error) throw error;

      toast.success('Litige créé avec succès');
      navigate(`/litige/${data.dispute.id}`);
    } catch (error) {
      console.error('Erreur création litige:', error);
      toast.error('Erreur lors de la création du litige');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>

          <h1 className="text-3xl font-bold text-[#2C1810]">Signaler un litige</h1>
          <p className="text-muted-foreground mt-2">
            Notre équipe de médiation vous aidera à résoudre ce différend.
          </p>

          {/* Progress */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-[#F16522]' : 'bg-[#EFEBE9]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-6">
              Quel est le type de litige ?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${
                      formData.category === cat.value
                        ? 'border-[#F16522] bg-[#F16522]/5'
                        : 'border-[#EFEBE9] bg-white hover:border-[#F16522]/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          formData.category === cat.value
                            ? 'bg-[#F16522] text-white'
                            : 'bg-[#EFEBE9] text-[#2C1810]'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2C1810]">{cat.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-6">Détails du litige</h2>

            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6 space-y-6">
              {/* Contract Selection */}
              {contracts.length > 0 && (
                <div className="space-y-2">
                  <Label>Contrat concerné (optionnel)</Label>
                  <Select value={formData.contract_id} onValueChange={handleContractSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.property_title} - {contract.other_party_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet du litige *</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Ex: Loyer de novembre non remboursé"
                  value={formData.subject}
                  onChange={handleInputChange}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.subject.length}/100
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description détaillée *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Décrivez en détail la situation, les faits, les dates importantes..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  className="resize-none"
                />
                <p
                  className={`text-xs text-right ${
                    formData.description.length < 100 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {formData.description.length}/100 minimum
                </p>
              </div>

              <Button
                onClick={() => setStep(3)}
                disabled={!formData.subject || formData.description.length < 100}
                className="w-full bg-[#F16522] hover:bg-[#F16522]/90"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Evidence & Submit */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-6">Preuves et validation</h2>

            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6 space-y-6">
              {/* Evidence Upload */}
              <div className="space-y-2">
                <Label>Pièces justificatives (optionnel)</Label>
                <div className="border-2 border-dashed border-[#EFEBE9] rounded-xl p-8 text-center">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Glissez vos fichiers ici ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Photos, documents PDF (max 10MB chacun)
                  </p>
                </div>

                {formData.evidence.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {formData.evidence.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-[#EFEBE9] rounded-lg px-3 py-2"
                      >
                        <span className="text-sm truncate max-w-[150px]">{file}</span>
                        <button
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              evidence: prev.evidence.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-[#FAF7F4] rounded-xl p-4 space-y-3">
                <h3 className="font-medium text-[#2C1810]">Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Catégorie:</span>
                    <span className="font-medium">
                      {CATEGORIES.find((c) => c.value === formData.category)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sujet:</span>
                    <span className="font-medium truncate max-w-[200px]">{formData.subject}</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Information importante</p>
                  <p className="text-amber-700 mt-1">
                    En soumettant ce litige, vous acceptez que notre équipe de médiation contacte
                    les deux parties pour tenter de trouver une solution amiable.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#F16522] hover:bg-[#F16522]/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Soumettre le litige'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
