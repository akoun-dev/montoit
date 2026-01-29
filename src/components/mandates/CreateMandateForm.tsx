/**
 * Formulaire de création/édition de mandat avec UX améliorée
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Home,
  Building2,
  MapPin,
  Percent,
  Calendar,
  FileText,
  Check,
  ChevronRight,
  AlertCircle,
  Info,
  Shield,
  Users,
  FileCheck,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  monthly_rent: number;
  main_image: string | null;
}

interface Agency {
  id: string;
  agency_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  logo_url: string | null;
  commission_rate: number;
}

interface MandatePermissions {
  can_view_properties: boolean;
  can_edit_properties: boolean;
  can_create_properties: boolean;
  can_delete_properties: boolean;
  can_view_applications: boolean;
  can_manage_applications: boolean;
  can_create_leases: boolean;
  can_view_financials: boolean;
  can_manage_maintenance: boolean;
  can_communicate_tenants: boolean;
  can_manage_documents: boolean;
}

interface CreateMandateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  propertyId?: string;
}

type Step = 'property' | 'agency' | 'permissions' | 'confirm';

export default function CreateMandateForm({ isOpen, onClose, onSuccess, propertyId }: CreateMandateFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('property');
  const [loading, setLoading] = useState(false);

  // Form data
  const [selectedProperty, setSelectedProperty] = useState<string | null>(propertyId || null);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [mandateScope, setMandateScope] = useState<'single_property' | 'all_properties'>('single_property');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string | ''>('');
  const [commissionRate, setCommissionRate] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [permissions, setPermissions] = useState<MandatePermissions>({
    can_view_properties: true,
    can_edit_properties: false,
    can_create_properties: false,
    can_delete_properties: false,
    can_view_applications: true,
    can_manage_applications: false,
    can_create_leases: false,
    can_view_financials: false,
    can_manage_maintenance: false,
    can_communicate_tenants: true,
    can_manage_documents: false,
  });

  const [properties, setProperties] = useState<Property[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (propertyId) {
        setSelectedProperty(propertyId);
        setCurrentStep('agency');
      }
    }
  }, [isOpen, propertyId]);

  const loadData = async () => {
    if (!user) return;

    // Load properties
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('id, title, city, neighborhood, monthly_rent, main_image')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    setProperties((propertiesData || []) as Property[]);

    // Load agencies
    const { data: agenciesData } = await supabase
      .from('agencies')
      .select('id, agency_name, email, phone, city, logo_url, commission_rate')
      .eq('status', 'active')
      .order('agency_name');

    setAgencies((agenciesData || []) as Agency[]);
  };

  const filteredProperties = searchQuery
    ? properties.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : properties;

  const filteredAgencies = searchQuery
    ? agencies.filter(
        (a) =>
          a.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.city && a.city.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : agencies;

  const handleSubmit = async () => {
    if (!selectedAgency) {
      toast.error('Veuillez sélectionner une agence');
      return;
    }

    if (mandateScope === 'single_property' && !selectedProperty) {
      toast.error('Veuillez sélectionner un bien');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('agency_mandates').insert({
        property_id: mandateScope === 'all_properties' ? null : selectedProperty,
        agency_id: selectedAgency,
        owner_id: user?.id,
        mandate_scope: mandateScope,
        start_date: startDate,
        end_date: endDate || null,
        commission_rate: commissionRate,
        notes: notes || null,
        status: 'pending',
        ...permissions,
      });

      if (error) throw error;

      toast.success('Mandat créé avec succès');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating mandate:', error);
      toast.error('Erreur lors de la création du mandat');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('property');
    setSelectedProperty(null);
    setSelectedAgency(null);
    setMandateScope('single_property');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
    setCommissionRate(8);
    setNotes('');
    setPermissions({
      can_view_properties: true,
      can_edit_properties: false,
      can_create_properties: false,
      can_delete_properties: false,
      can_view_applications: true,
      can_manage_applications: false,
      can_create_leases: false,
      can_view_financials: false,
      can_manage_maintenance: false,
      can_communicate_tenants: true,
      can_manage_documents: false,
    });
    setSearchQuery('');
    onClose();
  };

  const togglePermission = (key: keyof MandatePermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  const steps = [
    { key: 'property', label: 'Bien', icon: Home },
    { key: 'agency', label: 'Agence', icon: Building2 },
    { key: 'permissions', label: 'Permissions', icon: Shield },
    { key: 'confirm', label: 'Confirmation', icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-[20px] w-full max-w-3xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#EFEBE9] rounded-t-[20px] px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#2C1810]">Créer un nouveau mandat</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#FAF7F4] rounded-xl transition-colors"
            >
              <X className="h-5 w-5 text-[#6B5A4E]" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-green-500'
                          : isCurrent
                          ? 'bg-[#F16522]'
                          : 'bg-[#EFEBE9]'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <StepIcon className={`h-5 w-5 ${isCurrent ? 'text-white' : 'text-[#6B5A4E]'}`} />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-[#F16522]' : isCompleted ? 'text-green-600' : 'text-[#6B5A4E]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-4 bg-[#EFEBE9] rounded">
                      <div
                        className="h-full bg-[#F16522] rounded transition-all"
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Property */}
          {currentStep === 'property' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2C1810] mb-2">Sélectionnez le bien concerné</h3>
                <p className="text-[#6B5A4E]">Choisissez le bien immobilier pour ce mandat</p>
              </div>

              {/* Scope Selection */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMandateScope('single_property')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    mandateScope === 'single_property'
                      ? 'border-[#F16522] bg-[#FFF5F0]'
                      : 'border-[#EFEBE9] hover:border-[#F16522]/50'
                  }`}
                >
                  <Home className="h-6 w-6 mx-auto mb-2 text-[#F16522]" />
                  <p className="font-semibold text-[#2C1810]">Bien unique</p>
                  <p className="text-xs text-[#6B5A4E] mt-1">Un bien spécifique</p>
                </button>
                <button
                  onClick={() => setMandateScope('all_properties')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    mandateScope === 'all_properties'
                      ? 'border-[#F16522] bg-[#FFF5F0]'
                      : 'border-[#EFEBE9] hover:border-[#F16522]/50'
                  }`}
                >
                  <FileText className="h-6 w-6 mx-auto mb-2 text-[#F16522]" />
                  <p className="font-semibold text-[#2C1810]">Tous les biens</p>
                  <p className="text-xs text-[#6B5A4E] mt-1">L'ensemble du portefeuille</p>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un bien..."
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                />
              </div>

              {/* Properties List */}
              {mandateScope === 'single_property' && (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-12 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
                      <Home className="h-12 w-12 text-[#6B5A4E] mx-auto mb-3" />
                      <p className="text-[#6B5A4E]">Aucun bien trouvé</p>
                    </div>
                  ) : (
                    filteredProperties.map((property) => (
                      <button
                        key={property.id}
                        onClick={() => setSelectedProperty(property.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:border-[#F16522]/50 ${
                          selectedProperty === property.id
                            ? 'border-[#F16522] bg-[#FFF5F0]'
                            : 'border-[#EFEBE9] bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#EFEBE9]">
                            {property.main_image ? (
                              <img
                                src={property.main_image}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="h-8 w-8 text-[#6B5A4E]" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[#2C1810] truncate">{property.title}</h4>
                            <p className="text-sm text-[#6B5A4E]">
                              {property.city} {property.neighborhood && `• ${property.neighborhood}`}
                            </p>
                            <p className="text-sm font-bold text-[#F16522] mt-1">
                              {property.monthly_rent.toLocaleString()} FCFA/mois
                            </p>
                          </div>
                          {selectedProperty === property.id && (
                            <CheckCircle className="h-6 w-6 text-[#F16522] flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {mandateScope === 'all_properties' && (
                <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-[#F16522]" />
                    <div>
                      <p className="font-semibold text-[#2C1810]">Tous vos biens</p>
                      <p className="text-sm text-[#6B5A4E]">
                        Ce mandat couvrira l'ensemble de vos {properties.length} bien(s)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Agency */}
          {currentStep === 'agency' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2C1810] mb-2">Sélectionnez une agence</h3>
                <p className="text-[#6B5A4E]">Choisissez l'agence à qui confier la gestion</p>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une agence..."
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                />
              </div>

              {/* Agencies List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAgencies.length === 0 ? (
                  <div className="text-center py-12 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
                    <Building2 className="h-12 w-12 text-[#6B5A4E] mx-auto mb-3" />
                    <p className="text-[#6B5A4E]">Aucune agence trouvée</p>
                  </div>
                ) : (
                  filteredAgencies.map((agency) => (
                    <button
                      key={agency.id}
                      onClick={() => setSelectedAgency(agency.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:border-[#F16522]/50 ${
                        selectedAgency === agency.id
                          ? 'border-[#F16522] bg-[#FFF5F0]'
                          : 'border-[#EFEBE9] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#EFEBE9]">
                          {agency.logo_url ? (
                            <img
                              src={agency.logo_url}
                              alt={agency.agency_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-[#6B5A4E]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#2C1810] truncate">{agency.agency_name}</h4>
                          <p className="text-sm text-[#6B5A4E]">
                            {agency.city && `${agency.city} • `}
                            Commission standard: {agency.commission_rate}%
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-[#6B5A4E]">
                            {agency.email && <span>{agency.email}</span>}
                            {agency.phone && <span>{agency.phone}</span>}
                          </div>
                        </div>
                        {selectedAgency === agency.id && (
                          <CheckCircle className="h-6 w-6 text-[#F16522] flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {currentStep === 'permissions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2C1810] mb-2">Configurez les permissions</h3>
                <p className="text-[#6B5A4E]">Définissez ce que l'agence peut faire</p>
              </div>

              {/* Permission Groups */}
              <div className="space-y-4">
                {/* Property Management */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <h4 className="font-semibold text-[#2C1810] mb-3 flex items-center gap-2">
                    <Home className="h-5 w-5 text-[#F16522]" />
                    Gestion des biens
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'can_view_properties', label: 'Voir les biens' },
                      { key: 'can_edit_properties', label: 'Modifier les biens' },
                      { key: 'can_create_properties', label: 'Créer des biens' },
                      { key: 'can_delete_properties', label: 'Supprimer les biens' },
                    ].map((perm) => (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(perm.key as keyof MandatePermissions)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          permissions[perm.key as keyof MandatePermissions]
                            ? 'border-[#F16522] bg-white'
                            : 'border-[#EFEBE9] bg-white hover:border-[#F16522]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {permissions[perm.key as keyof MandatePermissions] ? (
                            <CheckCircle className="h-5 w-5 text-[#F16522]" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-[#EFEBE9] rounded-md" />
                          )}
                          <span className="text-sm font-medium text-[#2C1810]">{perm.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Applications & Leases */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <h4 className="font-semibold text-[#2C1810] mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#F16522]" />
                    Candidats & Baux
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'can_view_applications', label: 'Voir les candidatures' },
                      { key: 'can_manage_applications', label: 'Gérer les candidatures' },
                      { key: 'can_create_leases', label: 'Créer des baux' },
                      { key: 'can_view_financials', label: 'Accès financier' },
                    ].map((perm) => (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(perm.key as keyof MandatePermissions)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          permissions[perm.key as keyof MandatePermissions]
                            ? 'border-[#F16522] bg-white'
                            : 'border-[#EFEBE9] bg-white hover:border-[#F16522]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {permissions[perm.key as keyof MandatePermissions] ? (
                            <CheckCircle className="h-5 w-5 text-[#F16522]" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-[#EFEBE9] rounded-md" />
                          )}
                          <span className="text-sm font-medium text-[#2C1810]">{perm.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other Permissions */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <h4 className="font-semibold text-[#2C1810] mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-[#F16522]" />
                    Autres permissions
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'can_manage_maintenance', label: 'Gérer la maintenance' },
                      { key: 'can_communicate_tenants', label: 'Communiquer avec locataires' },
                      { key: 'can_manage_documents', label: 'Gérer les documents' },
                    ].map((perm) => (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(perm.key as keyof MandatePermissions)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          permissions[perm.key as keyof MandatePermissions]
                            ? 'border-[#F16522] bg-white'
                            : 'border-[#EFEBE9] bg-white hover:border-[#F16522]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {permissions[perm.key as keyof MandatePermissions] ? (
                            <CheckCircle className="h-5 w-5 text-[#F16522]" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-[#EFEBE9] rounded-md" />
                          )}
                          <span className="text-sm font-medium text-[#2C1810]">{perm.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2C1810] mb-2">Confirmez les détails</h3>
                <p className="text-[#6B5A4E]">Vérifiez toutes les informations avant de créer le mandat</p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                {/* Scope */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-5 w-5 text-[#F16522]" />
                    <span className="text-sm text-[#6B5A4E]">Portée du mandat</span>
                  </div>
                  <p className="font-semibold text-[#2C1810]">
                    {mandateScope === 'all_properties' ? 'Tous les biens' : properties.find(p => p.id === selectedProperty)?.title || 'Bien sélectionné'}
                  </p>
                </div>

                {/* Agency */}
                {selectedAgency && (
                  <div className="bg-[#FAF7F4] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-[#F16522]" />
                      <span className="text-sm text-[#6B5A4E]">Agence sélectionnée</span>
                    </div>
                    <p className="font-semibold text-[#2C1810]">
                      {agencies.find(a => a.id === selectedAgency)?.agency_name}
                    </p>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAF7F4] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#6B5A4E]" />
                      <span className="text-sm text-[#6B5A4E]">Date de début</span>
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EFEBE9] rounded-lg text-sm"
                    />
                  </div>
                  <div className="bg-[#FAF7F4] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#6B5A4E]" />
                      <span className="text-sm text-[#6B5A4E]">Date de fin (optionnel)</span>
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full px-3 py-2 bg-white border border-[#EFEBE9] rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Commission */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Percent className="h-5 w-5 text-[#F16522]" />
                    <span className="text-sm text-[#6B5A4E]">Taux de commission</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.5"
                      className="flex-1 px-3 py-2 bg-white border border-[#EFEBE9] rounded-lg"
                    />
                    <span className="text-2xl font-bold text-[#F16522]">%</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-[#6B5A4E]" />
                    <span className="text-sm text-[#6B5A4E]">Notes (optionnel)</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ajoutez des notes ou conditions particulières..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-[#EFEBE9] rounded-lg text-sm"
                  />
                </div>

                {/* Permissions Summary */}
                <div className="bg-[#FAF7F4] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-[#F16522]" />
                    <span className="font-semibold text-[#2C1810]">Permissions accordées</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(permissions)
                      .filter(([_, value]) => value)
                      .map(([key, _]) => (
                        <span
                          key={key}
                          className="px-3 py-1 bg-[#F16522] text-white rounded-full text-xs font-medium"
                        >
                          {getPermissionLabel(key)}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#EFEBE9] rounded-b-[20px] px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (currentStep === 'property') {
                  handleClose();
                } else {
                  const prevStep = steps[currentStepIndex - 1];
                  setCurrentStep(prevStep.key as Step);
                }
              }}
              className="px-6 py-3 bg-[#FAF7F4] text-[#2C1810] rounded-xl font-semibold hover:bg-[#EFEBE9] transition-colors"
            >
              Retour
            </button>

            <button
              onClick={() => {
                if (currentStep === 'confirm') {
                  handleSubmit();
                } else {
                  const nextStep = steps[currentStepIndex + 1];
                  setCurrentStep(nextStep.key as Step);
                }
              }}
              disabled={
                (currentStep === 'property' && mandateScope === 'single_property' && !selectedProperty) ||
                (currentStep === 'agency' && !selectedAgency)
              }
              className="px-6 py-3 bg-[#F16522] text-white rounded-xl font-semibold hover:bg-[#d1571e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentStep === 'confirm' ? (
                loading ? (
                  'Création...'
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Créer le mandat
                  </>
                )
              ) : (
                <>
                  Continuer
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPermissionLabel(key: string): string {
  const labels: Record<string, string> = {
    can_view_properties: 'Voir',
    can_edit_properties: 'Modifier',
    can_create_properties: 'Créer',
    can_delete_properties: 'Supprimer',
    can_view_applications: 'Voir candidats',
    can_manage_applications: 'Gérer candidats',
    can_create_leases: 'Baux',
    can_view_financials: 'Finances',
    can_manage_maintenance: 'Maintenance',
    can_communicate_tenants: 'Locataires',
    can_manage_documents: 'Documents',
  };
  return labels[key] || key;
}
