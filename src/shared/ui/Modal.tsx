import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { Key, Home, Building2, ArrowDown } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />

        <div
          className={`relative w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>
          )}

          <div className="p-6">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-700">{message}</p>
    </Modal>
  );
}

/**
 * Modal de confirmation pour le switch de rôle
 */
export interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromRole: string;
  toRole: string;
  loading?: boolean;
}

export function RoleSwitchModal({
  isOpen,
  onClose,
  onConfirm,
  fromRole,
  toRole,
  loading = false,
}: RoleSwitchModalProps) {
  const roleConfig: Record<string, { label: string; icon: any; color: string; description: string }> = {
    locataire: {
      label: 'Locataire',
      icon: Key,
      color: 'blue',
      description: 'Vous pourrez rechercher des biens, postuler des candidatures, gérer vos contrats de location et vos paiements.',
    },
    proprietaire: {
      label: 'Propriétaire',
      icon: Home,
      color: 'orange',
      description: 'Vous pourrez gérer vos biens immobiliers, publier des annonces, gérer les contrats et les locataires.',
    },
    agence: {
      label: 'Agence',
      icon: Building2,
      color: 'purple',
      description: 'Vous pourrez gérer les biens de vos clients, gérer les mandats et les contrats au nom des propriétaires.',
    },
  };

  const from = roleConfig[fromRole] || roleConfig.proprietaire;
  const to = roleConfig[toRole] || roleConfig.locataire;
  const FromIcon = from.icon;
  const ToIcon = to.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Changer de rôle"
      size="md"
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={loading}>
            Confirmer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Message informatif */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-900 font-medium mb-1">
            Vous êtes sur le point de changer de rôle
          </p>
          <p className="text-blue-700 text-sm">
            Ce changement modifiera votre interface et vos accès fonctionnels.
          </p>
        </div>

        {/* Rôle actuel */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className={`p-3 rounded-xl bg-${from.color}-100 text-${from.color}-600`}>
            <FromIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Rôle actuel</p>
            <p className="text-lg font-semibold text-gray-900">{from.label}</p>
          </div>
        </div>

        {/* Flèche */}
        <div className="flex justify-center">
          <div className={`w-12 h-12 rounded-full bg-${to.color}-100 flex items-center justify-center`}>
            <ArrowDown className={`w-6 h-6 text-${to.color}-600`} />
          </div>
        </div>

        {/* Nouveau rôle */}
        <div className={`flex items-center gap-4 p-4 bg-${to.color}-50 border-2 border-${to.color}-200 rounded-xl`}>
          <div className={`p-3 rounded-xl bg-${to.color}-100 text-${to.color}-600`}>
            <ToIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Nouveau rôle</p>
            <p className={`text-lg font-semibold text-${to.color}-700`}>{to.label}</p>
          </div>
        </div>

        {/* Description du nouveau rôle */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700">{to.description}</p>
        </div>

        {/* Note importante */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11.13 22H7.072c-.91 0-1.734.49-2.004 1.225l-5.19 9.92c-.387.739.297 1.682 1.558 1.918 4.036.266 2.223.565 4.436.357 6.294.208 1.784.377 3.07.13 3.56l.008.004c.365.17.855.265 1.275.306V20c0 .455.37.825.825.825h1.5c.455 0 .825-.37.825-.825v-6.75c.372-.065.716-.256.992-.568l.012-.007c.327-.325.658-.66.996-1.004l.007-.005c.333-.335.665-.674.995-1.019.317-.328.646-.659.968-.993.005-.005.008-.01.013-.016l.011-.011c.333-.335.658-.67.976-1.004.316-.329.639-.66.953-.993 0-.004-.007-.008-.011-.012l-.007-.005c-.317-.329-.636-.654-.95-.983-.004-.004-.008-.008-.012-.012-.324-.329-.648-.658-.967-.991l.006-.006c-.318-.331-.636-.664-.95-.991l-.005-.006c-.316-.329-.63-.658-.935-.985-.003-.003-.006-.006-.009-.009-.316-.33-.622-.656-.937-.983l-.011-.011c-.319-.33-.636-.662-.951-.991l-.007-.007c-.316-.329-.63-.658-.944-.985l-.014-.014c-.315-.327-.626-.657-.935-.991l-.012-.013c-.311-.33-.618-.663-.923-.991l-.007-.008c-.314-.327-.627-.653-.937-.987l-.003-.003c-.315-.33-.629-.66-.941-.991-.003-.004-.006-.007-.009-.011l-.015-.016c-.312-.33-.625-.66-.935-.991l-.016-.017c-.307-.337-.619-.673-.927-.991l.002-.002.003-.003.004-.004.005-.006.006-.007.006-.009.009-.011.011c.32-.326.639-.654.954-.985.002-.002.003-.003.004-.005.006-.007.006-.009.006-.011.011-.012l.015-.016c.319-.33.637-.66.954-.985zm.005 6.5h1.5c.455 0 .825-.37.825-.825v-6.25h-1.5v6.25z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-700">
            <span className="font-medium">Note :</span> Vous pourrez revenir à votre rôle actuel à tout moment depuis votre profil.
          </p>
        </div>
      </div>
    </Modal>
  );
}
