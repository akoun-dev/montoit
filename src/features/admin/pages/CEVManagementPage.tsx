import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Coins,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CEVRequest {
  id: string;
  cev_number: string;
  oneci_reference_number: string;
  landlord: {
    full_name: string;
    email: string;
  };
  tenant: {
    full_name: string;
    email: string;
  };
  property: {
    title: string;
    address: string;
  };
  status:
    | 'pending_documents'
    | 'submitted'
    | 'under_review'
    | 'documents_requested'
    | 'approved'
    | 'issued'
    | 'rejected';
  created_at: string;
  cev_fee_amount: number;
  cev_fee_paid: boolean;
  processing_time?: number;
}

interface CEVStats {
  total: number;
  pending: number;
  in_progress: number;
  issued: number;
  rejected: number;
  total_revenue: number;
  avg_processing_time: number;
  approval_rate: number;
}

export default function AdminCEVManagement() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CEVRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CEVRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('30d');
  const [stats, setStats] = useState<CEVStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, dateFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch real CEV requests from database

      const { data: cevRequests, error } = await supabase
        .from('cev_requests' as any)
        .select(
          `
          *,
          landlord:landlord_id(full_name, email),
          tenant:tenant_id(full_name, email),
          property:property_id(title, address)
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching CEV requests:', error);
        setRequests([]);
        setStats({
          total: 0,
          pending: 0,
          in_progress: 0,
          issued: 0,
          rejected: 0,
          total_revenue: 0,
          avg_processing_time: 0,
          approval_rate: 0,
        });
        return;
      }

      // Transform the data to match the CEVRequest interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedRequests: CEVRequest[] = ((cevRequests as any[]) || []).map((req: any) => ({
        id: req.id,
        cev_number: req.cev_number || '',
        oneci_reference_number: req.oneci_reference_number || '',
        landlord: {
          full_name: req.landlord?.full_name || 'N/A',
          email: req.landlord?.email || '',
        },
        tenant: {
          full_name: req.tenant?.full_name || 'N/A',
          email: req.tenant?.email || '',
        },
        property: {
          title: req.property?.title || 'N/A',
          address:
            typeof req.property?.address === 'string'
              ? req.property.address
              : req.property?.address
                ? `${req.property.address.street || ''}, ${req.property.address.city || ''}`
                : 'N/A',
        },
        status: req.status,
        created_at: req.created_at,
        cev_fee_amount: req.cev_fee_amount || 0,
        cev_fee_paid: req.cev_fee_paid || false,
        processing_time: req.processing_time,
      }));

      setRequests(transformedRequests);

      // Calculate real statistics
      const calculatedStats: CEVStats = {
        total: transformedRequests.length,
        pending: transformedRequests.filter((r) => ['pending_documents'].includes(r.status)).length,
        in_progress: transformedRequests.filter((r) =>
          ['submitted', 'under_review', 'documents_requested', 'approved'].includes(r.status)
        ).length,
        issued: transformedRequests.filter((r) => r.status === 'issued').length,
        rejected: transformedRequests.filter((r) => r.status === 'rejected').length,
        total_revenue: transformedRequests
          .filter((r) => r.cev_fee_paid)
          .reduce((sum, r) => sum + r.cev_fee_amount, 0),
        avg_processing_time: transformedRequests
          .filter((r) => r.processing_time && r.processing_time > 0)
          .reduce((sum, r, _, arr) => sum + (r.processing_time || 0) / arr.length, 0),
        approval_rate:
          transformedRequests.filter((r) => ['issued', 'rejected'].includes(r.status)).length > 0
            ? (transformedRequests.filter((r) => r.status === 'issued').length /
                transformedRequests.filter((r) => ['issued', 'rejected'].includes(r.status))
                  .length) *
              100
            : 0,
      };

      setStats(calculatedStats);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setRequests([]);
      setStats({
        total: 0,
        pending: 0,
        in_progress: 0,
        issued: 0,
        rejected: 0,
        total_revenue: 0,
        avg_processing_time: 0,
        approval_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.cev_number?.toLowerCase().includes(term) ||
          req.oneci_reference_number?.toLowerCase().includes(term) ||
          req.landlord?.full_name?.toLowerCase().includes(term) ||
          req.tenant?.full_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Filtrer par date
    if (dateFilter !== 'all') {
      const now = new Date();
      const daysAgo = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      filtered = filtered.filter((req) => new Date(req.created_at) >= cutoffDate);
    }

    setFilteredRequests(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'under_review':
      case 'documents_requested':
      case 'approved':
        return 'text-blue-600 bg-blue-100';
      case 'pending_documents':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_documents':
        return 'Documents en attente';
      case 'submitted':
        return 'Soumis';
      case 'under_review':
        return 'En revue';
      case 'documents_requested':
        return 'Documents demandés';
      case 'approved':
        return 'Approuvé';
      case 'issued':
        return 'Délivré';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des CEV</h1>
        <p className="text-gray-600">Suivi des demandes de Certificats de Valuation de Loyer</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total des demandes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En cours</p>
                <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Délivrés</p>
                <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenus totaux</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_revenue.toLocaleString()} FCFA
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Coins className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par CEV, ONECI, nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending_documents">Documents en attente</option>
            <option value="submitted">Soumis</option>
            <option value="under_review">En revue</option>
            <option value="approved">Approuvé</option>
            <option value="issued">Délivré</option>
            <option value="rejected">Rejeté</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="all">Toutes les dates</option>
          </select>

          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des demandes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune demande trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CEV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ONECI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriétaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriété
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frais
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.cev_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.oneci_reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.landlord.full_name}
                      </div>
                      <div className="text-sm text-gray-500">{request.landlord.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.tenant.full_name}
                      </div>
                      <div className="text-sm text-gray-500">{request.tenant.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.property.title}
                      </div>
                      <div className="text-sm text-gray-500">{request.property.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.cev_fee_amount.toLocaleString()} FCFA
                      </div>
                      <div className="text-sm">
                        {request.cev_fee_paid ? (
                          <span className="text-green-600">Payé</span>
                        ) : (
                          <span className="text-red-600">Non payé</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
