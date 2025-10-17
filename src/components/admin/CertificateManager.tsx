import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './DataTable';
import { MoreVertical, Shield, AlertTriangle, RefreshCw, Download, Filter, X, TrendingUp, CheckCircle2 } from 'lucide-react';
import { logger } from '@/services/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface User {
  full_name: string;
}

interface Certificate {
  id: string;
  user_id: string;
  certificate_id: string;
  certificate_status: 'active' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  user?: User;
}

type CertificateStatus = Certificate['certificate_status'];

const EXPIRY_WARNING_DAYS = 30;
const REFRESH_DELAY = 2000;
const PAGE_SIZE = 10;

export const CertificateManager = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'valid' | 'expiring'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('digital_certificates')
        .select('*, user:profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCertificates(data as Certificate[]);
      }
    } catch (error) {
      logger.error('Error fetching certificates', { error });
      toast({
        title: 'Erreur de chargement',
        description: 'Impossible de charger les certificats.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isExpiringSoon = useCallback((expiryDate: string): boolean => {
    const date = new Date(expiryDate);
    const daysUntilExpiry = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < EXPIRY_WARNING_DAYS && daysUntilExpiry > 0;
  }, []);

  const stats = useMemo(() => {
    const active = certificates.filter(c => c.certificate_status === 'active').length;
    const expired = certificates.filter(c => c.certificate_status === 'expired').length;
    const revoked = certificates.filter(c => c.certificate_status === 'revoked').length;
    const expiringSoon = certificates.filter(c => 
      c.certificate_status === 'active' && isExpiringSoon(c.expires_at)
    ).length;

    return { total: certificates.length, active, expired, revoked, expiringSoon };
  }, [certificates, isExpiringSoon]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter(cert => {
      const matchesSearch = !searchTerm || 
        cert.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificate_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || cert.certificate_status === statusFilter;

      let matchesExpiry = true;
      if (expiryFilter === 'expiring') {
        matchesExpiry = cert.certificate_status === 'active' && isExpiringSoon(cert.expires_at);
      } else if (expiryFilter === 'valid') {
        matchesExpiry = cert.certificate_status === 'active' && !isExpiringSoon(cert.expires_at);
      }

      return matchesSearch && matchesStatus && matchesExpiry;
    });
  }, [certificates, searchTerm, statusFilter, expiryFilter, isExpiringSoon]);

  const paginatedCertificates = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCertificates.slice(start, start + PAGE_SIZE);
  }, [filteredCertificates, currentPage]);

  const totalPages = Math.ceil(filteredCertificates.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, expiryFilter]);

  const confirmRevoke = useCallback((certificateId: string) => {
    setSelectedCertificate(certificateId);
    setRevokeDialogOpen(true);
  }, []);

  const handleRevokeCertificate = async () => {
    if (!selectedCertificate) return;

    try {
      const { error } = await supabase
        .from('digital_certificates')
        .update({ certificate_status: 'revoked' })
        .eq('id', selectedCertificate);

      if (error) throw error;

      toast({ 
        title: 'Certificat révoqué',
        description: 'Le certificat a été révoqué avec succès.'
      });
      
      fetchCertificates();
    } catch (error) {
      logger.error('Error revoking certificate', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de révoquer le certificat.',
        variant: 'destructive'
      });
    } finally {
      setRevokeDialogOpen(false);
      setSelectedCertificate(null);
    }
  };

  const handleRegenerateCertificate = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('cryptoneo-generate-certificate', {
        body: { userId }
      });

      if (error) throw error;

      toast({ 
        title: 'Régénération lancée',
        description: 'Le certificat est en cours de régénération.'
      });
      
      setTimeout(fetchCertificates, REFRESH_DELAY);
    } catch (error) {
      logger.error('Error regenerating certificate', { error });
      toast({
        title: 'Erreur de régénération',
        description: 'Impossible de régénérer le certificat.',
        variant: 'destructive'
      });
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    try {
      const headers = ['Utilisateur', 'Certificat ID', 'Statut', 'Date expiration', 'Date création'];
      const csvContent = [
        headers.join(','),
        ...filteredCertificates.map(cert => [
          `"${cert.user?.full_name || 'N/A'}"`,
          `"${cert.certificate_id}"`,
          cert.certificate_status,
          new Date(cert.expires_at).toLocaleDateString('fr-FR'),
          new Date(cert.created_at).toLocaleDateString('fr-FR')
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `certificats_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export réussi',
        description: `${filteredCertificates.length} certificat(s) exporté(s)`
      });
    } catch (error) {
      logger.error('Error exporting CSV', { error });
      toast({
        title: 'Erreur export',
        description: 'Impossible d\'exporter les données',
        variant: 'destructive'
      });
    }
  }, [filteredCertificates]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setExpiryFilter('all');
  }, []);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || expiryFilter !== 'all';

  const getStatusBadge = useCallback((status: CertificateStatus) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Actif' },
      expired: { variant: 'secondary' as const, label: 'Expiré' },
      revoked: { variant: 'destructive' as const, label: 'Révoqué' }
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }, []);

  const columns: any[] = useMemo(() => [
    {
      header: 'Utilisateur',
      accessorKey: 'user.full_name',
      cell: ({ row }: any) => row.original.user?.full_name || 'N/A'
    },
    {
      header: 'Certificat ID',
      accessorKey: 'certificate_id',
      cell: ({ row }: any) => (
        <code className="text-xs bg-muted px-2 py-0.5 rounded">
          {row.original.certificate_id.substring(0, 16)}...
        </code>
      )
    },
    {
      header: 'Statut',
      accessorKey: 'certificate_status',
      cell: ({ row }: any) => getStatusBadge(row.original.certificate_status)
    },
    {
      header: 'Expire le',
      accessorKey: 'expires_at',
      cell: ({ row }: any) => {
        const date = new Date(row.original.expires_at);
        const showWarning = isExpiringSoon(row.original.expires_at);
        
        return (
          <div className="flex items-center gap-2">
            {showWarning && (
              <AlertTriangle className="h-3 w-3 text-orange-500" />
            )}
            <span>{date.toLocaleDateString('fr-FR')}</span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: any) => {
        const isRevoked = row.original.certificate_status === 'revoked';
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRegenerateCertificate(row.original.user_id)}>
                <Shield className="h-4 w-4 mr-2" />
                Régénérer
              </DropdownMenuItem>
              {!isRevoked && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => confirmRevoke(row.original.id)}
                    className="text-destructive"
                  >
                    Révoquer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ], [getStatusBadge, isExpiringSoon, handleRegenerateCertificate, confirmRevoke]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.active}</p>
              </div>
              <Shield className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expire bientôt</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{stats.expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expirés</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Révoqués</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-500">{stats.revoked}</p>
              </div>
              <X className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Gestion des Certificats</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={loading || filteredCertificates.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCertificates}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'h-4 w-4 mr-2 animate-spin' : 'h-4 w-4 mr-2'} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom ou ID certificat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
                <SelectItem value="revoked">Révoqué</SelectItem>
              </SelectContent>
            </Select>

            <Select value={expiryFilter} onValueChange={(value: any) => setExpiryFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes expirations</SelectItem>
                <SelectItem value="valid">Valide (&gt;30j)</SelectItem>
                <SelectItem value="expiring">Expire bientôt (&lt;30j)</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredCertificates.length} résultat(s) trouvé(s)
          </div>

          {/* Table or Loading/Empty State */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun certificat trouvé</p>
              <p className="text-sm mt-2">
                {hasActiveFilters 
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Commencez par générer des certificats'
                }
              </p>
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={paginatedCertificates} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la révocation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir révoquer ce certificat ? Cette action est irréversible 
              et l'utilisateur devra obtenir un nouveau certificat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeCertificate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
