import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { downloadContract, regenerateContract } from '@/services/contracts/contractService';
import { ArrowLeft, FileText, Download, RefreshCw, X } from 'lucide-react';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { saveContractSignature, canvasToBase64 } from '@/services/contracts/signatureService';
import { toast } from 'sonner';

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
  monthly_rent: number;
  deposit_amount: number | null;
  charges_amount: number | null;
  custom_clauses: string | null;
  document_url?: string;
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

export default function ContractDetailPage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contract, setContract] = useState<LeaseContract | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const contractId = window.location.pathname.split('/').pop();
    if (contractId) {
      loadContract(contractId);
    }
  }, []);

  const loadContract = async (contractId: string) => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Load contract
      const { data, error } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;

      const contractData = data as unknown as LeaseContract;

      if (!contractData) {
        alert('Contrat non trouvé');
        window.location.href = '/dashboard';
        return;
      }

      // Check access rights based on user role
      const hasAccess =
        contractData.owner_id === user?.id ||
        contractData.tenant_id === user?.id ||
        (contractData.agency_id && contractData.agency_id === user?.id);

      if (!hasAccess) {
        alert("Vous n'avez pas accès à ce contrat");

        // Redirect to appropriate contracts list based on user role
        const userRole = (user as { user_type?: string })?.user_type;
        let redirectUrl = '/dashboard';

        if (userRole === 'tenant') {
          redirectUrl = '/locataire/contrats';
        } else if (userRole === 'proprietaire' || userRole === 'owner') {
          redirectUrl = '/proprietaire/contrats';
        } else if (userRole === 'agence' || userRole === 'agency') {
          redirectUrl = '/agences/contrats';
        }

        window.location.href = redirectUrl;
        return;
      }

      setContract(contractData);

      // Load property
      const { data: propData } = await supabase
        .from('properties')
        .select('title, address, city, property_type, surface_area, bedrooms, bathrooms')
        .eq('id', contractData.property_id)
        .single();

      if (propData) setProperty({ ...propData, id: contractData.property_id });

      // Load owner profile
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', contractData.owner_id)
        .single();

      if (ownerData) setOwner(ownerData);

      // Load tenant profile
      const { data: tenantData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', contractData.tenant_id)
        .single();

      if (tenantData) setTenant(tenantData);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!contract?.document_url) {
        alert('Aucun PDF disponible pour ce contrat. Veuillez d abord régénérer le contrat.');
        return;
      }

      const filename = `contrat-${contract.contract_number}.pdf`;
      await downloadContract(contract.document_url, filename);
    } catch (error) {
      console.error('Error downloading contract:', error);
      alert('Erreur lors du téléchargement du contrat');
    }
  };

  const handleRegenerate = async (contractId: string) => {
    try {
      setRegenerating(true);
      await regenerateContract(contractId);
      alert('Contrat regénéré avec succès');
    } catch (error) {
      console.error('Error regenerating contract:', error);
      alert('Erreur lors de la régénération du contrat');
    } finally {
      setRegenerating(false);
    }
  };

  const generateContractContent = () => {
    if (!contract || !property || !owner || !tenant) return '';

    return `
CONTRAT DE LOCATION N° ${contract.contract_number}

Entre les soussignés :
Le Propriétaire : ${owner.full_name}
Email : ${owner.email}
Téléphone : ${owner.phone || 'Non spécifié'}

Et le Locataire : ${tenant.full_name}
Email : ${tenant.email}
Téléphone : ${tenant.phone || 'Non spécifié'}

Il a été convenu ce qui suit :

ARTICLE 1 - OBJET DU CONTRAT
Le Propriétaire loue au Locataire le bien immobilier suivant :
${property.title}
${property.address ? formatAddress(property.address as AddressValue) : ''}
${property.city}

Caractéristiques du bien :
- Surface : ${property.surface_area} m²
- Nombre de chambres : ${property.bedrooms}
- Nombre de salles de bain : ${property.bathrooms}

ARTICLE 2 - DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée de ${calculateDuration(
      contract.start_date,
      contract.end_date
    )} mois,
à compter du ${new Date(contract.start_date).toLocaleDateString('fr-FR')}
jusqu'au ${new Date(contract.end_date).toLocaleDateString('fr-FR')}.

ARTICLE 3 - LOYER ET CHARGES
Le loyer mensuel est fixé à ${contract.monthly_rent.toLocaleString()} FCFA.
Le dépôt de garantie s'élève à ${contract.deposit_amount?.toLocaleString() || '0'} FCFA.
Les charges s'élèvent à ${contract.charges_amount?.toLocaleString() || '0'} FCFA.

ARTICLE 4 - CONDITIONS PARTICULIÈRES
${contract.custom_clauses || 'Aucune condition particulière'}

Fait à ${new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}
    `;
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months;
  };

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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSign = async () => {
    if (!contract || !user) {
      alert('Contrat ou utilisateur non disponible');
      return;
    }

    try {
      setSigning(true);

      // Convert canvas to base64
      const canvas = canvasRef.current;
      if (!canvas) {
        alert('Zone de signature non disponible');
        return;
      }

      const signatureData = canvasToBase64(canvas);
      const signatureType = contract.owner_id === user.id ? 'landlord' : 'tenant';

      // Save the signature
      await saveContractSignature({
        contractId: contract.id,
        userId: user.id,
        signatureType: signatureType,
        signatureData: signatureData,
        signedAt: now,
      });

      // Update contract status based on who signed
      const now = new Date().toISOString();
      const updates: any = {
        updated_at: now,
      };

      if (signatureType === 'landlord') {
        updates.landlord_signed_at = now;
        // If landlord signs first, contract becomes partially signed
        if (!contract.tenant_signed_at) {
          updates.status = 'partiellement_signe';
        }
      } else {
        updates.tenant_signed_at = now;
        // If tenant signs and landlord already signed, contract becomes active
        if (contract.landlord_signed_at) {
          updates.status = 'actif';
          updates.is_electronically_signed = true;
        }
      }

      // Update the contract in database
      const { error } = await supabase
        .from('lease_contracts')
        .update(updates)
        .eq('id', contract.id);

      if (error) throw error;

      toast.success('Signature enregistrée avec succès');
      setShowSignature(false);

      // Reload contract to get updated status
      await loadContract(window.location.pathname.split('/').pop() || '');
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Veuillez vous connecter</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Contrat non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-4 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-orange-500" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Contrat de Location</h1>
                  <p className="text-sm text-gray-600">Numéro: {contract.contract_number}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </button>
                <button
                  onClick={() => handleRegenerate(contract.id)}
                  disabled={regenerating}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{regenerating ? 'Regénération...' : 'Regénérer'}</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Propriétaire</h3>
                <p className="text-gray-700">{owner?.full_name}</p>
                <p className="text-gray-600">{owner?.email}</p>
                <p className="text-gray-600">{owner?.phone}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Locataire</h3>
                <p className="text-gray-700">{tenant?.full_name}</p>
                <p className="text-gray-600">{tenant?.email}</p>
                <p className="text-gray-600">{tenant?.phone}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations sur le bien</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Adresse</h3>
                <p className="text-gray-700">{property?.title}</p>
                <p className="text-gray-600">
                  {property?.address ? formatAddress(property.address as AddressValue) : ''}
                </p>
                <p className="text-gray-600">{property?.city}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Caractéristiques</h3>
                <p className="text-gray-700">{property?.surface_area} m²</p>
                <p className="text-gray-700">{property?.bedrooms} chambres</p>
                <p className="text-gray-700">{property?.bathrooms} salles de bain</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Conditions financières</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Loyer mensuel</h3>
                <p className="text-2xl font-bold text-green-600">
                  {contract?.monthly_rent?.toLocaleString()} FCFA
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Dépôt de garantie</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {contract?.deposit_amount?.toLocaleString()} FCFA
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Durée</h3>
                <p className="text-2xl font-bold text-gray-700">
                  {calculateDuration(contract.start_date, contract.end_date)} mois
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
              {generateContractContent()}
            </pre>
          </div>
        </div>
      </div>

      {showSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Signer le contrat</h3>
              <button
                onClick={() => setShowSignature(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Dessinez votre signature dans le cadre ci-dessous
            </p>

            <div className="border-2 border-gray-300 rounded-lg mb-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full h-48 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={clearSignature}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Effacer
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
              >
                {signing ? 'Signature...' : 'Confirmer la signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
