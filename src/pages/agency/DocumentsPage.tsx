import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  FolderOpen,
  File,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Trash2,
  Share2,
  PenTool,
  Tag,
  Calendar,
  Building2,
  Loader2,
  FileSignature,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { documentProcessorService } from '@/services/documents/document-processor.service';

interface Property {
  id: string;
  title: string;
  city: string;
  main_image: string | null;
}

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  property_id: string | null;
  property?: Property;
  file_url: string;
  file_size: number;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  signed: boolean;
  signed_at?: string | null;
  ocr_text?: string | null;
}

const CATEGORIES = [
  { value: 'contract', label: 'Contrats de location', icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { value: 'lease', label: 'Bail commercial', icon: FileSignature, color: 'bg-purple-50 text-purple-600' },
  { value: 'insurance', label: 'Assurances', icon: CheckCircle, color: 'bg-green-50 text-green-600' },
  { value: 'diagnostic', label: 'Diagnostics', icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
  { value: 'invoice', label: 'Factures', icon: File, color: 'bg-red-50 text-red-600' },
  { value: 'receipt', label: 'Quittances de loyer', icon: Calendar, color: 'bg-orange-50 text-orange-600' },
  { value: 'mandate', label: 'Mandats de gestion', icon: FileSignature, color: 'bg-indigo-50 text-indigo-600' },
  { value: 'other', label: 'Autres', icon: FileText, color: 'bg-gray-50 text-gray-600' },
];

const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple';
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-lg ${color === 'gray' ? 'bg-gray-200' : 'bg-white'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const DocumentStatusBadge = ({ status }: { status: string }) => {
  const config = {
    ready: { label: 'Pret', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
    processing: { label: 'OCR en cours', color: 'text-amber-700', bg: 'bg-amber-100', icon: Sparkles },
    error: { label: 'Erreur', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
  };

  const statusConfig = config[status as keyof typeof config] || config.ready;
  const Icon = statusConfig.icon;

  if (status === 'ready') return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {statusConfig.label}
    </span>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const cat = CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  if (!cat) return null;
  const Icon = cat.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cat.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {cat.label}
    </span>
  );
};

export { CategoryBadge };

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Octets';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function AgencyDocumentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<string | 'all'>('all');
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('other');
  const [uploadPropertyId, setUploadPropertyId] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState({
    total: 0,
    totalSize: 0,
    signed: 0,
    pending: 0,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch agency ID from user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('user_id', user.id)
        .single();

      const agencyId = profileData?.agency_id;
      if (!agencyId) {
        toast.error('Profil agence non trouvé');
        setLoading(false);
        return;
      }

      // Fetch properties managed by agency
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, city, main_image')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      setProperties((propertiesData || []) as Property[]);

      // Try to load from agency_documents table first, then fallback to owner_documents
      let documentsData;
      let docsError;

      try {
        const result = await (supabase as any)
          .from('agency_documents')
          .select('*, properties(id, title, city, main_image)')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false });
        documentsData = result.data;
        docsError = result.error;
      } catch (e) {
        docsError = e;
      }

      if (docsError) {
        console.log('agency_documents table does not exist yet, trying owner_documents:', docsError.message);
        // Fallback to owner_documents filtered by agency properties
        const propertyIds = (propertiesData || []).map((p: any) => p.id);
        if (propertyIds.length > 0) {
          const { data: ownerDocs } = await (supabase as any)
            .from('owner_documents')
            .select('*, properties(id, title, city, main_image)')
            .in('property_id', propertyIds)
            .order('created_at', { ascending: false });
          documentsData = ownerDocs;
        } else {
          documentsData = [];
        }
      }

      const docs = (documentsData || []) as Document[];
      setDocuments(docs);

      let totalSize = 0;
      let signedCount = 0;
      let taggedCount = 0;

      docs.forEach((doc) => {
        totalSize += doc.file_size || 0;
        if (doc.signed) signedCount++;
        if (doc.tags && doc.tags.length > 0) taggedCount++;
      });

      setStats({
        total: docs.length,
        totalSize,
        signed: signedCount,
        pending: taggedCount,
      });
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);

    try {
      // Fetch agency ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('user_id', user!.id)
        .single();

      const agencyId = profileData?.agency_id;
      if (!agencyId) {
        toast.error('Profil agence non trouvé');
        return;
      }

      for (const file of Array.from(files)) {
        console.log('🚀 [AgencyDocumentsPage] Début traitement fichier:', file.name);

        const toastId = toast.loading(`OCR en cours: ${file.name}...`, {
          description: 'Initialisation de Tesseract...',
        });

        setCurrentFileName(file.name);
        setOcrProgress(0);

        const unsubscribe = documentProcessorService.onProgress((progress) => {
          setOcrProgress(progress);
          toast.loading(`OCR en cours: ${file.name} (${progress}%)`, {
            id: toastId,
          });
        });

        const ocrResult = await documentProcessorService.extractTextFromFile(file);
        console.log('✅ [AgencyDocumentsPage] OCR terminé, résultat:', ocrResult.success);

        unsubscribe();

        toast.success(`OCR terminé: ${file.name}`, {
          id: toastId,
          description: `${ocrResult.text.length} caractères extraits`,
        });

        let tags: string[] = [];
        let suggestedCategory: string | undefined;

        if (ocrResult.success && ocrResult.text) {
          const tagResult = await documentProcessorService.generateTagsAndCategory(
            ocrResult.text,
            file.name,
            uploadCategory
          );
          tags = tagResult.tags;
          suggestedCategory = tagResult.suggestedCategory;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `agency/${agencyId}/${fileName}`;

        // Try agency-documents bucket first, fallback to owner-documents
        let bucketName = 'agency-documents';
        let uploadError = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError.error && uploadError.error.message.includes('bucket not found')) {
          bucketName = 'owner-documents';
          uploadError = await supabase.storage
            .from(bucketName)
            .upload(filePath, file);
        }

        if (uploadError.error) {
          console.error('Storage upload error:', uploadError.error);
          if (uploadError.error.message.includes('bucket not found') || uploadError.error.message.includes('The resource was not found')) {
            toast.error('Bucket de stockage non configure. Contactez l\'administrateur.');
            return;
          }
          throw uploadError.error;
        }

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        // Try agency_documents table first
        let dbError;
        let tableName = 'agency_documents';

        dbError = await (supabase as any)
          .from(tableName)
          .insert({
            agency_id: agencyId,
            name: file.name,
            type: fileExt || 'unknown',
            category: suggestedCategory || uploadCategory,
            property_id: uploadPropertyId || null,
            file_url: urlData.publicUrl,
            file_size: file.size,
            status: 'ready',
            tags: tags.length > 0 ? tags : [],
            ocr_text: ocrResult.success ? ocrResult.text : null,
            signed: false,
          });

        if (dbError.error && dbError.error.message.includes('relation')) {
          tableName = 'owner_documents';
          dbError = await (supabase as any)
            .from(tableName)
            .insert({
              owner_id: user!.id,
              name: file.name,
              type: fileExt || 'unknown',
              category: suggestedCategory || uploadCategory,
              property_id: uploadPropertyId || null,
              file_url: urlData.publicUrl,
              file_size: file.size,
              status: 'ready',
              tags: tags.length > 0 ? tags : [],
              ocr_text: ocrResult.success ? ocrResult.text : null,
              signed: false,
            });
        }

        if (dbError.error) {
          console.error('Database insert error:', dbError.error);
          if (dbError.error.message.includes('relation') || dbError.error.message.includes('does not exist')) {
            toast.error(`Table de documents non configuree. Contactez l\'administrateur.`);
            return;
          }
          throw dbError.error;
        }

        if (ocrResult.success) {
          console.log(`OCR réussi pour ${file.name}: ${ocrResult.text.length} caractères extraits`);
        }
      }

      toast.success(`${files.length} document(s) ajoute(s) avec OCR et tags`);
      loadData();
      setShowUploadModal(false);
      setUploadCategory('other');
      setUploadPropertyId('');
      setOcrProgress(0);
      setCurrentFileName('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Erreur lors du telechargement');
    } finally {
      setUploading(false);
      setOcrProgress(0);
      setCurrentFileName('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [uploadCategory, uploadPropertyId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDelete = async (docId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce document ?')) return;

    try {
      // Try agency_documents first
      let error = await (supabase as any)
        .from('agency_documents')
        .delete()
        .eq('id', docId);

      if (error.error) {
        error = await (supabase as any)
          .from('owner_documents')
          .delete()
          .eq('id', docId);
      }

      if (error.error) throw error.error;

      toast.success('Document supprime');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSign = async (_docId: string) => {
    toast.info('Signature electronique - Fonctionnalite a venir');
  };

  const handleShare = async (_docId: string) => {
    toast.info('Partage securise - Fonctionnalite a venir');
  };

  const filteredDocuments = documents.filter((doc) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = doc.name?.toLowerCase().includes(query);
      const matchesTags = doc.tags?.some((tag) => tag.toLowerCase().includes(query));
      const matchesOCR = doc.ocr_text?.toLowerCase().includes(query);
      if (!matchesName && !matchesTags && !matchesOCR) return false;
    }

    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false;
    }

    if (selectedProperty !== 'all' && doc.property_id !== selectedProperty) {
      return false;
    }

    return true;
  });

  const documentsByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    documents: filteredDocuments.filter((d) => d.category === cat.value),
  })).filter((group) => group.documents.length > 0);

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <FolderOpen className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Documents</h1>
                <p className="text-[#E8D4C5]">Gerez tous vos documents immobiliers</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadCategory('other');
                setUploadPropertyId('');
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors"
            >
              <Upload className="w-5 h-5" />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={FileText} label="Total documents" value={stats.total} color="gray" />
          <StatCard icon={PenTool} label="Signes" value={stats.signed} color="green" />
          <StatCard icon={Tag} label="Taggés" value={stats.pending} color="blue" />
          <StatCard icon={FolderOpen} label="Taille totale" value={formatFileSize(stats.totalSize)} color="purple" />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 p-4 border border-gray-200">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, tags, contenu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="all">Toutes categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="all">Tous les biens</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents by Category */}
        {documentsByCategory.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun document trouve</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedCategory !== 'all' || selectedProperty !== 'all'
                ? 'Aucun document ne correspond a vos criteres'
                : 'Commencez par ajouter vos documents'}
            </p>
            {searchQuery === '' && selectedCategory === 'all' && selectedProperty === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors"
              >
                <Upload className="w-5 h-5" />
                Ajouter des documents
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {documentsByCategory.map((group) => (
              <div key={group.value} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${group.color}`}>
                      <group.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{group.label}</h3>
                    <span className="text-sm text-gray-500">({group.documents.length})</span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {group.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
                          <File className="w-6 h-6 text-gray-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-gray-900 truncate">{doc.name}</p>
                            <DocumentStatusBadge status={doc.status} />
                            {doc.signed && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                Signe
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>-</span>
                            <span>{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                            {doc.property && (
                              <>
                                <span>-</span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {doc.property.title}
                                </span>
                              </>
                            )}
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Tag className="w-3 h-3 text-gray-400" />
                              {doc.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => window.open(doc.file_url, '_blank')}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Telecharger"
                          >
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleShare(doc.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Partager"
                          >
                            <Share2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleSign(doc.id)}
                            className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Signer"
                          >
                            <PenTool className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Ajouter des documents</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setOcrProgress(0);
                  setCurrentFileName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categorie *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bien (optionnel)
                  </label>
                  <select
                    value={uploadPropertyId}
                    onChange={(e) => setUploadPropertyId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="">Sans bien</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-orange-500 transition-colors cursor-pointer mb-6"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                    <p className="text-gray-700">Telechargement en cours...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-lg font-semibold text-gray-700 mb-2">
                      Glissez vos fichiers ici
                    </p>
                    <p className="text-sm text-gray-500 mb-4">ou</p>
                    <button className="px-6 py-2 rounded-lg font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors">
                      Parcourir les fichiers
                    </button>
                    <p className="text-xs text-gray-400 mt-4">PDF, Images jusqu'a 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />
              </div>

              {uploading && currentFileName && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                      <span className="text-sm font-medium text-gray-800">
                        OCR en cours: {currentFileName}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {ocrProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {ocrProgress < 20 ? 'Initialisation de Tesseract...' :
                     ocrProgress < 80 ? 'Extraction du texte en cours...' :
                     'Finalisation...'}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Traitement automatique IA</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
                    <div className="p-2 rounded-lg bg-white">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">OCR automatique</p>
                      <p className="text-xs text-gray-500">Extraction du texte de vos documents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="p-2 rounded-lg bg-white">
                      <Tag className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Tagging intelligent</p>
                      <p className="text-xs text-gray-500">Génération automatique de tags pertinents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                    <div className="p-2 rounded-lg bg-white">
                      <Search className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Recherche full-text</p>
                      <p className="text-xs text-gray-500">Recherche dans le contenu des documents</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setOcrProgress(0);
                  setCurrentFileName('');
                }}
                className="px-6 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
