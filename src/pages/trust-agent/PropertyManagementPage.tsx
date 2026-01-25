import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  CheckCircle2,
  Clock,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  TrendingUp,
  X,
  SlidersHorizontal,
  Search,
  FileCheck,
  Eye,
} from 'lucide-react';
// Import de Search vérifié
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/utils';
import { trustAgentApi } from '@/features/trust-agent/services/trustAgent.api';
import { toast } from 'sonner';
import { formatAddress } from '@/shared/utils/address';
import { KPICard } from '@/shared/ui/trust-agent/KPICard';
import { FilterGroup } from '@/shared/ui/trust-agent/FilterBar';
import { EmptyState } from '@/shared/ui/trust-agent/EmptyState';
import { TrustAgentPageHeader } from '@/shared/ui/trust-agent/TrustAgentPageHeader';

interface Property {
  id: string;
  title: string;
  address: Record<string, unknown>;
  city: string;
  neighborhood: string | null;
  property_type: string;
  main_image: string | null;
  ansut_verified: boolean | null;
  ansut_verification_date: string | null;
  is_verified: boolean;
  status?: string;
  verification_priority?: 'high' | 'medium' | 'low' | 'urgent';
  days_since_creation?: number;
  created_at: string;
}

type ViewType = 'all' | 'pending' | 'certified';
type SortType = 'date-desc' | 'date-asc' | 'name-asc' | 'priority';

export default function PropertyManagementPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');

  // Advanced filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await trustAgentApi.getAllProperties();
      setProperties(data as Property[]);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = properties.length;
    const certified = properties.filter((p) => p.ansut_verified).length;
    const pending = properties.filter((p) => !p.ansut_verified).length;
    const urgent = properties.filter(
      (p) => !p.ansut_verified && p.verification_priority === 'urgent'
    ).length;
    const completionRate = total > 0 ? Math.round((certified / total) * 100) : 0;

    return { total, certified, pending, urgent, completionRate };
  }, [properties]);

  // Extract unique values for filters
  const filterValues = useMemo(() => {
    const types = [...new Set(properties.map((p) => p.property_type))].filter(Boolean).sort();
    const priorities = ['urgent', 'high', 'medium', 'low'];
    const statuses = [...new Set(properties.map((p) => p.status))]
      .filter((s): s is string => !!s)
      .sort();
    return { types, priorities, statuses };
  }, [properties]);

  // Count active filters
  const activeFiltersCount =
    selectedTypes.length +
    selectedPriorities.length +
    selectedStatuses.length +
    (activeView !== 'all' ? 1 : 0);

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedPriorities([]);
    setSelectedStatuses([]);
    setActiveView('all');
    setSearchQuery('');
  };

  // Filter groups for FilterBar
  const filterGroups: FilterGroup[] = [
    {
      id: 'types',
      label: 'Type de propriété',
      type: 'checkbox',
      options: filterValues.types.map((type) => ({
        value: type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        count: properties.filter((p) => p.property_type === type).length,
      })),
      selected: selectedTypes,
      onChange: setSelectedTypes,
    },
    {
      id: 'priorities',
      label: 'Priorité',
      type: 'checkbox',
      options: filterValues.priorities.map((priority) => ({
        value: priority,
        label:
          priority === 'urgent'
            ? 'Urgent'
            : priority === 'high'
              ? 'Haute'
              : priority === 'medium'
                ? 'Normale'
                : 'Basse',
        count: properties.filter((p) => p.verification_priority === priority).length,
      })),
      selected: selectedPriorities,
      onChange: setSelectedPriorities,
    },
    {
      id: 'statuses',
      label: 'Statut',
      type: 'checkbox',
      options: filterValues.statuses.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
        count: properties.filter((p) => p.status === status).length,
      })),
      selected: selectedStatuses,
      onChange: setSelectedStatuses,
    },
  ];

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    // Filter by view
    if (activeView === 'pending') {
      result = result.filter((p) => !p.ansut_verified);
    } else if (activeView === 'certified') {
      result = result.filter((p) => p.ansut_verified);
    }

    // Filter by property types
    if (selectedTypes.length > 0) {
      result = result.filter((p) => selectedTypes.includes(p.property_type));
    }

    // Filter by priorities
    if (selectedPriorities.length > 0) {
      result = result.filter((p) => selectedPriorities.includes(p.verification_priority || 'low'));
    }

    // Filter by statuses
    if (selectedStatuses.length > 0) {
      result = result.filter((p) => selectedStatuses.includes(p.status ?? ''));
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((property) => {
        const addressText = formatAddress(property.address, property.city).toLowerCase();
        return (
          property.title.toLowerCase().includes(query) ||
          property.city.toLowerCase().includes(query) ||
          addressText.includes(query)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'date-asc': {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        case 'name-asc': {
          return a.title.localeCompare(b.title);
        }
        case 'priority': {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          const aPriority = priorityOrder[a.verification_priority || 'low'] ?? 3;
          const bPriority = priorityOrder[b.verification_priority || 'low'] ?? 3;
          return aPriority - bPriority;
        }
        default: {
          return 0;
        }
      }
    });

    return result;
  }, [
    properties,
    activeView,
    selectedTypes,
    selectedPriorities,
    selectedStatuses,
    searchQuery,
    sortBy,
  ]);

  const getPriorityBadge = (property: Property) => {
    if (property.ansut_verified) return null;

    const priority = property.verification_priority;
    switch (priority) {
      case 'urgent':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Urgent
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Priorité haute
          </Badge>
        );
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Normal</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (property: Property) => {
    if (property.ansut_verified) {
      return (
        <Badge className="bg-green-600 text-white border-0 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Certifiée ANSUT
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <Clock className="h-3 w-3" />
        En attente
      </Badge>
    );
  };

  // Helper pour le badge de statut de disponibilité
  const getAvailabilityBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<string, { label: string; className: string }> = {
      disponible: {
        label: 'Disponible',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      louee: { label: 'Louée', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      en_attente: {
        label: 'En attente',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      reservee: { label: 'Réservée', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      indisponible: {
        label: 'Indisponible',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      },
      maintenance: { label: 'En maintenance', className: 'bg-red-100 text-red-700 border-red-200' },
    };

    const config = statusConfig[status.toLowerCase()] || {
      label: status,
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBorderClass = (property: Property): string => {
    if (property.ansut_verified) return 'border-green-200';
    switch (property.verification_priority) {
      case 'urgent':
        return 'border-red-300 bg-red-50/30';
      case 'high':
        return 'border-orange-300 bg-orange-50/30';
      default:
        return 'border-gray-200 hover:border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TrustAgentPageHeader
        title="Gestion des Propriétés"
        badges={[
          { label: `${stats.total} total`, variant: 'default' },
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
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Propriétés"
              value={stats.total}
              icon={<Building2 className="h-6 w-6" />}
              variant="info"
              trend={{ value: stats.completionRate, label: 'taux de complétion' }}
            />
            <KPICard
              title="En attente"
              value={stats.pending}
              icon={<Clock className="h-6 w-6" />}
              variant="warning"
            />
            <KPICard
              title="Certifiées ANSUT"
              value={stats.certified}
              icon={<ShieldCheck className="h-6 w-6" />}
              variant="success"
              trend={{ value: stats.completionRate, label: 'du total' }}
            />
            <KPICard
              title="Priorité Haute/Urgente"
              value={stats.urgent}
              icon={<AlertTriangle className="h-6 w-6" />}
              variant="danger"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === 'all' ? 'primary' : 'outline'}
              onClick={() => setActiveView('all')}
              className={activeView === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Toutes ({stats.total})
            </Button>
            <Button
              variant={activeView === 'pending' ? 'primary' : 'outline'}
              onClick={() => setActiveView('pending')}
              className={activeView === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              En attente ({stats.pending})
            </Button>
            <Button
              variant={activeView === 'certified' ? 'primary' : 'outline'}
              onClick={() => setActiveView('certified')}
              className={activeView === 'certified' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Certifiées ({stats.certified})
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-blue-50 border-blue-200')}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtres avancés
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white">{activeFiltersCount}</Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card className="bg-blue-50/50 border-blue-200">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filtres avancés
                  </h3>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="small" onClick={clearAllFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Effacer tout ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                {/* Filter Groups */}
                {filterGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">{group.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const isSelected = group.selected.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newSelection = isSelected
                                ? group.selected.filter((v) => v !== option.value)
                                : [...group.selected, option.value];
                              group.onChange(newSelection);
                            }}
                            className={cn(
                              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                            )}
                          >
                            <span>{option.label}</span>
                            <span
                              className={cn(
                                'text-xs px-1.5 py-0.5 rounded-full',
                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                              )}
                            >
                              {option.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Sort */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Trier par</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'date-desc' as SortType, label: 'Plus récent' },
                      { value: 'date-asc' as SortType, label: 'Plus ancien' },
                      { value: 'name-asc' as SortType, label: 'Nom A-Z' },
                      { value: 'priority' as SortType, label: 'Priorité' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                          sortBy === option.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Search */}
          <Card>
            <div className="p-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, ville, adresse..."
                  className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Properties List */}
          <Card>
            {loading ? (
              <div className="p-8">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-8">
                {activeFiltersCount > 0 || searchQuery ? (
                  <EmptyState
                    icon={<SlidersHorizontal />}
                    title="Aucun résultat"
                    description="Aucune propriété ne correspond aux filtres appliqués"
                    onAction={clearAllFilters}
                    actionLabel="Effacer les filtres"
                    variant="default"
                  />
                ) : activeView === 'certified' ? (
                  <EmptyState
                    icon={<ShieldCheck />}
                    title="Aucune propriété certifiée"
                    description={`Commencez par certifier les ${stats.pending} propriétés en attente`}
                    variant="default"
                  />
                ) : (
                  <EmptyState
                    icon={<Building2 />}
                    title="Aucune propriété trouvée"
                    variant="default"
                  />
                )}
              </div>
            ) : (
              <>
                {/* Results count */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {filteredProperties.length} propriété{filteredProperties.length > 1 ? 's' : ''}{' '}
                    trouvée
                    {filteredProperties.length > 1 ? 's' : ''}
                  </p>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Effacer les filtres
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="divide-y divide-gray-100">
                  {filteredProperties.map((property) => (
                    <div
                      key={property.id}
                      className={cn('p-4 transition-all', getPriorityBorderClass(property))}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Image */}
                        <div
                          className="w-full lg:w-28 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            navigate(
                              `/trust-agent/certifications/properties?property=${property.id}`
                            )
                          }
                        >
                          {property.main_image ? (
                            <img
                              src={property.main_image}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-10 w-10 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            className="flex flex-col xl:flex-row xl:items-start justify-between gap-3 cursor-pointer"
                            onClick={() =>
                              navigate(
                                `/trust-agent/certifications/properties?property=${property.id}`
                              )
                            }
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base">{property.title}</h3>
                                {getStatusBadge(property)}
                                {getAvailabilityBadge(property.status)}
                                {getPriorityBadge(property)}
                              </div>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <MapPin className="h-4 w-4" />
                                {formatAddress(property.address, property.city)}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {property.property_type}
                                </Badge>
                                {property.neighborhood && (
                                  <Badge variant="secondary" className="text-xs">
                                    {property.neighborhood}
                                  </Badge>
                                )}
                                <Badge
                                  variant={property.is_verified ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {property.is_verified ? 'Vérifiée' : 'Non vérifiée'}
                                </Badge>
                              </div>
                            </div>

                            {/* Info & Dates */}
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(property.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              {property.ansut_verification_date && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>
                                    Certifiée le{' '}
                                    {new Date(property.ansut_verification_date).toLocaleDateString(
                                      'fr-FR'
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex lg:flex-col gap-2 lg:w-32">
                          <Button
                            variant="outline"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/trust-agent/certifications/properties?property=${property.id}`
                              );
                            }}
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Détails
                          </Button>
                          {!property.ansut_verified && (
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/trust-agent/certifications/properties?property=${property.id}&start=true`
                                );
                              }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              <FileCheck className="h-4 w-4 mr-1" />
                              Certifier
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveView('pending')}
                  className="bg-white"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Voir les {stats.pending} en attente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveView('certified')}
                  className="bg-white"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Voir les {stats.certified} certifiées
                </Button>
                <Button variant="outline" onClick={loadProperties} className="bg-white">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
                <Button
                  onClick={() => navigate('/trust-agent')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
