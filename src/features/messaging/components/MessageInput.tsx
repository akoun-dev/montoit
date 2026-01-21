import { useState, useRef, FormEvent, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip, Mic, Image as ImageIcon, FileText } from 'lucide-react';
import { Attachment } from '../services/messaging.service';
import { AttachmentPreview } from './AttachmentPreview';

interface MessageInputProps {
  onSend: (content: string, attachment?: Attachment | null) => Promise<void>;
  disabled?: boolean;
  sending?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function MessageInput({ onSend, disabled, sending }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<'image' | 'document'>('image');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('Le fichier est trop volumineux. Taille maximum: 10 MB');
      return;
    }

    const isImage = file.type.startsWith('image/');
    setFileType(isImage ? 'image' : 'document');
    setSelectedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    setShowAttachMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const openFilePicker = (type: 'image' | 'document') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === 'image' ? ACCEPTED_IMAGE_TYPES.join(',') : ACCEPTED_DOC_TYPES.join(',');
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedFile) || disabled || sending) return;

    let attachment: Attachment | null = null;
    if (selectedFile) {
      attachment = {
        url: previewUrl || '',
        type: fileType,
        name: selectedFile.name,
        size: selectedFile.size,
        file: selectedFile,
      } as Attachment & { file: File };
    }

    await onSend(content, attachment);
    setContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasContent = content.trim().length > 0 || selectedFile !== null;

  return (
    <div className="bg-white border-t border-[#EFEBE9]">
      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-3 border-b border-[#EFEBE9]">
          <AttachmentPreview
            url={previewUrl || ''}
            type={fileType}
            name={selectedFile.name}
            size={selectedFile.size}
            onRemove={handleRemoveFile}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

        <div className="flex items-end gap-3 bg-[#FAF7F4] p-2 rounded-[20px] border border-[#EFEBE9] focus-within:border-[#F16522]/30 focus-within:ring-4 focus-within:ring-[#F16522]/5 transition-all">
          {/* Emoji button */}
          <button
            type="button"
            className="p-3 hover:bg-white rounded-full transition-colors text-[#A69B95] hover:text-[#6B5A4E]"
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* Attachment button with menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-3 hover:bg-white rounded-full transition-colors text-[#A69B95] hover:text-[#6B5A4E]"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Attachment menu */}
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-[#EFEBE9] overflow-hidden">
                <button
                  type="button"
                  onClick={() => openFilePicker('image')}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F4] w-full text-left"
                >
                  <div className="w-10 h-10 bg-[#F16522]/10 rounded-full flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-[#F16522]" />
                  </div>
                  <span className="text-[#2C1810] text-sm font-medium">Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFilePicker('document')}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F4] w-full text-left"
                >
                  <div className="w-10 h-10 bg-[#2C1810]/10 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[#2C1810]" />
                  </div>
                  <span className="text-[#2C1810] text-sm font-medium">Documents</span>
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? 'Ajouter un commentaire...' : 'Écrivez votre message...'}
              disabled={disabled || sending}
              rows={1}
              className="w-full px-2 py-3 bg-transparent text-sm text-[#2C1810] placeholder-[#A69B95] focus:outline-none resize-none max-h-32 font-medium"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Send or Mic button */}
          {hasContent ? (
            <button
              type="submit"
              disabled={!hasContent || disabled || sending}
              className="p-3 bg-[#F16522] hover:bg-[#D95318] rounded-full transition-all shadow-md shadow-[#F16522]/20 disabled:opacity-50 hover:scale-105"
            >
              <Send className={`h-5 w-5 text-white ${sending ? 'animate-pulse' : ''}`} />
            </button>
          ) : (
            <button
              type="button"
              className="p-3 hover:bg-white rounded-full transition-colors text-[#A69B95] hover:text-[#6B5A4E]"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
