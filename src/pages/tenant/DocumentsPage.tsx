import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';

interface Document {
  id: string;
  name: string;
  type: 'identity' | 'income' | 'guarantee' | 'contract' | 'other';
  status: 'pending' | 'verified' | 'rejected';
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  verified_at?: string;
  notes?: string;
}

const documentTypes = {
  identity: { label: "Pièce d'identité", icon: '🆔', required: true },
  income: { label: 'Justificatif de revenus', icon: '💰', required: true },
  guarantee: { label: 'Justificatif de garantie', icon: '🛡️', required: false },
  contract: { label: 'Contrat de location', icon: '📄', required: false },
  other: { label: 'Autre document', icon: '📁', required: false },
};

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'En attente de vérification',
  },
  verified: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Vérifié',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Rejeté',
  },
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('identity');

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      // Get user's documents from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('documents')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      // Parse and set documents
      const docs = profile?.documents || [];
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Seuls les fichiers PDF, JPEG et PNG sont autorisés');
      return;
    }

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileName = `${user?.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('user-documents').getPublicUrl(fileName);

      // Get current documents
      const { data: profile } = await supabase
        .from('profiles')
        .select('documents')
        .eq('id', user?.id)
        .single();

      const currentDocs = profile?.documents || [];

      // Create new document object
      const newDoc: Document = {
        id: Date.now().toString(), // Generate unique ID
        name: file.name,
        type: selectedType as Document['type'],
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Update documents array
      const updatedDocs = [...currentDocs, newDoc];

      // Save to profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ documents: updatedDocs })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Reload documents
      await loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors du téléchargement du document');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Get document info
      const document = documents.find((d) => d.id === documentId);
      if (!document) return;

      // Delete from storage
      const filePath = document.file_url.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from('user-documents')
        .remove([filePath]);

      if (deleteError) console.error('Storage delete error:', deleteError);

      // Remove document from array
      const updatedDocs = documents.filter((d) => d.id !== documentId);

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ documents: updatedDocs })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setDocuments(updatedDocs);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression du document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDocumentStats = () => {
    const total = documents.length;
    const verified = documents.filter((d) => d.status === 'verified').length;
    const pending = documents.filter((d) => d.status === 'pending').length;
    const rejected = documents.filter((d) => d.status === 'rejected').length;

    return { total, verified, pending, rejected };
  };

  const stats = getDocumentStats();

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Connexion requise</h2>
          <p className="text-neutral-600">Veuillez vous connecter pour accéder à vos documents</p>
        </div>
      </div>
    );
  }

  return (
    <TenantDashboardLayout title="Mes Documents">
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Documents</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez vos documents justificatifs</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vérifiés</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejetés</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajouter un document</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de document
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(documentTypes).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                    {config.required && ' *'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichier (PDF, JPEG, PNG - max 10MB)
              </label>
              <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm cursor-pointer bg-white hover:bg-gray-50">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Téléchargement...' : 'Choisir un fichier'}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <span className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Les documents avec * sont obligatoires pour certaines demandes de location
            </span>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Mes documents ({documents.length})
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun document</h3>
              <p className="text-gray-600">Commencez par ajouter vos documents justificatifs</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((document) => {
                const StatusIcon = statusConfig[document.status].icon;
                return (
                  <div key={document.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{document.name}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {documentTypes[document.type].label}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatFileSize(document.file_size)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(document.created_at)}
                            </span>
                          </div>
                          {document.notes && (
                            <p className="text-sm text-gray-600 mt-1">{document.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[document.status].bgColor} ${statusConfig[document.status].color}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[document.status].label}
                        </span>
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Voir le document"
                        >
                          <Eye className="w-5 h-5" />
                        </a>
                        <a
                          href={document.file_url}
                          download={document.name}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Télécharger"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() => deleteDocument(document.id)}
                          className="p-2 text-red-400 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TenantDashboardLayout>
  );
}
