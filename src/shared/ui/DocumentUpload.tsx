/**
 * DocumentUpload - Composant d'upload de justificatifs (CDC v3)
 */

import React, { useState } from 'react';
import { Upload, FileText, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DocumentType =
  | 'work_certificate'
  | 'pay_slip'
  | 'bank_statement'
  | 'tax_return'
  | 'employment_contract'
  | 'business_license'
  | 'student_card'
  | 'pension_proof'
  | 'other';

interface Document {
  id: string;
  document_type: DocumentType;
  document_name: string | null;
  document_url: string;
  verified: boolean;
  created_at: string;
}

interface DocumentUploadProps {
  userId: string;
  documents: Document[];
  onDocumentsChange: (docs: Document[]) => void;
  maxDocuments?: number;
}

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  work_certificate: 'Attestation de travail',
  pay_slip: 'Fiche de paie',
  bank_statement: 'Relevé bancaire',
  tax_return: "Avis d'imposition",
  employment_contract: 'Contrat de travail',
  business_license: 'Registre commerce',
  student_card: 'Carte étudiant',
  pension_proof: 'Justificatif retraite',
  other: 'Autre document',
};

export default function DocumentUpload({
  userId,
  documents,
  onDocumentsChange,
  maxDocuments = 10,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('work_certificate');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (documents.length >= maxDocuments) {
      toast.error(`Maximum ${maxDocuments} documents autorisés`);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format autorisé: JPG, PNG, WEBP ou PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Taille max: 10 Mo');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${selectedType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('property-documents').getPublicUrl(fileName);

      const { data: newDoc, error: dbError } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          document_type: selectedType,
          document_name: file.name,
          document_url: urlData.publicUrl,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      onDocumentsChange([...documents, newDoc as Document]);
      toast.success('Document téléchargé');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const { error } = await supabase.from('user_documents').delete().eq('id', docId);

      if (error) throw error;

      onDocumentsChange(documents.filter((d) => d.id !== docId));
      toast.success('Document supprimé');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(DOCUMENT_LABELS).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type as DocumentType)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              selectedType === type
                ? 'bg-[#F16522] text-white'
                : 'bg-white text-[#6B5A4E] border border-[#EFEBE9] hover:border-[#F16522]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <label className="block cursor-pointer">
        <div
          className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-all
          ${uploading ? 'border-[#F16522] bg-[#F16522]/5' : 'border-[#EFEBE9] hover:border-[#F16522] hover:bg-[#FAF7F4]'}
        `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
              <span className="text-sm text-[#6B5A4E]">Téléchargement...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-[#A69B95]" />
              <span className="text-sm font-medium text-[#2C1810]">
                Cliquez pour ajouter un {DOCUMENT_LABELS[selectedType].toLowerCase()}
              </span>
              <span className="text-xs text-[#A69B95]">JPG, PNG, PDF • Max 10 Mo</span>
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* Documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase text-[#A69B95] tracking-widest">
            Documents téléchargés ({documents.length}/{maxDocuments})
          </h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#EFEBE9]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      doc.verified ? 'bg-green-100' : 'bg-[#FAF7F4]'
                    }`}
                  >
                    {doc.verified ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#A69B95]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C1810]">
                      {DOCUMENT_LABELS[doc.document_type]}
                    </p>
                    <p className="text-xs text-[#A69B95]">{doc.document_name || 'Document'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.verified && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      Vérifié
                    </span>
                  )}
                  {!doc.verified && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-blue-700 text-xs">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Les justificatifs permettent d'augmenter votre score de confiance et vos chances d'obtenir
          un logement.
        </p>
      </div>
    </div>
  );
}
