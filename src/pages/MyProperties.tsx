import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { logger } from '@/services/logger';
import { toast } from 'sonner';
import type { Property as PropertyType } from '@/types';
import PropertyStatusTabs from '@/components/properties/PropertyStatusTabs';
import ViewToggle from '@/components/properties/ViewToggle';
import PropertySearchBar from '@/components/properties/PropertySearchBar';
import BulkActionsBar from '@/components/properties/BulkActionsBar';
import PropertyCardEnhanced from '@/components/properties/PropertyCardEnhanced';
import { PropertyTableView } from '@/components/properties/PropertyTableView';
import { PropertyCardSkeleton } from '@/components/properties/PropertyCardSkeleton';
import { StickyHeader } from '@/components/ui/sticky-header';

type Property = Pick<PropertyType, 
  'id' | 'title' | 'description' | 'property_type' | 'status' | 
  'address' | 'city' | 'bedrooms' | 'bathrooms' | 'surface_area' | 
  'monthly_rent' | 'main_image' | 'view_count' | 'created_at'
> & {
  moderation_status?: string;
  moderation_notes?: string;
  favorites_count?: number;
  applications_count?: number;
  conversion_rate?: number;
};

const MyProperties = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');
  const [view, setView] = useState<'grid' | 'list' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data: propertiesData, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional metrics for each property
      const propertiesWithMetrics = await Promise.all(
        (propertiesData || []).map(async (property) => {
          // Fetch favorites count
          const { count: favoritesCount } = await supabase
            .from('user_favorites')
            .select('*', { count: 'exact', head: true })
            .eq('property_id', property.id);

          // Fetch applications count
          const { count: applicationsCount } = await supabase
            .from('rental_applications')
            .select('*', { count: 'exact', head: true })
            .eq('property_id', property.id);

          // Calculate conversion rate
          const conversionRate = property.view_count > 0
            ? Math.round(((applicationsCount || 0) / property.view_count) * 100)
            : 0;

          return {
            ...property,
            favorites_count: favoritesCount || 0,
            applications_count: applicationsCount || 0,
            conversion_rate: conversionRate,
          };
        })
      );

      setProperties(propertiesWithMetrics);
    } catch (error) {
      logger.error('Failed to fetch user properties', { error, userId: user?.id });
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties;

    // Filter by status
    if (activeStatus !== 'all') {
      if (activeStatus === 'pending' || activeStatus === 'rejected') {
        filtered = filtered.filter(p => p.moderation_status === activeStatus);
      } else {
        filtered = filtered.filter(p => p.status === activeStatus);
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_desc':
          return b.monthly_rent - a.monthly_rent;
        case 'price_asc':
          return a.monthly_rent - b.monthly_rent;
        case 'views_desc':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'views_asc':
          return (a.view_count || 0) - (b.view_count || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [properties, activeStatus, searchQuery, sortBy]);

  // Calculate status counts
  const statusCounts = useMemo(() => ({
    all: properties.length,
    disponible: properties.filter(p => p.status === 'disponible').length,
    loué: properties.filter(p => p.status === 'loué').length,
    en_maintenance: properties.filter(p => p.status === 'en_maintenance').length,
    en_negociation: properties.filter(p => p.status === 'en_negociation').length,
    pending: properties.filter(p => p.moderation_status === 'pending').length,
    rejected: properties.filter(p => p.moderation_status === 'rejected').length,
  }), [properties]);

  // Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedProperties([]);
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .in('id', selectedProperties);

      if (error) throw error;

      toast.success(`${selectedProperties.length} bien(s) supprimé(s)`);
      setSelectedProperties([]);
      fetchProperties();
    } catch (error) {
      logger.error('Failed to delete properties', { error });
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status })
        .in('id', selectedProperties);

      if (error) throw error;

      toast.success(`Statut mis à jour pour ${selectedProperties.length} bien(s)`);
      setSelectedProperties([]);
      fetchProperties();
    } catch (error) {
      logger.error('Failed to update status', { error });
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Bien supprimé');
      fetchProperties();
    } catch (error) {
      logger.error('Failed to delete property', { error });
      toast.error('Erreur lors de la suppression');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (profile && profile.user_type === 'locataire')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto space-y-8">
          <DynamicBreadcrumb />
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">Mes Biens Immobiliers</h1>
              <p className="text-muted-foreground mt-2">
                {properties.length} {properties.length > 1 ? 'biens' : 'bien'} au total
              </p>
            </div>
            <Button asChild>
              <Link to="/ajouter-bien">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un bien
              </Link>
            </Button>
          </div>

          {/* Status Tabs */}
          <PropertyStatusTabs
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
            counts={statusCounts}
          />

          {/* Search and View Controls */}
          <StickyHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center w-full">
              <PropertySearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <ViewToggle 
                view={view} 
                onViewChange={setView}
                options={['grid', 'list', 'table']}
              />
            </div>
          </StickyHeader>

          {/* Properties Display */}
          {filteredAndSortedProperties.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {properties.length === 0 
                    ? "Vous n'avez pas encore ajouté de biens"
                    : "Aucun bien ne correspond à vos critères"
                  }
                </p>
                {properties.length === 0 && (
                  <Button asChild>
                    <Link to="/ajouter-bien">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter mon premier bien
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          ) : view === 'table' ? (
            <PropertyTableView
              properties={filteredAndSortedProperties}
              selectedProperties={selectedProperties}
              onToggleSelect={handleToggleSelect}
              onEdit={(id) => navigate(`/modifier-bien/${id}`)}
              onDelete={handleDelete}
            />
          ) : (
            <div className={
              view === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredAndSortedProperties.map((property) => (
                <PropertyCardEnhanced
                  key={property.id}
                  property={property}
                  view={view}
                  isSelected={selectedProperties.includes(property.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          )}

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            selectedCount={selectedProperties.length}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyProperties;
