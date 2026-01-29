import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  Home,
  CreditCard,
  Shield,
  FolderOpen,
  File,
  FileWarning,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  Building,
  FileCode,
  Image,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentItem {
  id: string;
  name: string;
  type: 'contract' | 'payment' | 'insurance' | 'other';
  category: string;
  file_url: string | null;
  file_type: 'pdf' | 'image' | 'doc' | 'other';
  created_at: string;
  updated_at: string;
  expiry_date: string | null;
  status: 'valid' | 'expired' | 'pending';
  size?: number;
  description?: string;
}

interface LeaseContract {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  property_id: string;
  properties?: {
    title: string;
    address: string | null;
    city: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
  receipt_url: string | null;
  lease_id: string;
}

const DOCUMENT_CATEGORIES = {
  contract: {
    label: 'Contrats',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    subcategories: [
      { id: 'current', label: 'Contrat en cours', icon: File },
      { id: 'amendment', label: 'Avenants', icon: FileCode },
      { id: 'termination', label: 'Résiliation', icon: FileWarning },
      { id: 'history', label: 'Historique', icon: FolderOpen },
    ],
  },
  payment: {
    label: 'Paiements',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    subcategories: [
      { id: 'receipt', label: 'Quittances de loyer', icon: Receipt },
      { id: 'proof', label: 'Reçus de paiement', icon: CheckCircle },
      { id: 'invoice', label: 'Factures de charges', icon: File },
      { id: 'history', label: 'Historique complet', icon: Calendar },
    ],
  },
  insurance: {
    label: 'Assurances',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    subcategories: [
      { id: 'tenant', label: 'Assurance habitation', icon: Home },
      { id: 'owner', label: 'Assurance propriétaire', icon: Building },
      { id: 'certificate', label: 'Attestations', icon: FileText },
      { id: 'claim', label: 'Sinistres', icon: AlertCircle },
    ],
  },
  other: {
    label: 'Autres documents',
    icon: FolderOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    subcategories: [
      { id: 'diagnostic', label: 'Diagnostics', icon: File },
      { id: 'rules', label: "Règlement de l'immeuble", icon: FileText },
      { id: 'plan', label: 'Plans', icon: Image },
      { id: 'manual', label: "Modes d'emploi", icon: FileCode },
    ],
  },
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contract' | 'payment' | 'insurance' | 'other'>('contract');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentContract, setCurrentContract] = useState<LeaseContract | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadCurrentContract();
      loadPayments();
    }
  }, [user, activeTab]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Pour l'instant, charger les documents depuis la table profiles
      // Plus tard, utiliser une table dédiée tenant_documents
      const { data: profile } = await supabase
        .from('profiles')
        .select('documents')
        .eq('id', user.id)
        .single();

      // Filtrer par type de document actif
      const allDocs = (profile?.documents as any[]) || [];
      const filteredDocs = allDocs.filter((doc: any) => doc.type === activeTab);

      const docs: DocumentItem[] = filteredDocs.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        category: doc.category || 'other',
        file_url: doc.file_url,
        file_type: doc.file_type || 'other',
        created_at: doc.created_at,
        updated_at: doc.updated_at || doc.created_at,
        expiry_date: doc.expiry_date || null,
        status: doc.status || 'valid',
        size: doc.file_size,
        description: doc.description,
      }));

      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentContract = async () => {
    if (!user || activeTab !== 'contract') return;

    try {
      const { data } = await supabase
        .from('lease_contracts')
        .select(`
          id,
          contract_number,
          start_date,
          end_date,
          status,
          property_id,
          properties (
            title,
            address,
            city,
            monthly_rent
          )
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .maybeSingle();

      // Map properties.monthly_rent to monthly_rent
      const contract = data ? {
        ...data,
        monthly_rent: data.properties?.monthly_rent || 0,
      } : null;

      setCurrentContract(contract as LeaseContract | null);
    } catch (error) {
      console.error('Error loading contract:', error);
    }
  };

  const loadPayments = async () => {
    if (!user || activeTab !== 'payment') return;

    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('payer_id', user.id)
        .order('payment_date', { ascending: false })
        .limit(12);

      setPayments((data || []) as Payment[]);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('documents')
        .eq('id', user?.id)
        .single();

      const currentDocs = (profile?.documents as any[]) || [];
      const updatedDocs = currentDocs.filter((d: any) => d.id !== docId);

      const { error } = await supabase
        .from('profiles')
        .update({ documents: updatedDocs })
        .eq('id', user?.id);

      if (error) throw error;

      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression du document');
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'doc':
        return <FileCode className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            Valide
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3" />
            Expiré
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3" />
            En attente
          </span>
        );
      default:
        return null;
    }
  };

  const renderContractTab = () => {
    return (
      <div className="space-y-6">
        {/* Current Contract Banner */}
        {currentContract && (
          <div className="bg-gradient-to-r from-[#F16522] to-[#d9571d] rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Contrat en cours</h3>
                  <p className="text-white/90 text-sm mb-2">
                    {currentContract.properties?.title}
                  </p>
                  <p className="text-white/80 text-xs mb-1">
                    Du {format(new Date(currentContract.start_date), 'd MMM yyyy', { locale: fr })} au{' '}
                    {format(new Date(currentContract.end_date), 'd MMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-white/80 text-xs font-semibold">
                    {currentContract.monthly_rent.toLocaleString()} FCFA/mois
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/locataire/contrat/${currentContract.id}`)}
                className="px-4 py-2 bg-white text-[#F16522] font-semibold rounded-xl hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Voir le contrat
              </button>
            </div>
          </div>
        )}

        {/* Documents List */}
        {renderDocumentsList()}
      </div>
    );
  };

  const renderPaymentTab = () => {
    return (
      <div className="space-y-6">
        {/* Payments Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2C1810]">
                  {payments.filter(p => p.status === 'complete').length}
                </p>
                <p className="text-xs text-[#6B5A4E]">Payés</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2C1810]">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
                <p className="text-xs text-[#6B5A4E]">En attente</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2C1810]">
                  {payments.length}
                </p>
                <p className="text-xs text-[#6B5A4E]">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#F16522]/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-[#F16522]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#2C1810]">
                  {payments
                    .filter(p => p.status === 'complete')
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toLocaleString()} FCFA
                </p>
                <p className="text-xs text-[#6B5A4E]">Total payé</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        {payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
            <div className="p-4 border-b border-[#EFEBE9] bg-[#FAF7F4]">
              <h3 className="font-semibold text-[#2C1810]">Paiements récents</h3>
            </div>
            <div className="divide-y divide-[#EFEBE9]">
              {payments.slice(0, 6).map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-[#FAF7F4] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${
                      payment.status === 'complete' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {payment.status === 'complete' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#2C1810]">
                        {payment.amount.toLocaleString()} FCFA
                      </p>
                      <p className="text-xs text-[#6B5A4E]">
                        {format(new Date(payment.payment_date), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(payment.status === 'complete' ? 'valid' : 'pending')}
                    {payment.receipt_url && (
                      <button
                        onClick={() => handleDownload(payment.receipt_url!, `Quittance_${payment.id}.pdf`)}
                        className="p-2 text-[#6B5A4E] hover:text-[#F16522] hover:bg-[#FAF7F4] rounded-lg transition-colors"
                        title="Télécharger la quittance"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/locataire/mes-paiements')}
              className="w-full p-3 text-center text-[#F16522] font-medium text-sm hover:bg-[#FAF7F4] transition-colors"
            >
              Voir tous les paiements →
            </button>
          </div>
        )}

        {/* Documents List */}
        {renderDocumentsList()}
      </div>
    );
  };

  const renderDocumentsList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
        </div>
      );
    }

    if (filteredDocuments.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#EFEBE9]">
          <div className="w-20 h-20 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-10 w-10 text-[#6B5A4E]" />
          </div>
          <h3 className="text-xl font-bold text-[#2C1810] mb-2">
            Aucun document trouvé
          </h3>
          <p className="text-[#6B5A4E] mb-6">
            {searchQuery
              ? 'Aucun document ne correspond à votre recherche'
              : `Vous n'avez pas encore de documents dans cette catégorie`}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
        {/* Header avec recherche et filtres */}
        <div className="p-4 border-b border-[#EFEBE9] bg-[#FAF7F4]">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B5A4E]" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-4 py-2.5 bg-white border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522] text-sm"
              >
                <option value="">Toutes les catégories</option>
                {DOCUMENT_CATEGORIES[activeTab].subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="divide-y divide-[#EFEBE9]">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="p-4 hover:bg-[#FAF7F4] transition-colors flex items-start gap-4"
            >
              {/* File Icon */}
              <div className="p-3 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9] flex-shrink-0">
                {getFileIcon(doc.file_type)}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4 className="font-semibold text-[#2C1810] truncate">{doc.name}</h4>
                    {doc.description && (
                      <p className="text-sm text-[#6B5A4E] line-clamp-1">{doc.description}</p>
                    )}
                  </div>
                  {getStatusBadge(doc.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B5A4E] mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                  {doc.size && (
                    <span>{(doc.size / 1024).toFixed(0)} Ko</span>
                  )}
                  {doc.expiry_date && (
                    <span className={
                      new Date(doc.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''
                    }>
                      Expire: {format(new Date(doc.expiry_date), 'd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.file_url && (
                  <button
                    onClick={() => setPreviewDocument(doc.file_url)}
                    className="p-2 text-[#6B5A4E] hover:text-[#F16522] hover:bg-[#FAF7F4] rounded-lg transition-colors"
                    title="Voir"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {doc.file_url && (
                  <button
                    onClick={() => handleDownload(doc.file_url, doc.name)}
                    className="p-2 text-[#6B5A4E] hover:text-[#F16522] hover:bg-[#FAF7F4] rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-2 text-[#6B5A4E] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'contract':
        return renderContractTab();
      case 'payment':
        return renderPaymentTab();
      default:
        return renderDocumentsList();
    }
  };

  return (
    <TenantDashboardLayout title="Documents">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-[#2C1810] rounded-[20px] p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <span>Mes Documents</span>
          </h1>
          <p className="text-[#E8D4C5] text-lg ml-15">
            Tous vos documents locatifs au même endroit
          </p>
        </div>

        {/* Category Tabs */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key as any);
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === key
                      ? 'bg-[#F16522] text-white shadow-lg'
                      : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        {renderTabContent()}
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPreviewDocument(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#EFEBE9]">
              <h3 className="font-semibold text-[#2C1810]">Aperçu du document</h3>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-[#6B5A4E]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-[#FAF7F4]">
              <iframe
                src={previewDocument}
                className="w-full h-full min-h-[500px] rounded-lg border border-[#EFEBE9]"
                title="Document preview"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t border-[#EFEBE9] bg-white">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewDocument;
                  link.download = 'document';
                  link.click();
                }}
                className="px-4 py-2 bg-[#F16522] text-white rounded-lg hover:bg-[#d9571d] transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantDashboardLayout>
  );
}
