import { X, FileText, Download } from 'lucide-react';

interface AttachmentPreviewProps {
  url: string;
  type: 'image' | 'document';
  name: string;
  size: number;
  onRemove?: () => void;
  onClick?: () => void;
  isUploading?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (name: string): string => {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
};

export function AttachmentPreview({
  url,
  type,
  name,
  size,
  onRemove,
  onClick,
  isUploading,
}: AttachmentPreviewProps) {
  if (type === 'image') {
    return (
      <div className="relative group">
        <div
          className={`relative rounded-lg overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${
            isUploading ? 'opacity-50' : ''
          }`}
          onClick={onClick}
        >
          <img
            src={url}
            alt={name}
            className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Document preview
  return (
    <div
      className={`relative flex items-center gap-3 p-3 bg-[#F0F2F5] rounded-lg ${
        onClick ? 'cursor-pointer hover:bg-[#E4E6EB]' : ''
      } ${isUploading ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-[#00A884] rounded-lg flex items-center justify-center">
        <FileText className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111B21] truncate">{name}</p>
        <p className="text-xs text-[#8696A0]">
          {getFileExtension(name)} • {formatFileSize(size)}
        </p>
      </div>
      {onClick && !onRemove && <Download className="h-5 w-5 text-[#8696A0]" />}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 hover:bg-[#D1D5DB] rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-[#8696A0]" />
        </button>
      )}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
          <div className="w-6 h-6 border-2 border-[#00A884] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
