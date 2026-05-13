import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { Key, Home, Building2, ArrowRight } from 'lucide-react';

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
          className={`relative w-full ${sizeClasses[size]} mx-auto bg-white rounded-xl shadow-xl transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              {title && <h2 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h2>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>
          )}

          <div className="p-4 md:p-6">{children}</div>

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

const roleGradients: Record<string, string> = {
  tenant: 'from-cyan-500 to-blue-500',
  owner: 'from-terracotta-500 to-coral-500',
  agency: 'from-violet-500 to-purple-500',
};

const roleLabels: Record<string, string> = {
  tenant: 'Locataire',
  owner: 'Propriétaire',
  agency: 'Agence',
};

const roleIcons = { Key, Home, Building2 };

export function RoleSwitchModal({
  isOpen,
  onClose,
  onConfirm,
  fromRole,
  toRole,
  loading = false,
}: RoleSwitchModalProps) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    tenant: Key,
    owner: Home,
    agency: Building2,
  };
  const FromIcon = iconMap[fromRole] || Key;
  const ToIcon = iconMap[toRole] || Home;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
    >
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-100 flex items-center justify-center ring-2 ring-neutral-200">
                <FromIcon className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-600" />
              </div>
              <span className="text-xs font-medium text-neutral-500">{roleLabels[fromRole] || fromRole}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary-500" />
              </div>
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">vers</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${roleGradients[toRole] || 'from-primary-500 to-primary-600'} flex items-center justify-center shadow-lg shadow-primary-500/20`}>
                <ToIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-primary-600">{roleLabels[toRole] || toRole}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-neutral-600 leading-relaxed max-w-xs mx-auto">
          Vous allez basculer vers le profil <strong>{roleLabels[toRole] || toRole}</strong>. Vous pourrez revenir à tout moment.
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="w-full sm:flex-1 px-4 py-3 rounded-xl font-semibold text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full sm:flex-1 px-4 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Changement...' : 'Confirmer le changement'}
        </button>
      </div>
    </Modal>
  );
}
