import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Home,
  Bed,
  Bath,
  Maximize,
  Euro,
  Calendar,
  User,
  Building2,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Property {
  id: string;
  title: string;
  property_type: string;
  address: string;
  city: string;
  neighborhood: string;
  price: number;
  description: string;
  surface_area: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  status: string;
  main_image?: string;
  images?: any;
  latitude?: number | null;
  longitude?: number | null;
  owner_id: string;
  managed_by_agency?: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    full_name: string;
    email: string;
    phone: string;
  };
  managing_agency?: {
    agency_name: string;
    email: string;
    phone: string;
  };
}

export default function AgencyPropertyDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          *,
          owner:owner_id (
            full_name,
            email,
            phone
          ),
          managing_agency:managed_by_agency (
            agency_name,
            email,
            phone
          )
        `
        )
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data as Property);
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (error) throw error;
      navigate('/agences/biens');
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Erreur lors de la suppression de la propriété');
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Disponible
          </span>
        );
      case 'loue':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <User className="w-4 h-4 mr-1" />
            Loué
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <Clock className="w-4 h-4 mr-1" />
            En attente
          </span>
        );
      case 'retire':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-4 h-4 mr-1" />
            Retiré
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            En maintenance
          </span>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F4] min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#F16522]" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-[#FAF7F4] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#6B5A4E] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#2C1810] mb-2">
            Propriété non trouvée
          </h2>
          <p className="text-[#6B5A4E] mb-6">
            La propriété que vous recherchez n'existe pas ou a été supprimée
          </p>
          <button
            onClick={() => navigate('/agences/biens')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all"
          >
            Retour aux biens
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F4] min-h-screen pb-8">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-b-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/agences/biens')}
            className="inline-flex items-center gap-2 text-[#EFEBE9] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux biens</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/agences/biens/${property.id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
            <button
              onClick={() => setDeleteDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Badge */}
        <div className="mb-6">{getStatusBadge(property.status)}</div>

        {/* Title and Basic Info */}
        <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 sm:p-8 shadow-sm mb-6">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-4">{property.title}</h1>

          <div className="flex flex-wrap items-center gap-6 text-[#6B5A4E] mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#F16522]" />
              <span>
                {property.address && `${property.address}, `}
                {property.neighborhood && `${property.neighborhood}, `}
                {property.city}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-[#F16522]" />
              <span className="text-2xl font-bold text-[#2C1810]">
                {formatPrice(property.price)} FCFA
                <span className="text-sm font-normal text-[#6B5A4E]">/mois</span>
              </span>
            </div>
          </div>

          {/* Property Image */}
          <div className="mb-6 rounded-2xl overflow-hidden border-2 border-[#EFEBE9] bg-[#FAF7F4]">
            {property.main_image ? (
              <img
                src={property.main_image}
                alt={property.title}
                className="w-full h-64 sm:h-96 object-cover"
              />
            ) : (
              <div className="w-full h-64 sm:h-96 flex items-center justify-center">
                <ImageIcon className="w-24 h-24 text-[#EFEBE9]" />
              </div>
            )}
          </div>

          {/* Characteristics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#FAF7F4] border border-[#EFEBE9]">
              <Maximize className="w-6 h-6 text-[#F16522] mb-2" />
              <p className="text-2xl font-bold text-[#2C1810]">{property.surface_area}</p>
              <p className="text-sm text-[#6B5A4E]">m²</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F4] border border-[#EFEBE9]">
              <Home className="w-6 h-6 text-[#F16522] mb-2" />
              <p className="text-2xl font-bold text-[#2C1810]">{property.rooms || '-'}</p>
              <p className="text-sm text-[#6B5A4E]">pièces</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F4] border border-[#EFEBE9]">
              <Bed className="w-6 h-6 text-[#F16522] mb-2" />
              <p className="text-2xl font-bold text-[#2C1810]">{property.bedrooms || '-'}</p>
              <p className="text-sm text-[#6B5A4E]">chambres</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F4] border border-[#EFEBE9]">
              <Bath className="w-6 h-6 text-[#F16522] mb-2" />
              <p className="text-2xl font-bold text-[#2C1810]">{property.bathrooms || '-'}</p>
              <p className="text-sm text-[#6B5A4E]">salles de bain</p>
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h3 className="text-lg font-semibold text-[#2C1810] mb-3">Description</h3>
              <p className="text-[#6B5A4E] whitespace-pre-wrap">{property.description}</p>
            </div>
          )}
        </div>

        {/* Owner and Agency Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Owner Info */}
          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#F16522]/10 flex items-center justify-center">
                <User className="w-6 h-6 text-[#F16522]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#2C1810]">Propriétaire</h3>
                <p className="text-sm text-[#6B5A4E]">Informations du propriétaire</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-[#2C1810]">
                {property.owner?.full_name || 'Non renseigné'}
              </p>
              {property.owner?.email && (
                <p className="text-sm text-[#6B5A4E]">{property.owner.email}</p>
              )}
              {property.owner?.phone && (
                <p className="text-sm text-[#6B5A4E]">{property.owner.phone}</p>
              )}
            </div>
          </div>

          {/* Agency Info */}
          {property.managing_agency && (
            <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F16522]/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#F16522]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#2C1810]">Agence gestionnaire</h3>
                  <p className="text-sm text-[#6B5A4E]">Votre agence</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="font-medium text-[#2C1810]">
                  {property.managing_agency.agency_name}
                </p>
                {property.managing_agency.email && (
                  <p className="text-sm text-[#6B5A4E]">{property.managing_agency.email}</p>
                )}
                {property.managing_agency.phone && (
                  <p className="text-sm text-[#6B5A4E]">{property.managing_agency.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="mt-6 bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Informations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#6B5A4E]">Créée le</p>
              <p className="font-medium text-[#2C1810]">
                {format(new Date(property.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
            <div>
              <p className="text-[#6B5A4E]">Modifiée le</p>
              <p className="font-medium text-[#2C1810]">
                {format(new Date(property.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#2C1810] mb-2">
              Confirmer la suppression
            </h3>
            <p className="text-[#6B5A4E] mb-6">
              Êtes-vous sûr de vouloir supprimer la propriété "{property.title}" ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialog(false)}
                disabled={deleting}
                className="px-4 py-2 border-2 border-[#EFEBE9] rounded-xl text-[#2C1810] hover:bg-[#FAF7F4] transition-all font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
