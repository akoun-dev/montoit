import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import Button from './Button';
import { toast } from '@/hooks/shared/useToast';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
}

export default function SocialShare({
  url,
  title,
  description,
  image: _image,
  hashtags = [],
}: SocialShareProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const hashtagString = hashtags.map((tag) => tag.replace('#', '')).join(',');

  const shareLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${hashtagString ? `&hashtags=${hashtagString}` : ''}`,
      color: 'bg-sky-500 hover:bg-sky-600',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'bg-blue-700 hover:bg-blue-800',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: 'bg-green-600 hover:bg-green-700',
    },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        });
        toast.success('Partagé avec succès!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Lien copié!', {
        description: 'Le lien a été copié dans le presse-papier',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleSocialClick = (socialUrl: string) => {
    window.open(socialUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={handleNativeShare}
        variant="outline"
        size="medium"
        className="flex items-center space-x-2"
      >
        <Share2 className="h-5 w-5" />
        <span>Partager</span>
      </Button>

      {showMenu && !navigator.share && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-3 z-50 animate-scale-in">
          {/* Social Links */}
          <div className="px-3 space-y-2 mb-3">
            {shareLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.name}
                  onClick={() => handleSocialClick(link.url)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 ${link.color} text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{link.name}</span>
                </button>
              );
            })}
          </div>

          {/* Copy Link */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 px-3">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Link2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  {copied ? 'Copié!' : 'Copier le lien'}
                </span>
              </div>
            </button>
          </div>

          {/* Close button */}
          <div className="px-3 mt-2">
            <button
              onClick={() => setShowMenu(false)}
              className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Version compacte
export function CompactSocialShare({ url, title }: { url: string; title: string }) {
  const handleShare = async () => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          await navigator.clipboard.writeText(fullUrl);
          toast.success('Lien copié!');
        }
      }
    } else {
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Lien copié!');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      aria-label="Partager"
    >
      <Share2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    </button>
  );
}
