/**
 * Page d'annuaire des agences immobilières certifiées ANSUT
 * Permet aux propriétaires de trouver et inviter des agences
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  Search,
  Filter,
  Award,
  CheckCircle,
  Globe,
  Users,
  Home,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Agency {
  id: string;
  user_id: string;
  agency_name: string;
  registration_number: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  commission_rate: number;
  is_verified: boolean;
  is_ansut_certified: boolean;
  ansut_certification_number: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  created_at: string;
  // Stats
  properties_managed?: number;
  active_mandates?: number;
  rating?: number;
  reviews_count?: number;
}

type CityFilter = 'all' | 'abidjan' | 'yamoussoukro' | 'bouake' | 'korhogo' | 'san-pedro' | 'other';
type SortOption = 'name' | 'rating' | 'properties' | 'certification';

const CITIES: Record<CityFilter, string> = {
  all: 'Toutes les villes',
  abidjan: 'Abidjan',
  yamoussoukro: 'Yamoussoukro',
  bouake: 'Bouaké',
  korhogo: 'Korhogo',
  'san-pedro': 'San Pedro',
  other: 'Autres',
};

export default function AgenciesDirectoryPage() {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<CityFilter>('all');
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('certification');

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('status', 'active')
        .order('agency_name');

      if (error) throw error;

      // Fetch stats for each agency
      const agenciesWithStats = await Promise.all(
        (data || []).map(async (agency: any) => {
          // Count active mandates
          const { count: mandatesCount } = await supabase
            .from('agency_mandates')
            .select('*', { count: 'exact', head: true })
            .eq('agency_id', agency.id)
            .eq('status', 'active');

          // Count properties managed
          const { count: propertiesCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('managed_by_agency', agency.id);

          return {
            ...agency,
            active_mandates: mandatesCount || 0,
            properties_managed: propertiesCount || 0,
            rating: 4.5, // Placeholder - would come from reviews table
            reviews_count: 0,
          } as Agency;
        })
      );

      setAgencies(agenciesWithStats);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedAgencies = agencies
    .filter((agency) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        agency.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // City filter
      const cityLower = agency.city?.toLowerCase() || '';
      const matchesCity =
        cityFilter === 'all' ||
        (cityFilter === 'abidjan' && cityLower.includes('abidjan')) ||
        (cityFilter === 'yamoussoukro' && cityLower.includes('yamoussoukro')) ||
        (cityFilter === 'bouake' && cityLower.includes('bouake')) ||
        (cityFilter === 'korhogo' && cityLower.includes('korhogo')) ||
        (cityFilter === 'san-pedro' && cityLower.includes('san pedro')) ||
        (cityFilter === 'other' &&
          !cityLower.includes('abidjan') &&
          !cityLower.includes('yamoussoukro') &&
          !cityLower.includes('bouake') &&
          !cityLower.includes('korhogo') &&
          !cityLower.includes('san pedro'));

      // Certified filter
      const matchesCertified = !showCertifiedOnly || agency.is_ansut_certified;

      return matchesSearch && matchesCity && matchesCertified;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.agency_name.localeCompare(b.agency_name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'properties':
          return (b.properties_managed || 0) - (a.properties_managed || 0);
        case 'certification':
          if (a.is_ansut_certified && !b.is_ansut_certified) return -1;
          if (!a.is_ansut_certified && b.is_ansut_certified) return 1;
          return 0;
        default:
          return 0;
      }
    });

  const handleInviteAgency = (agencyId: string) => {
    // Navigate to mandates page with pre-filled agency
    navigate('/proprietaire/mes-mandats', { state: { preselectedAgencyId: agencyId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Agences Immobilières</h1>
                <p className="text-orange-100">
                  Trouvez une agence certifiée ANSUT pour gérer vos biens
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-100 mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Total Agences</span>
                </div>
                <p className="text-2xl font-bold">{agencies.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-100 mb-1">
                  <Award className="h-4 w-4" />
                  <span className="text-sm">Certifiées ANSUT</span>
                </div>
                <p className="text-2xl font-bold">
                  {agencies.filter((a) => a.is_ansut_certified).length}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-100 mb-1">
                  <Home className="h-4 w-4" />
                  <span className="text-sm">Biens gérés</span>
                </div>
                <p className="text-2xl font-bold">
                  {agencies.reduce((sum, a) => sum + (a.properties_managed || 0), 0)}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-100 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Mandats actifs</span>
                </div>
                <p className="text-2xl font-bold">
                  {agencies.reduce((sum, a) => sum + (a.active_mandates || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une agence, une ville..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* City Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value as CityFilter)}
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {Object.entries(CITIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Certified Filter */}
              <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={showCertifiedOnly}
                  onChange={(e) => setShowCertifiedOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <Award className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Certifiées ANSUT</span>
              </label>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="certification">Certification d'abord</option>
                <option value="name">Nom A-Z</option>
                <option value="rating">Note</option>
                <option value="properties">Biens gérés</option>
              </select>
            </div>
          </div>

          {/* Agencies Grid */}
          {filteredAndSortedAgencies.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune agence trouvée</h3>
              <p className="text-gray-500">
                Aucune agence ne correspond à vos critères de recherche
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedAgencies.map((agency) => (
                <div
                  key={agency.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden group"
                >
                  {/* Header with Logo */}
                  <div className="relative h-40 bg-gradient-to-br from-orange-50 to-orange-100 p-6">
                    {agency.is_ansut_certified && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                        <Award className="h-3 w-3" />
                        ANSUT
                      </div>
                    )}

                    <div className="flex items-end gap-4">
                      <div className="w-20 h-20 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden">
                        {agency.logo_url ? (
                          <img
                            src={agency.logo_url}
                            alt={agency.agency_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-10 w-10 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <h3 className="font-bold text-gray-900 text-lg line-clamp-2">
                          {agency.agency_name}
                        </h3>
                        {agency.registration_number && (
                          <p className="text-xs text-gray-500">N° {agency.registration_number}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Location */}
                    {agency.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span>{agency.city}</span>
                        {agency.department && <span>({agency.department})</span>}
                      </div>
                    )}

                    {/* Description */}
                    {agency.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {agency.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {agency.properties_managed || 0}
                        </p>
                        <p className="text-xs text-gray-500">Biens</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {agency.active_mandates || 0}
                        </p>
                        <p className="text-xs text-gray-500">Mandats</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-lg font-bold text-gray-900">
                            {agency.rating?.toFixed(1) || '-'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Note</p>
                      </div>
                    </div>

                    {/* Commission */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Commission : <span className="font-bold text-orange-600">{agency.commission_rate}%</span>
                      </p>
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                      {agency.phone && (
                        <a
                          href={`tel:${agency.phone}`}
                          className="flex items-center gap-1 hover:text-orange-600"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {agency.email && (
                        <a
                          href={`mailto:${agency.email}`}
                          className="flex items-center gap-1 hover:text-orange-600"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {agency.website && (
                        <a
                          href={agency.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-orange-600"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleInviteAgency(agency.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        Inviter
                      </button>
                      <Link
                        to={`/agences/${agency.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Voir plus
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
