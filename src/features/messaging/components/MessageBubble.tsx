import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, CheckCheck, FileText, Download, MoreHorizontal, Pencil, Trash2, X, Check as CheckIcon } from 'lucide-react';
import { Message } from '../services/messaging.service';
import { ImageLightbox } from './ImageLightbox';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  currentUserId?: string;
}

const EDIT_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (name: string): string => {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
};

export function MessageBubble({ message, isOwn, onEdit, onDelete, currentUserId }: MessageBubbleProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || '');
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = isOwn && onEdit && Date.now() - new Date(message.created_at).getTime() < EDIT_TIME_WINDOW_MS;
  const canDelete = isOwn && onDelete;

  const hasAttachment = message.attachment_url && message.attachment_type;
  const isImage = message.attachment_type === 'image';

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedContent, isEditing]);

  const handleDownload = () => {
    if (!message.attachment_url || !message.attachment_name) return;
    const link = document.createElement('a');
    link.href = message.attachment_url;
    link.download = message.attachment_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = async () => {
    if (onEdit && editedContent.trim() !== message.content) {
      await onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(message.content || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Supprimer ce message ?')) {
      if (onDelete) {
        await onDelete(message.id);
      }
    }
    setShowMenu(false);
  };

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
        {/* Bubble Premium Ivorian */}
        <div
          className={`relative max-w-[85%] md:max-w-[65%] shadow-sm ${
            hasAttachment ? 'p-1.5' : 'px-4 py-3'
          } ${
            isOwn
              ? 'bg-[#F16522] text-white rounded-2xl rounded-tr-md'
              : 'bg-white text-[#2C1810] rounded-2xl rounded-tl-md border border-[#EFEBE9]'
          }`}
        >
          {/* Attachment */}
          {hasAttachment && (
            <div className="mb-1">
              {isImage ? (
                <img
                  src={message.attachment_url!}
                  alt={message.attachment_name || 'Image'}
                  className="max-w-[280px] max-h-[300px] rounded-xl cursor-pointer object-cover"
                  onClick={() => setShowLightbox(true)}
                />
              ) : (
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                    isOwn ? 'bg-[#D95318]' : 'bg-[#FAF7F4]'
                  }`}
                  onClick={handleDownload}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isOwn ? 'bg-white/20' : 'bg-[#F16522]/10'
                    }`}
                  >
                    <FileText className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-[#F16522]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.attachment_name}</p>
                    <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-[#A69B95]'}`}>
                      {getFileExtension(message.attachment_name || '')} •{' '}
                      {formatFileSize(message.attachment_size || 0)}
                    </p>
                  </div>
                  <Download className={`h-5 w-5 ${isOwn ? 'text-white/70' : 'text-[#A69B95]'}`} />
                </div>
              )}
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <>
              {isEditing ? (
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full px-2 py-1 bg-white/20 text-white placeholder-white/50 rounded-lg text-sm resize-none"
                    rows={1}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                      if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveEdit}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="Sauvegarder (Entrée)"
                    >
                      <CheckIcon className="h-3.5 w-3.5 text-white" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="Annuler (Échap)"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${hasAttachment ? 'px-2 pt-1' : ''}`}
                >
                  {message.content}
                </p>
              )}
            </>
          )}

          {/* Time and read status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 ${hasAttachment ? 'px-2 pb-1' : ''}`}
          >
            {message.updated_at && message.updated_at !== message.created_at && !isEditing && (
              <span className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-[#A69B95]/50'}`}>
                Modifié
              </span>
            )}
            <span className={`text-[11px] ${isOwn ? 'text-white/70' : 'text-[#A69B95]'}`}>
              {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
            </span>
            {isOwn &&
              (message.is_read ? (
                <CheckCheck className="h-4 w-4 text-[#34B7F1]" />
              ) : (
                <Check className="h-4 w-4 text-white/70" />
              ))}
          </div>
        </div>

        {/* Action menu button (visible on hover for own messages) */}
        {isOwn && (canEdit || canDelete) && !isEditing && (
          <div className="relative ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-[#FAF7F4] rounded-full transition-colors"
            >
              <MoreHorizontal className="h-4 w-4 text-[#6B5A4E]" />
            </button>

            {showMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-lg border border-[#EFEBE9] overflow-hidden min-w-[140px]">
                {canEdit && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FAF7F4] w-full text-left text-sm text-[#2C1810]"
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 w-full text-left text-sm text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {showLightbox && message.attachment_url && (
        <ImageLightbox
          url={message.attachment_url}
          name={message.attachment_name || 'Image'}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
