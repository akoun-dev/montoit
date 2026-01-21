import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { Message } from '../services/messaging.service';
import { ImageLightbox } from './ImageLightbox';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (name: string): string => {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
};

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [showLightbox, setShowLightbox] = useState(false);

  const hasAttachment = message.attachment_url && message.attachment_type;
  const isImage = message.attachment_type === 'image';

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

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
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
            <p
              className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${hasAttachment ? 'px-2 pt-1' : ''}`}
            >
              {message.content}
            </p>
          )}

          {/* Time and read status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 ${hasAttachment ? 'px-2 pb-1' : ''}`}
          >
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
