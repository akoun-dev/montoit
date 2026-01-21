import { useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSizeMB?: number;
  preview?: string | null;
  onChange: (file: File | null) => void;
  onPreviewChange: (preview: string | null) => void;
}

export default function FileUpload({
  label,
  accept = 'image/*,application/pdf',
  maxSizeMB = 5,
  preview,
  onChange,
  onPreviewChange,
}: FileUploadProps) {
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier ne doit pas dépasser ${maxSizeMB} MB`);
      return;
    }

    onChange(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      onPreviewChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);
    onPreviewChange(null);
    setError('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {!preview ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-terracotta-400 transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${label}`}
          />
          <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Cliquez pour télécharger</p>
            <p className="text-sm text-gray-500">ou glissez-déposez</p>
            <p className="text-xs text-gray-400 mt-2">Max {maxSizeMB} MB</p>
          </label>
        </div>
      ) : (
        <div className="relative border-2 border-gray-300 rounded-xl p-4">
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
          >
            <X className="w-4 h-4" />
          </button>
          {preview.startsWith('data:image') ? (
            <img src={preview} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
          ) : (
            <div className="flex items-center space-x-3 text-gray-700">
              <FileText className="w-8 h-8" />
              <span className="text-sm">Document téléchargé</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
