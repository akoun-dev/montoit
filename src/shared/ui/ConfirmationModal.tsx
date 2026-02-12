import { X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'info' | 'success';
  details?: string[];
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning',
  details,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      button: 'bg-orange-500 hover:bg-orange-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      button: 'bg-green-500 hover:bg-green-600',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    console.log('[ConfirmationModal] Confirmation clicked', {
      title,
      message,
      timestamp: new Date().toISOString(),
    });
    onConfirm();
  };

  const handleCancel = () => {
    console.log('[ConfirmationModal] Cancelled', {
      title,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-xl ${styles.bg} border ${styles.border}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
          <h3 className={`font-bold text-lg ${styles.icon}`}>{title}</h3>
          <button onClick={handleCancel} className="p-1 hover:bg-black/5 rounded-lg transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-gray-700 mb-3">{message}</p>

          {details && details.length > 0 && (
            <div className="mt-3 p-3 bg-white/60 rounded-xl border border-gray-200/50">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                À compléter (avec l&apos;importance) :
              </p>
              <ul className="space-y-3">
                {details.map((detail, index) => {
                  let title = detail;
                  let description = '';
                  const separators = [' — ', ' - ', ' : '];
                  for (const sep of separators) {
                    if (detail.includes(sep)) {
                      const parts = detail.split(sep);
                      title = parts[0] || detail;
                      description = parts.slice(1).join(sep).trim();
                      break;
                    }
                  }
                  const normalizedTitle = title.toLowerCase();
                  if (!description) {
                    if (normalizedTitle.includes('oneci')) {
                      description = 'Vérifie votre identité et sécurise votre dossier.';
                    } else if (
                      normalizedTitle.includes('neoface') ||
                      normalizedTitle.includes('faciale') ||
                      normalizedTitle.includes('reconnaissance')
                    ) {
                      description = 'Selfie + CNI pour rassurer le propriétaire.';
                    } else if (normalizedTitle.includes('dossier')) {
                      description = 'Obligatoire pour pouvoir valider votre candidature';
                    } else if (normalizedTitle.includes('profil')) {
                      description = 'Indispensable pour être contacté rapidement.';
                    }
                  }

                  return (
                    <li key={index} className="flex gap-2 text-xs text-gray-600">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
                      <div>
                        <span className="font-semibold text-gray-700">{title}</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          {description || 'Raison importante pour votre candidature.'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-200/50">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white ${styles.button} transition`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
