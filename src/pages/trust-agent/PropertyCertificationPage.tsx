import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
  MapPin,
  CheckCircle2,
  XCircle,
  Upload,
  FileCheck,
  Zap,
  Droplets,
  Shield,
  Clock,
  Award,
  TrendingUp,
  AlertCircle,
  Building2,
  X,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { cn } from '@/shared/lib/utils';

// New Trust Agent UI Components
import {
  KPICard,
  EmptyState,
  FilterBar,
  TrustAgentPageHeader,
  ProgressStepper,
  ActionCard,
} from '@/shared/ui/trust-agent';

interface Property {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  neighborhood: string | null;
  property_type: string;
  main_image: string | null;
  ansut_verified?: boolean;
  ansut_verification_date?: string | null;
  owner_id: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  surface_area?: number | null;
  status?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  category: 'structure' | 'safety' | 'comfort' | 'documents';
}

const CHECKLIST_CATEGORIES = {
  structure: { label: 'Structure & Bâtiment', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  safety: { label: 'Sécurité', icon: Shield, color: 'bg-red-100 text-red-700' },
  comfort: { label: 'Confort & Équipements', icon: Zap, color: 'bg-amber-100 text-amber-700' },
  documents: { label: 'Documents', icon: FileCheck, color: 'bg-green-100 text-green-700' },
};

export default function PropertyCertificationPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]); // Store all properties
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [certifying, setCertifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasAnsutColumns, setHasAnsutColumns] = useState(false);
  const [activeView, setActiveView] = useState<'pending' | 'certified'>('pending');

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'electricity',
      label: 'Installation électrique conforme',
      description: 'Normes NF C 15-100, pas de câbles apparents, tableau aux normes',
      icon: Zap,
      checked: false,
      category: 'safety',
    },
    {
      id: 'plumbing',
      label: 'Plomberie en bon état',
      description: 'Pas de fuites, pression adequate, évacuation fonctionnelle',
      icon: Droplets,
      checked: false,
      category: 'comfort',
    },
    {
      id: 'security',
      label: 'Sécurité des accès vérifiée',
      description: 'Serrures fonctionnelles, issues de secours accessibles',
      icon: Shield,
      checked: false,
      category: 'safety',
    },
    {
      id: 'structure',
      label: 'Structure du bâtiment saine',
      description: 'Pas de fissures importantes, étanchéité toiture, menuiseries OK',
      icon: Building2,
      checked: false,
      category: 'structure',
    },
    {
      id: 'ventilation',
      label: 'Ventilation adéquate',
      description: 'VMC ou ventilation naturelle fonctionnelle',
      icon: Home,
      checked: false,
      category: 'comfort',
    },
    {
      id: 'heating',
      label: 'Chauffage fonctionnel',
      description: 'Système de chauffage opérationnel et aux normes',
      icon: Zap,
      checked: false,
      category: 'comfort',
    },
    {
      id: 'documents',
      label: 'Documents de propriété vérifiés',
      description: 'Titre de propriété, diagnostics immobiliers, assurance',
      icon: FileCheck,
      checked: false,
      category: 'documents',
    },
  ]);

  const [certificationData, setCertificationData] = useState({
    ansutCertificateUrl: '',
    notes: '',
    photoUrls: [] as string[],
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('has_ansut_columns');
      if (saved) setHasAnsutColumns(saved === 'true');
    }
  }, []);

  const loadProperties = useCallback(async () => {
    const fetchFallback = async () => {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('properties')
        .select(
          'id, title, address, city, neighborhood, property_type, main_image, bedrooms, bathrooms, surface_area, owner_id'
        )
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;

      const withDefaults = (fallbackData || []).map(
        (p: Omit<Property, 'ansut_verified' | 'ansut_verification_date'>) => ({
          ...p,
          ansut_verified: false,
          ansut_verification_date: null,
        })
      ) as Property[];

      setProperties(withDefaults);
    };

    try {
      if (!hasAnsutColumns) {
        const { error } = await supabase.from('properties').select('id, ansut_verified').limit(1);

        if (error) {
          await fetchFallback();
          return;
        } else {
          setHasAnsutColumns(true);
          if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'true');
        }
      }

      const { data, error } = await supabase
        .from('properties')
        .select(
          'id, title, address, city, neighborhood, property_type, main_image, ansut_verified, ansut_verification_date, owner_id, bedrooms, bathrooms, surface_area, status'
        )
        .order('created_at', { ascending: false }); // Load ALL properties

      console.log('📦 loadProperties - Query results:');
      console.log('  - Error:', error);
      console.log('  - Data count:', data?.length || 0);
      console.log('  - Certified count:', data?.filter((p) => p.ansut_verified).length || 0);
      console.log('  - Pending count:', data?.filter((p) => !p.ansut_verified).length || 0);
      if (data && data.length > 0) {
        console.log(
          '  - First 3 IDs:',
          data.slice(0, 3).map((p) => p.id)
        );
      }
      console.log('  - Setting allProperties state with', data?.length || 0, 'items');

      if (error) {
        const errorCode = (error as { code?: string }).code;
        if (errorCode === '42703' || errorCode === 'PGRST204' || errorCode === '22P02') {
          setHasAnsutColumns(false);
          if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'false');
          await fetchFallback();
          return;
        }
        throw error;
      }

      setHasAnsutColumns(true);
      if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'true');
      setAllProperties((data || []) as Property[]);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  }, [activeView, hasAnsutColumns]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]); // Reload when view changes // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProperties = useMemo(() => {
    return allProperties.filter((property) => {
      // Filter by view (pending or certified)
      if (activeView === 'pending' && property.ansut_verified) return false;
      if (activeView === 'certified' && !property.ansut_verified) return false;

      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const addressText = formatAddress(property.address, property.city).toLowerCase();
      return (
        property.title.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query) ||
        addressText.includes(query)
      );
    });
  }, [allProperties, activeView, searchQuery]);

  const stats = useMemo(() => {
    const total = allProperties.length;
    const certified = allProperties.filter((p) => p.ansut_verified).length;
    const pending = total - certified;
    const completionRate = total > 0 ? Math.round((certified / total) * 100) : 0;

    return { total, certified, pending, completionRate };
  }, [allProperties]);

  // Helper function for status badge
  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<
      string,
      {
        label: string;
        variant: 'default' | 'secondary' | 'outline' | 'destructive';
        className: string;
      }
    > = {
      disponible: {
        label: 'Disponible',
        variant: 'default',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      louee: {
        label: 'Louée',
        variant: 'secondary',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      en_attente: {
        label: 'En attente',
        variant: 'outline',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      reservee: {
        label: 'Réservée',
        variant: 'outline',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
      },
      indisponible: {
        label: 'Indisponible',
        variant: 'secondary',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      },
      maintenance: {
        label: 'En maintenance',
        variant: 'destructive',
        className: 'bg-red-100 text-red-700 border-red-200',
      },
    };

    const config = statusConfig[status.toLowerCase()] || {
      label: status,
      variant: 'outline',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleChecklistToggle = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const allChecksPassed = checklist.every((item) => item.checked);
  const completedChecks = checklist.filter((c) => c.checked).length;
  const progressPercentage = Math.round((completedChecks / checklist.length) * 100);

  // DEBUG: Log render state
  console.log('🎨 RENDER - selectedProperty:', selectedProperty?.title || 'NONE');
  console.log('🎨 RENDER - certifying:', certifying);
  console.log('🎨 RENDER - properties count:', properties.length);

  const handleCertify = async () => {
    console.log('=== handleCertify START ===');
    console.log('selectedProperty ID:', selectedProperty?.id);
    console.log('selectedProperty title:', selectedProperty?.title);
    console.log('user:', user?.email);
    console.log('allChecksPassed:', allChecksPassed);
    console.log('hasAnsutColumns:', hasAnsutColumns);

    if (!selectedProperty) {
      console.log('❌ No selected property');
      toast.error('Sélectionnez une propriété à certifier.');
      return;
    }
    if (!user) {
      console.log('❌ No user');
      toast.error('Session expirée, veuillez vous reconnecter.');
      return;
    }
    if (!allChecksPassed) {
      console.log('❌ Not all checks passed');
      toast.error('Cochez tous les points de conformité avant de certifier.');
      return;
    }

    console.log('✅ All validation checks passed, starting certification...');

    // Store IDs BEFORE any state changes (avoid closure issues)
    const propertyId = selectedProperty.id;
    const propertyTitle = selectedProperty.title;

    setCertifying(true);

    try {
      console.log('Calling RPC function certify_property_ansut for:', propertyId);

      // Use RPC function instead of direct update (bypasses RLS issues)
      // @ts-expect-error - RPC function may not be typed
      const { data: rpcResult, error: rpcError } = await supabase.rpc('certify_property_ansut', {
        p_property_id: propertyId,
        p_ansut_verified: true,
        p_ansut_verification_date: new Date().toISOString(),
        p_ansut_certificate_url: certificationData.ansutCertificateUrl || null,
      });

      if (rpcError) {
        console.log('❌ RPC error:', rpcError);
        throw rpcError;
      }

      console.log('✅ RPC function result:', rpcResult);

      // Verify the update was persisted
      const { data: verifyData } = await supabase
        .from('properties')
        .select('id, ansut_verified, ansut_verification_date')
        .eq('id', propertyId)
        .single();

      console.log('🔍 Verification - Property in DB now has:');
      console.log('  - ansut_verified:', verifyData?.ansut_verified);
      console.log('  - ansut_verification_date:', verifyData?.ansut_verification_date);

      if (!verifyData?.ansut_verified) {
        throw new Error('Database update did not persist');
      }

      console.log('✅ Property certification successfully persisted in database');
      console.log('🔄 Now clearing selectedProperty state...');

      // CRITICAL: Clear selection FIRST, before any async operations
      // This ensures the UI updates immediately
      setSelectedProperty(null);
      console.log('✅ setSelectedProperty(null) called');

      resetForm();
      console.log('✅ resetForm() called');

      // Show success immediately
      toast.success(`✅ ${propertyTitle} certifiée ANSUT avec succès!`, {
        duration: 5000,
      });

      // Switch to certified view to show the newly certified property
      setActiveView('certified');

      // Finally, reload the property list
      console.log('🔄 Reloading properties list...');
      await loadProperties();
      console.log('✅ Properties list reloaded');
    } catch (error) {
      console.error('❌ Certification error:', error);
      toast.error('Erreur lors de la certification');
    } finally {
      setCertifying(false);
      console.log('=== handleCertify END ===');
      console.log('Final selectedProperty state:', selectedProperty);
    }
  };

  const resetForm = () => {
    setChecklist((prev) => prev.map((item) => ({ ...item, checked: false })));
    setCertificationData({ ansutCertificateUrl: '', notes: '', photoUrls: [] });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
  };

  // Progress steps for the certification workflow
  const progressSteps = [
    {
      id: 'select',
      label: 'Sélection',
      description: 'Choisir une propriété',
      status: (selectedProperty ? 'completed' : 'pending') as
        | 'pending'
        | 'in_progress'
        | 'completed',
    },
    {
      id: 'verify',
      label: 'Vérification',
      description: `${completedChecks}/${checklist.length} points`,
      status: (completedChecks === 0
        ? 'pending'
        : completedChecks === checklist.length
          ? 'completed'
          : 'in_progress') as 'pending' | 'in_progress' | 'completed',
    },
    {
      id: 'certify',
      label: 'Certification',
      description: 'Valider et signer',
      status: (allChecksPassed && selectedProperty ? 'in_progress' : 'pending') as
        | 'pending'
        | 'in_progress'
        | 'completed',
    },
  ];

  // Group checklist items by category
  const checklistByCategory = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {};
    checklist.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category]!.push(item);
    });
    return grouped;
  }, [checklist]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title={
          activeView === 'pending'
            ? 'Certification ANSUT - En attente'
            : 'Certification ANSUT - Certifiées'
        }
        subtitle={
          activeView === 'pending'
            ? 'Propriétés en attente de certification ANSUT'
            : 'Propriétés certifiées conformes aux normes ANSUT'
        }
        badges={[
          {
            label: `${stats.pending} en attente`,
            variant: activeView === 'pending' ? 'warning' : 'secondary',
          },
          {
            label: `${stats.certified} certifiées`,
            variant: activeView === 'certified' ? 'success' : 'secondary',
          },
          { label: `${stats.completionRate}% complétion`, variant: 'default' },
        ]}
        showBackButton
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="À certifier" value={stats.pending} icon={<Clock />} variant="warning" />
          <KPICard title="Certifiées" value={stats.certified} icon={<Award />} variant="success" />
          <KPICard title="Total" value={stats.total} icon={<Building2 />} variant="default" />
          <KPICard
            title="Taux de complétion"
            value={`${stats.completionRate}%`}
            icon={<TrendingUp />}
            variant="info"
          />
        </div>

        {/* View Toggle - Pending vs Certified */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-2 inline-flex">
          <button
            onClick={() => setActiveView('pending')}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeView === 'pending'
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Clock className="h-4 w-4 mr-2" />
            En attente ({stats.pending})
          </button>
          <button
            onClick={() => setActiveView('certified')}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all',
              activeView === 'certified'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Award className="h-4 w-4 mr-2" />
            Certifiées ({stats.certified})
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Properties List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Filter Bar */}
            <FilterBar
              searchPlaceholder="Rechercher une propriété..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              activeFiltersCount={searchQuery ? 1 : 0}
              onClearFilters={handleClearFilters}
            />

            {/* Properties List Card */}
            <Card className="bg-white border-gray-200">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeView === 'pending' ? (
                      <Clock className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Award className="h-5 w-5 text-green-600" />
                    )}
                    <h3 className="font-semibold text-gray-900">
                      {activeView === 'pending' ? 'À certifier' : 'Certifiées'}
                    </h3>
                  </div>
                  <Badge variant={activeView === 'pending' ? 'secondary' : 'success'}>
                    {filteredProperties.length}
                  </Badge>
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={activeView === 'pending' ? <Clock /> : <Award />}
                      title={
                        searchQuery
                          ? 'Aucune propriété trouvée'
                          : activeView === 'pending'
                            ? 'Aucune propriété en attente'
                            : 'Aucune propriété certifiée'
                      }
                      description={
                        searchQuery
                          ? "Essayez d'ajuster votre recherche"
                          : activeView === 'pending'
                            ? 'Toutes les propriétés sont certifiées'
                            : "Aucune propriété n'a encore été certifiée"
                      }
                      variant="default"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredProperties.map((property) => (
                      <div
                        key={property.id}
                        className={cn(
                          'p-4 cursor-pointer transition-all hover:bg-gray-50',
                          selectedProperty?.id === property.id
                            ? 'bg-blue-50 border-l-4 border-l-primary-500'
                            : ''
                        )}
                        onClick={() => {
                          setSelectedProperty(property);
                          resetForm();
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                            {property.main_image ? (
                              <img
                                src={property.main_image}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate text-sm">
                                  {property.title}
                                </h4>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {property.city}
                                </p>
                              </div>
                              {selectedProperty?.id === property.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProperty(null);
                                  }}
                                  className="p-1 rounded-full hover:bg-gray-200"
                                >
                                  <X className="h-4 w-4 text-gray-500" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {property.ansut_verified && (
                                <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Certifié
                                </Badge>
                              )}
                              {getStatusBadge(property.status)}
                              <Badge variant="outline" className="text-xs">
                                {property.property_type}
                              </Badge>
                              {property.bedrooms && (
                                <span className="text-xs text-gray-500">
                                  {property.bedrooms} ch.
                                </span>
                              )}
                              {property.ansut_verification_date && (
                                <span className="text-xs text-gray-400">
                                  {new Date(property.ansut_verification_date).toLocaleDateString(
                                    'fr-FR'
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Actions Rapides</h3>
              {activeView === 'pending' ? (
                <ActionCard
                  title="Voir les certifiées"
                  description="Consulter les propriétés déjà certifiées"
                  icon={<Award />}
                  variant="success"
                  actionLabel="Voir"
                  onAction={() => setActiveView('certified')}
                />
              ) : (
                <ActionCard
                  title="Voir en attente"
                  description="Retourner aux propriétés à certifier"
                  icon={<Clock />}
                  variant="warning"
                  actionLabel="Voir"
                  onAction={() => setActiveView('pending')}
                />
              )}
            </div>
          </div>

          {/* Certification Form */}
          <div className="lg:col-span-2">
            {!selectedProperty ? (
              // Empty state - no property selected
              <Card className="bg-white border-gray-200">
                <div className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <Building2 className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sélectionnez une propriété
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Choisissez une propriété dans la liste pour{' '}
                    {activeView === 'certified'
                      ? 'voir les détails de certification'
                      : 'commencer le processus de certification ANSUT'}
                  </p>
                  <EmptyState
                    icon={activeView === 'certified' ? <Award /> : <FileCheck />}
                    title={
                      activeView === 'certified' ? 'Propriétés certifiées' : 'Prêt à certifier'
                    }
                    description={
                      activeView === 'certified'
                        ? `${stats.certified} propriété(s) certifiée(s)`
                        : `${stats.pending} propriété(s) en attente de certification`
                    }
                    variant={activeView === 'certified' ? 'success' : 'default'}
                  />
                </div>
              </Card>
            ) : selectedProperty.ansut_verified ? (
              // Certified Property Details (Read-only)
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shadow-sm">
                        {selectedProperty.main_image ? (
                          <img
                            src={selectedProperty.main_image}
                            alt={selectedProperty.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900">
                            {selectedProperty.title}
                          </h3>
                          <Badge className="bg-green-600 text-white border-0 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Certifiée ANSUT
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="h-4 w-4" />
                          {formatAddress(selectedProperty.address, selectedProperty.city)}
                        </p>
                        {selectedProperty.ansut_verification_date && (
                          <p className="text-xs text-green-600 mt-1">
                            Certifiée le{' '}
                            {new Date(selectedProperty.ansut_verification_date).toLocaleDateString(
                              'fr-FR'
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProperty(null)}
                      className="w-full mt-4"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              // Default: Certification form for pending properties
              <div className="space-y-6">
                {/* Progress Stepper */}
                <Card className="bg-white border-gray-200">
                  <div className="p-6">
                    <ProgressStepper steps={progressSteps} orientation="horizontal" size="md" />
                  </div>
                </Card>

                {/* Property Details Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shadow-sm">
                          {selectedProperty.main_image ? (
                            <img
                              src={selectedProperty.main_image}
                              alt={selectedProperty.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {selectedProperty.title}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4" />
                            {formatAddress(selectedProperty.address, selectedProperty.city)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(selectedProperty.status)}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 border-0 gap-1">
                        <Clock className="h-3 w-3" />
                        En attente
                      </Badge>
                    </div>

                    {/* Property Details Grid */}
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="font-semibold text-gray-900 text-sm mt-1">
                          {selectedProperty.property_type}
                        </p>
                      </div>
                      {selectedProperty.status && (
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Statut</p>
                          <p className="font-semibold text-gray-900 text-sm mt-1 capitalize">
                            {selectedProperty.status}
                          </p>
                        </div>
                      )}
                      {selectedProperty.bedrooms && (
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Chambres</p>
                          <p className="font-semibold text-gray-900 text-sm mt-1">
                            {selectedProperty.bedrooms}
                          </p>
                        </div>
                      )}
                      {selectedProperty.surface_area && (
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Surface</p>
                          <p className="font-semibold text-gray-900 text-sm mt-1">
                            {selectedProperty.surface_area} m²
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Checklist by Category */}
                <Card className="bg-white border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-blue-600" />
                          Checklist de conformité
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Validez tous les critères avant de certifier
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          'text-sm px-3 py-1',
                          allChecksPassed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {completedChecks}/{checklist.length} vérifiés
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6 p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progression</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {progressPercentage}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            progressPercentage === 100
                              ? 'bg-green-500'
                              : progressPercentage >= 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                          )}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Checklist by Category */}
                    <div className="space-y-6">
                      {Object.entries(checklistByCategory).map(([category, items]) => {
                        const categoryConfig =
                          CHECKLIST_CATEGORIES[category as keyof typeof CHECKLIST_CATEGORIES];
                        const CategoryIcon = categoryConfig.icon;
                        // const allChecked = items.every((i) => i.checked); // unused

                        return (
                          <div key={category}>
                            <div
                              className={cn(
                                'flex items-center gap-2 mb-3 p-2 rounded-lg',
                                categoryConfig.color.split(' ')[0]
                              )}
                            >
                              <CategoryIcon className="h-4 w-4" />
                              <h4 className="font-semibold text-sm">{categoryConfig.label}</h4>
                              <Badge variant="outline" className="ml-auto">
                                {items.filter((i) => i.checked).length}/{items.length}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {items.map((item) => {
                                const ItemIcon = item.icon;

                                return (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      'p-4 rounded-xl border-2 cursor-pointer transition-all',
                                      item.checked
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                                    )}
                                    onClick={() => handleChecklistToggle(item.id)}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={cn(
                                          'p-2 rounded-lg',
                                          item.checked ? 'bg-green-100' : 'bg-gray-100'
                                        )}
                                      >
                                        <ItemIcon
                                          className={cn(
                                            'h-5 w-5',
                                            item.checked ? 'text-green-600' : 'text-gray-500'
                                          )}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <p
                                            className={cn(
                                              'font-medium text-sm',
                                              item.checked ? 'text-green-900' : 'text-gray-900'
                                            )}
                                          >
                                            {item.label}
                                          </p>
                                          {item.checked ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                          ) : (
                                            <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {item.description}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Additional Information */}
                <Card className="bg-white border-gray-200">
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      Informations Complémentaires
                    </h3>

                    <div className="space-y-4">
                      {/* Certificate URL */}
                      <div className="space-y-2">
                        <Label>URL du certificat ANSUT (optionnel)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://exemple.com/certificat..."
                            value={certificationData.ansutCertificateUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCertificationData((prev) => ({
                                ...prev,
                                ansutCertificateUrl: e.target.value,
                              }))
                            }
                            className="flex-1"
                          />
                          <Button variant="outline" size="small" className="px-3">
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label>Notes et observations</Label>
                        <Textarea
                          placeholder="Observations sur l'état du bien, remarques particulières, points à surveiller..."
                          value={certificationData.notes}
                          onChange={(e) =>
                            setCertificationData((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Certification Actions */}
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProperty(null);
                      resetForm();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    className={cn(
                      'flex-[2] font-semibold',
                      allChecksPassed
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    )}
                    onClick={handleCertify}
                    disabled={certifying || !allChecksPassed}
                  >
                    {certifying ? (
                      <>Certification en cours...</>
                    ) : !allChecksPassed ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {checklist.filter((c) => !c.checked).length} vérification(s) requise(s)
                      </>
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2" />
                        Certifier cette propriété
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
