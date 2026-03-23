/**
 * Composant de dialogue de partage
 *
 * Permet de partager une propriété via WhatsApp, copier le lien,
 * ou utiliser d'autres méthodes de partage natives.
 */

import { useState } from 'react';
import {
  Share2,
  X,
  MessageCircle,
  Mail,
  Facebook,
  Check,
  Copy,
} from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyUrl: string;
  propertyImage?: string;
}

interface ShareOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  color: string;
}

export function ShareDialog({
  isOpen,
  onClose,
  propertyTitle,
  propertyUrl,
  propertyImage,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // URL encodée pour les liens de partage
  const encodedUrl = encodeURIComponent(propertyUrl);
  const encodedTitle = encodeURIComponent(propertyTitle);

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle className="w-5 h-5" />,
      action: () => {
        window.open(
          `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
          '_blank'
        );
      },
      color: 'bg-green-500 hover:bg-green-600 text-white',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: <Facebook className="w-5 h-5" />,
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          '_blank'
        );
      },
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      id: 'email',
      label: 'Email',
      icon: <Mail className="w-5 h-5" />,
      action: () => {
        window.location.href = `mailto:?subject=${encodedTitle}&body=Découvrez cette propriété : ${encodedUrl}`;
      },
      color: 'bg-gray-600 hover:bg-gray-700 text-white',
    },
    {
      id: 'copy',
      label: copied ? 'Copié !' : 'Copier le lien',
      icon: copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />,
      action: async () => {
        try {
          await navigator.clipboard.writeText(propertyUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          console.error('Erreur lors de la copie du lien:', error);
        }
      },
      color: copied ? 'bg-emerald-500 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white',
    },
  ];

  // Partage natif (mobile)
  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') return;

    if (propertyImage) {
      try {
        // Essayer de récupérer l'image pour le partage natif
        const response = await fetch(propertyImage);
        const blob = await response.blob();
        const file = new File([blob], 'property.jpg', { type: blob.type });

        await navigator.share({
          title: propertyTitle,
          text: `Découvrez cette propriété sur MonToit`,
          url: propertyUrl,
          // @ts-expect-error - L'API files est disponible sur certains navigateurs
          files: [file],
        });
      } catch {
        // Fallback vers le partage sans fichier
        try {
          await navigator.share({
            title: propertyTitle,
            text: `Découvrez cette propriété sur MonToit`,
            url: propertyUrl,
          });
        } catch (shareError) {
          console.error('Erreur lors du partage natif:', shareError);
        }
      }
    } else {
      // Sans image
      await navigator.share({
        title: propertyTitle,
        text: `Découvrez cette propriété sur MonToit`,
        url: propertyUrl,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F16522]/10 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-[#F16522]" />
            </div>
            <h3 className="text-xl font-bold text-[#2C1810]">Partager cette propriété</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#FAF7F4] hover:bg-[#EFEBE9] rounded-full flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 text-[#2C1810]" />
          </button>
        </div>

        {/* Property Preview */}
        <div className="flex items-center gap-3 p-3 bg-[#FAF7F4] rounded-xl mb-6">
          {propertyImage && (
            <img
              src={propertyImage}
              alt={propertyTitle}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#2C1810] line-clamp-2">
              {propertyTitle}
            </p>
            <p className="text-xs text-[#6B5A4E] truncate mt-1">{propertyUrl}</p>
          </div>
        </div>

        {/* Native Share Button (if supported) */}
        {navigator.share && (
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 p-4 bg-[#2C1810] hover:bg-[#3D2518] text-white rounded-xl font-medium transition-colors mb-4"
          >
            <Share2 className="w-5 h-5" />
            Partager via...
          </button>
        )}

        {/* Share Options */}
        <div className="grid grid-cols-2 gap-3">
          {shareOptions.map((option) => (
            <button
              key={option.id}
              onClick={option.action}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors ${option.color}`}
            >
              {option.icon}
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-[#6B5A4E] mt-6">
          Partagez cette propriété avec vos proches pour qu'ils puissent la découvrir
        </p>
      </div>
    </div>
  );
}

/**
 * Hook pour ouvrir le dialogue de partage
 */
export function useShareDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [propertyData, setPropertyData] = useState<{
    title: string;
    url: string;
    image?: string;
  } | null>(null);

  const openShareDialog = (title: string, url: string, image?: string) => {
    setPropertyData({ title, url, image });
    setIsOpen(true);
  };

  const closeShareDialog = () => {
    setIsOpen(false);
  };

  const ShareDialogComponent = () => {
    if (!propertyData) return null;
    return (
      <ShareDialog
        isOpen={isOpen}
        onClose={closeShareDialog}
        propertyTitle={propertyData.title}
        propertyUrl={propertyData.url}
        propertyImage={propertyData.image}
      />
    );
  };

  return {
    openShareDialog,
    closeShareDialog,
    ShareDialogComponent,
    isOpen,
  };
}

export default ShareDialog;
