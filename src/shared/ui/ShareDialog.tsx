/**
 * Composant de dialogue de partage
 *
 * Permet de partager une propriété via WhatsApp, copier le lien,
 * ou utiliser d'autres méthodes de partage natives.
 */

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // URL encodée pour les liens de partage
  const encodedUrl = encodeURIComponent(propertyUrl);
  const encodedTitle = encodeURIComponent(propertyTitle);
  const shareMessage = `Découvrez cette propriété sur MonToit`;

  const runShareAction = async (action: () => void | Promise<void>, closeAfter = true) => {
    await action();

    if (closeAfter) {
      onClose();
    }
  };

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
        window.location.href = `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${shareMessage} : ${propertyUrl}`)}`;
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
          text: shareMessage,
          url: propertyUrl,
          // @ts-expect-error - L'API files est disponible sur certains navigateurs
          files: [file],
        });
      } catch {
        // Fallback vers le partage sans fichier
        try {
          await navigator.share({
            title: propertyTitle,
            text: shareMessage,
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
        text: shareMessage,
        url: propertyUrl,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl animate-in zoom-in-95 fade-in max-h-[calc(100vh-1.5rem)] sm:max-h-[min(720px,calc(100vh-3rem))]">
        <div className="max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:max-h-[min(720px,calc(100vh-3rem))]">
          <div className="border-b border-[#EFEBE9] bg-gradient-to-br from-[#FAF7F4] via-white to-[#F7F1EC] px-5 pb-5 pt-4 sm:px-6 sm:pt-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F16522]/10">
                  <Share2 className="h-5 w-5 text-[#F16522]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2C1810] sm:text-xl">
                    Partager cette propriété
                  </h3>
                  <p className="text-sm text-[#6B5A4E]">
                    Envoyez le lien rapidement à vos proches
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2C1810] shadow-sm transition-colors hover:bg-[#EFEBE9]"
                aria-label="Fermer"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#EFEBE9] bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-start gap-3">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F4] sm:h-24 sm:w-24">
                  {propertyImage ? (
                    <img
                      src={propertyImage}
                      alt={propertyTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F16522]/10">
                      <Share2 className="h-6 w-6 text-[#F16522]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A69B95]">
                    Lien partage
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[#2C1810] sm:text-base">
                    {propertyTitle}
                  </p>
                  <div className="mt-3 rounded-xl bg-[#FAF7F4] px-3 py-2">
                    <p className="break-all text-xs leading-5 text-[#6B5A4E]">
                      {propertyUrl}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            {navigator.share && (
              <button
                onClick={handleNativeShare}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2C1810] px-4 py-4 font-medium text-white transition-colors hover:bg-[#3D2518]"
                type="button"
              >
                <Share2 className="h-5 w-5" />
                Partager via votre appareil
              </button>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shareOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => void runShareAction(option.action, option.id !== 'copy')}
                  className={`flex items-center justify-center gap-2 rounded-2xl p-4 font-medium transition-colors ${option.color}`}
                  type="button"
                >
                  {option.icon}
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[#6B5A4E]">
              Partagez cette annonce avec les personnes qui pourraient etre interessees.
            </p>
          </div>
        </div>
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
