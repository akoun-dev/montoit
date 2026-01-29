import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { downloadContract, regenerateContract } from '@/services/contracts/contractService';
import {
  ArrowLeft,
  FileText,
  Download,
  RefreshCw,
  X,
  Shield,
  PenTool,
  Calendar,
  MapPin,
  Home as HomeIcon,
  CreditCard,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { canvasToBase64 } from '@/services/contracts/signatureService';
import { ElectronicSignatureModal } from '@/shared/ui/electronic-signature';
import { apiKeysConfig } from '@/shared/config/api-keys.config';
import { Button } from '@/shared/ui/Button';

interface LeaseContract {
  id: string;
  contract_number: string;
  property_id: string;
  lease_id?: string;
  owner_id: string;
  tenant_id: string;
  agency_id?: string;
  status: string | null;
  start_date: string;
  end_date: string;
  end_at?: string | null;
  monthly_rent: number;
  deposit_amount: number | null;
  charges_amount: number | null;
  custom_clauses: string | null;
  document_url?: string;
  draft_document_url?: string;
  inventory_details?: Record<string, any>;
  owner_signed_at?: string | null;
  tenant_signed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface Property {
  id: string;
  title: string;
  address: AddressValue | null;
  city: string;
  property_type: string;
  surface_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

interface Profile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

// Helper component for stat cards
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'orange' | 'gray' | 'purple';
}) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};

// Contract status badge component
const ContractStatusBadge = ({ status }: { status: string | null }) => {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    brouillon: {
      label: 'Brouillon',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: <FileText className="w-4 h-4" />,
    },
    en_attente_signature: {
      label: 'En attente de signature',
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      icon: <Clock className="w-4 h-4" />,
    },
    actif: {
      label: 'Actif',
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    expire: {
      label: 'Expiré',
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    resilie: {
      label: 'Résilié',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: <X className="w-4 h-4" />,
    },
    annule: {
      label: 'Annulé',
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: <X className="w-4 h-4" />,
    },
  };

  const config = statusConfig[status || 'brouillon'] || statusConfig.brouillon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color}`}
    >
      {config.icon}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status, signedAt }: { status: string; signedAt?: string | null }) => {
  if (signedAt) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-green-600 font-medium">Signé</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Clock className="w-4 h-4 text-amber-500" />
      <span className="text-amber-600 font-medium">En attente</span>
    </div>
  );
};

export default function ContractDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contract, setContract] = useState<LeaseContract | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState<'manual' | 'electronic' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);

  const contractId = window.location.pathname.split('/').pop() || '';

  useEffect(() => {
    if (contractId) {
      loadContract(contractId);
    }
  }, []);

  const loadContract = async (id: string) => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        navigate('/locataire/contrats');
        return;
      }

      const contractData = data as unknown as LeaseContract;

      // Check access
      const hasAccess =
        contractData.owner_id === user?.id ||
        contractData.tenant_id === user?.id ||
        (contractData.agency_id && contractData.agency_id === user?.id);

      if (!hasAccess) {
        navigate('/locataire/contrats');
        return;
      }

      setContract(contractData);

      // Load related data
      const [propData, ownerData, tenantData] = await Promise.all([
        supabase
          .from('properties')
          .select('title, address, city, property_type, surface_area, bedrooms, bathrooms')
          .eq('id', contractData.property_id)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', contractData.owner_id)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', contractData.tenant_id)
          .single(),
      ]);

      if (propData.data) setProperty({ ...propData.data, id: contractData.property_id });
      if (ownerData.data) setOwner(ownerData.data);
      if (tenantData.data) setTenant(tenantData.data);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!contract?.document_url) return;
    try {
      await downloadContract(contract.document_url, `contrat-${contract.contract_number}.pdf`);
    } catch (error) {
      console.error('Error downloading contract:', error);
    }
  };

  const handleDownloadDraft = async () => {
    if (!contract?.draft_document_url) return;
    try {
      await downloadContract(
        contract.draft_document_url,
        `brouillon-${contract.contract_number}.pdf`
      );
    } catch (error) {
      console.error('Error downloading draft:', error);
    }
  };

  const handleDownloadInventory = async () => {
    if (!contract?.inventory_details) {
      alert('Aucun inventaire disponible pour ce contrat');
      return;
    }
    try {
      // Create a JSON file from inventory details
      const dataStr = JSON.stringify(contract.inventory_details, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventaire-${contract.contract_number}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading inventory:', error);
    }
  };

  const handleDownloadDiagnostic = async () => {
    try {
      // Générer un diagnostic technique basé sur les informations du contrat et de la propriété
      const diagnosticData = {
        contract_number: contract.contract_number,
        property_id: contract.property_id,
        property_title: property?.title,
        property_address: property?.address ? formatAddress(property.address as AddressValue) : '',
        city: property?.city,
        property_type: property?.property_type,
        surface_area: property?.surface_area,
        bedrooms: property?.bedrooms,
        diagnostic_date: new Date().toISOString(),
        diagnostic_type: 'Diagnostic technique immobilier',
        performance_energetique: {
          classe: 'En attente',
          valeur: null,
        },
        gaz: {
          classe: 'En attente',
          valeur: null,
        },
        electricite: {
          classe: 'En attente',
          valeur: null,
        },
        plomb: {
          presence: 'En attente',
          valeur: null,
        },
        amiante: {
          presence: 'En attente',
          valeur: null,
        },
      };

      const dataStr = JSON.stringify(diagnosticData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostic-${contract.contract_number}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading diagnostic:', error);
    }
  };

  const handleDownloadEtatDesLieux = async () => {
    try {
      // Générer un état des lieux
      const etatDesLieuxData = {
        contract_number: contract.contract_number,
        property_id: contract.property_id,
        property_title: property?.title,
        property_address: property?.address ? formatAddress(property.address as AddressValue) : '',
        city: property?.city,
        tenant_name: tenant?.full_name,
        owner_name: owner?.full_name,
        start_date: contract.start_date,
        end_date: contract.end_date || contract.end_at,
        etat_entree: {
          date: contract.start_date,
          etat: 'En attente de réalisation',
          observations: [],
        },
        etat_sortie: {
          date: contract.end_date || contract.end_at,
          etat: 'À réaliser',
          observations: [],
        },
        inventory: contract.inventory_details || {},
      };

      const dataStr = JSON.stringify(etatDesLieuxData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etat-des-lieux-${contract.contract_number}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading etat des lieux:', error);
    }
  };

  const handleDownloadJustificatifDomicile = async () => {
    try {
      // Générer un justificatif de domicile
      const proofData = {
        type_document: 'Justificatif de Domicile',
        contract_number: contract.contract_number,
        date_generation: new Date().toISOString(),
        locataire: {
          nom: tenant?.full_name,
          email: tenant?.email,
        },
        proprietaire: {
          nom: owner?.full_name,
          email: owner?.email,
        },
        logement: {
          titre: property?.title,
          adresse: property?.address ? formatAddress(property.address as AddressValue) : '',
          ville: property?.city,
          type: property?.property_type,
          surface: property?.surface_area,
        },
        contrat: {
          date_debut: contract.start_date,
          date_fin: contract.end_date || contract.end_at,
          loyer_mensuel: contract.monthly_rent,
          statut: contract.status,
        },
        document_url: contract.document_url,
        signature_status: isFullySigned ? 'Signé par les deux parties' : 'En attente de signature',
      };

      const dataStr = JSON.stringify(proofData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `justificatif-domicile-${contract.contract_number}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading justificatif:', error);
    }
  };

  const handleRegenerate = async () => {
    if (!contract) return;
    try {
      setRegenerating(true);
      await regenerateContract(contract.id);
      await loadContract(contractId);
    } catch (error) {
      console.error('Error regenerating contract:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const calculateDuration = (startDate: string, endDate?: string | null, endAt?: string | null) => {
    const start = new Date(startDate);
    const end = new Date(endDate || endAt || '');
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  };

  // Canvas drawing handlers
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!contract || !user) return;

    try {
      setSigning(true);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const signatureData = canvasToBase64(canvas);
      const signatureType = contract.owner_id === user.id ? 'landlord' : 'tenant';
      const now = new Date().toISOString();

      // Enregistrer le log de signature électronique
      await supabase.from('electronic_signature_logs').insert({
        lease_id: contract.id,
        initiated_by: user.id,
        operation_id: `sig-${user.id}-${Date.now()}`,
        status: 'completed',
        cryptoneo_response: {
          signature_type: signatureType,
          signature_data: signatureData,
          signed_at: now,
        },
      });

      const updates: any = { updated_at: now };
      if (signatureType === 'landlord') {
        updates.owner_signed_at = now;
        // Si le locataire a déjà signé, passer le contrat à actif
        if (contract.tenant_signed_at) {
          updates.status = 'actif';
        } else {
          updates.status = 'en_attente_signature';
        }
      } else {
        updates.tenant_signed_at = now;
        // Si le propriétaire a déjà signé, passer le contrat à actif
        if (contract.owner_signed_at) {
          updates.status = 'actif';
        }
      }

      console.log('Mise à jour du contrat:', updates);

      const { error: updateError } = await supabase
        .from('lease_contracts')
        .update(updates)
        .eq('id', contract.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError);
        throw updateError;
      }

      console.log('Contrat mis à jour avec succès');

      setSignatureMethod(null);
      await loadContract(contractId);
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Contrat non trouvé</p>
        </div>
      </div>
    );
  }

  const isFullySigned = contract.owner_signed_at && contract.tenant_signed_at;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Contrat de Location</h1>
                  <p className="text-sm text-gray-500">N° {contract.contract_number}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ContractStatusBadge status={contract.status} />
              <Button
                variant="outline"
                size="small"
                onClick={handleDownload}
                disabled={!contract.document_url}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{regenerating ? '...' : 'Regénérer'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Contract Details - Full Width */}
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-xl border ${
                isFullySigned ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isFullySigned ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {isFullySigned
                      ? 'Contrat entièrement signé'
                      : 'Contrat en attente de signature'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isFullySigned
                      ? 'Le contrat est maintenant actif et a valeur légale'
                      : 'Les deux parties doivent signer pour activer le contrat'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conditions financières</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={CreditCard}
                  label="Loyer mensuel"
                  value={`${contract.monthly_rent?.toLocaleString()} FCFA`}
                  color="green"
                />
                <StatCard
                  icon={Shield}
                  label="Dépôt de garantie"
                  value={`${contract.deposit_amount?.toLocaleString() || 0} FCFA`}
                  color="blue"
                />
                <StatCard
                  icon={Calendar}
                  label="Durée"
                  value={`${calculateDuration(contract.start_date, contract.end_date, contract.end_at)} mois`}
                  color="purple"
                />
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bien immobilier</h2>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <HomeIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{property?.title}</h3>
                  <div className="flex items-center gap-1 text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {property?.address ? formatAddress(property.address as AddressValue) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{property?.city}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <span className="text-gray-600">
                      <span className="font-medium">{property?.surface_area} m²</span> de surface
                    </span>
                    <span className="text-gray-600">
                      <span className="font-medium">{property?.bedrooms}</span> chambre
                      {property?.bedrooms > 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-600">
                      <span className="font-medium">{property?.bathrooms}</span> salle
                      {property?.bathrooms > 1 ? 's' : ''} de bain
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Parties au contrat</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Propriétaire */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-gray-900">Propriétaire</h3>
                  </div>
                  <div className="pl-7 space-y-1">
                    <p className="text-gray-900">{owner?.full_name}</p>
                    <p className="text-sm text-gray-500">{owner?.email}</p>
                    <p className="text-sm text-gray-500">{owner?.phone}</p>
                  </div>
                  <div className="pl-7">
                    <StatusBadge status="owner" signedAt={contract.owner_signed_at} />
                  </div>
                </div>

                {/* Locataire */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Locataire</h3>
                  </div>
                  <div className="pl-7 space-y-1">
                    <p className="text-gray-900">{tenant?.full_name}</p>
                    <p className="text-sm text-gray-500">{tenant?.email}</p>
                    <p className="text-sm text-gray-500">{tenant?.phone}</p>
                  </div>
                  <div className="pl-7">
                    <StatusBadge status="tenant" signedAt={contract.tenant_signed_at} />
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              {/* Shared Documents Section */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#F16522]" />
                  Documents du contrat
                </h2>

                <div className="space-y-3">
                  {/* Contrat signé */}
                  {contract.document_url && (
                    <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg border border-[#EFEBE9]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileText className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-[#2C1810]">Contrat signé</p>
                          <p className="text-sm text-gray-500">
                            Document final signé par les parties
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={handleDownload}
                        className="text-[#F16522] border-[#F16522] hover:bg-[#F16522]/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Brouillon du contrat */}
                  {contract.draft_document_url && (
                    <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg border border-[#EFEBE9]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-[#2C1810]">Brouillon du contrat</p>
                          <p className="text-sm text-gray-500">Version avant signature</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={handleDownloadDraft}
                        className="text-[#F16522] border-[#F16522] hover:bg-[#F16522]/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Inventaire */}
                  {contract.inventory_details &&
                    Object.keys(contract.inventory_details).length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg border border-[#EFEBE9]">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#F16522]/10 rounded-lg">
                            <FileText className="w-5 h-5 text-[#F16522]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#2C1810]">Inventaire du logement</p>
                            <p className="text-sm text-gray-500">
                              État des lieux, photos, équipements
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={handleDownloadInventory}
                          className="text-[#F16522] border-[#F16522] hover:bg-[#F16522]/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                  {/* Diagnostic */}
                  <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg border border-[#EFEBE9]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[#2C1810]">Diagnostic technique</p>
                        <p className="text-sm text-gray-500">Consommation, diagnostics</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleDownloadDiagnostic}
                      className="text-[#F16522] border-[#F16522] hover:bg-[#F16522]/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* états des lieux */}
                  <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg border border-[#EFEBE9]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[#2C1810]">État des lieux</p>
                        <p className="text-sm text-gray-500">Signé à l'entrée et à la sortie</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleDownloadEtatDesLieux}
                      className="text-[#F16522] border-[#F16522] hover:bg-[#F16522]/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Justificatif de domicile */}
                  <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg border border-[#EFEBE9]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[#2C1810]">Justificatif de domicile</p>
                        <p className="text-sm text-gray-500">
                          {isFullySigned
                            ? 'Document officiel'
                            : 'Document provisoire (en attente de signature)'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleDownloadJustificatifDomicile}
                      className="text-[#F16522] border-[#F16522] hover:bg-[#F16522]/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 Ces documents sont partagés entre le propriétaire et le locataire. Les
                    justificatifs sont disponibles une fois le contrat signé par les deux parties.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Signature du contrat</h2>

              {!isFullySigned && (
                <div className="space-y-3">
                  {/* Electronic Signature - Featured */}
                  {apiKeysConfig.signature.cryptoneo.isConfigured && (
                    <button
                      onClick={() => setSignatureMethod('electronic')}
                      className="w-full p-4 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:border-orange-400 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">Signature électronique</h3>
                            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                              Recommandé
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Signature certifiée CryptoNeo avec valeur légale
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Manual Signature */}
                  <button
                    onClick={() => setSignatureMethod('manual')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <PenTool className="w-6 h-6 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Signature manuscrite</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Dessinez votre signature à l'écran
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Signature Status */}
              <div className="mt-6 pt-6 border-t space-y-4">
                <h3 className="font-semibold text-gray-900 text-sm">Statut des signatures</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Propriétaire</span>
                    </div>
                    <StatusBadge status="owner" signedAt={contract.owner_signed_at} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Locataire</span>
                    </div>
                    <StatusBadge status="tenant" signedAt={contract.tenant_signed_at} />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    La signature électronique CryptoNeo a la même valeur légale qu'une signature
                    notariée.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Signature Modal */}
        {signatureMethod === 'manual' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Signature manuscrite</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Dessinez votre signature dans le cadre ci-dessous
                  </p>
                </div>
                <button
                  onClick={() => setSignatureMethod(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="border-2 border-gray-300 rounded-xl mb-4 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full h-48 cursor-crosshair touch-none bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={clearSignature}>
                  Effacer
                </Button>
                <Button onClick={handleSign} disabled={signing} className="min-w-[160px]">
                  {signing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signature...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Electronic Signature Modal */}
        {contract?.document_url && (
          <ElectronicSignatureModal
            isOpen={signatureMethod === 'electronic'}
            onClose={() => setSignatureMethod(null)}
            documents={[
              {
                id: contract.id,
                url: contract.document_url,
                title: `Contrat de location n° ${contract.contract_number}`,
              },
            ]}
            contractId={contract.id}
            onSuccess={() => {
              setSignatureMethod(null);
              loadContract(contractId);
            }}
            onError={() => {
              // Modal stays open on error
            }}
          />
        )}
      </div>
    </div>
  );
}
