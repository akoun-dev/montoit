import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import Button from '@/shared/ui/Button';
import {
  ClipboardList,
  Plus,
  Camera,
  FileText,
  Check,
  X,
  Loader2,
  Home,
  Calendar,
  Eye,
  Download,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface InventoryReport {
  id: string;
  lease_id: string;
  property_id: string;
  report_type: 'entry' | 'exit';
  inspection_date: string;
  general_condition: string | null;
  rooms: unknown[];
  photos: unknown[];
  damages: unknown[];
  total_damages_cost: number;
  status: string;
  pdf_url: string | null;
  created_at: string;
  properties?: {
    title: string;
    address: string;
    images: string[];
  };
  lease_contracts?: {
    contract_number: string;
    tenant_id: string;
  };
  tenant_name?: string;
}

export default function InventoryReportsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'entry' | 'exit'>('all');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['inventory-reports', user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('inventory_reports')
        .select(
          `
          *,
          properties (title, address, images),
          lease_contracts (
            contract_number,
            tenant_id
          )
        `
        )
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('report_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch tenant names separately
      const tenantIds = [
        ...new Set(data?.map((r) => r.lease_contracts?.tenant_id).filter(Boolean) as string[]),
      ];
      const { data: profiles } = await supabase
        .from('profiles_with_user_id')
        .select('user_id, full_name')
        .in('user_id', tenantIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      return data?.map((r) => ({
        ...r,
        tenant_name: r.lease_contracts?.tenant_id
          ? profileMap.get(r.lease_contracts.tenant_id)
          : undefined,
      })) as InventoryReport[];
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon' },
      pending_signatures: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        label: 'En attente de signatures',
      },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complété' },
    };
    const style = styles[status] ?? styles['draft'];
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${style?.bg ?? ''} ${style?.text ?? ''}`}
      >
        {style?.label ?? status}
      </span>
    );
  };

  const getTypeBadge = (type: 'entry' | 'exit') => {
    return type === 'entry' ? (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Entrée
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        Sortie
      </span>
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2C1810]">États des lieux</h1>
            <p className="text-[#2C1810]/60">Gérez les états des lieux d'entrée et de sortie</p>
          </div>

          <Link to="/dashboard/etats-des-lieux/nouveau">
            <Button className="bg-[#F16522] hover:bg-[#F16522]/90 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel état des lieux
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {(['all', 'entry', 'exit'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'outline'}
              size="small"
              className={`rounded-xl ${filter === f ? 'bg-[#F16522] hover:bg-[#F16522]/90' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Tous' : f === 'entry' ? 'Entrée' : 'Sortie'}
            </Button>
          ))}
        </div>

        {/* Reports List */}
        <Card className="rounded-[24px] border-[#EFEBE9]">
          <CardHeader>
            <CardTitle className="text-[#2C1810]">
              {reports?.length || 0} état(s) des lieux
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-4 p-4 bg-white border border-[#EFEBE9] rounded-xl hover:shadow-md transition-shadow"
                  >
                    {/* Property Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {report.properties?.images?.[0] ? (
                        <img
                          src={report.properties.images[0]}
                          alt={report.properties?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeBadge(report.report_type)}
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="font-medium text-[#2C1810] truncate">
                        {report.properties?.title}
                      </p>
                      <p className="text-sm text-[#2C1810]/60">
                        {report.tenant_name} • {report.lease_contracts?.contract_number}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-[#2C1810]/40">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.inspection_date), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {(report.photos as unknown[])?.length || 0} photos
                        </span>
                        {report.total_damages_cost > 0 && (
                          <span className="text-red-600">
                            Dégâts: {formatCurrency(report.total_damages_cost)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link to={`/dashboard/etats-des-lieux/${report.id}`}>
                        <Button variant="outline" size="small" className="rounded-lg p-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {report.status === 'draft' && (
                        <Link to={`/dashboard/etats-des-lieux/${report.id}/editer`}>
                          <Button variant="outline" size="small" className="rounded-lg p-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {report.pdf_url && (
                        <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="small" className="rounded-lg p-2">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-[#2C1810]/20 mx-auto mb-4" />
                <p className="text-[#2C1810]/60 mb-4">Aucun état des lieux</p>
                <Link to="/dashboard/etats-des-lieux/nouveau">
                  <Button className="bg-[#F16522] hover:bg-[#F16522]/90 rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un état des lieux
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {reports && reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="rounded-[24px] border-[#EFEBE9]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <ClipboardList className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C1810]">{reports.length}</p>
                    <p className="text-sm text-[#2C1810]/60">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[24px] border-[#EFEBE9]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C1810]">
                      {reports.filter((r) => r.status === 'completed').length}
                    </p>
                    <p className="text-sm text-[#2C1810]/60">Complétés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[24px] border-[#EFEBE9]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <FileText className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C1810]">
                      {reports.filter((r) => r.status === 'draft').length}
                    </p>
                    <p className="text-sm text-[#2C1810]/60">Brouillons</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[24px] border-[#EFEBE9]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2C1810]">
                      {formatCurrency(
                        reports.reduce((sum, r) => sum + (r.total_damages_cost || 0), 0)
                      )}
                    </p>
                    <p className="text-sm text-[#2C1810]/60">Total dégâts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
