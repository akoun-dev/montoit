/**
 * ElectronicSignatureButton - Button component that triggers the electronic signature modal
 *
 * This is a convenient wrapper that combines the button and modal into one component.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { ElectronicSignatureModal, SignatureDocument } from './ElectronicSignatureModal';
import { Shield, PenTool } from 'lucide-react';

interface ElectronicSignatureButtonProps {
  documents: SignatureDocument[];
  contractId: string;
  onSuccess?: (signedDocumentUrls: string[]) => void;
  onError?: (error: string) => void;
  buttonLabel?: string;
  buttonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  buttonSize?: 'small' | 'medium' | 'large';
  buttonClassName?: string;
  icon?: 'shield' | 'pen' | 'none';
  disabled?: boolean;
  loading?: boolean;
}

export function ElectronicSignatureButton({
  documents,
  contractId,
  onSuccess,
  onError,
  buttonLabel = 'Signer électroniquement',
  buttonVariant = 'primary',
  buttonSize = 'medium',
  buttonClassName = '',
  icon = 'shield',
  disabled = false,
  loading = false,
}: ElectronicSignatureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const Icon = icon === 'shield' ? Shield : icon === 'pen' ? PenTool : undefined;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={buttonVariant}
        size={buttonSize}
        disabled={disabled || loading}
        className={buttonClassName}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Chargement...
          </>
        ) : (
          <>
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {buttonLabel}
          </>
        )}
      </Button>

      <ElectronicSignatureModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        documents={documents}
        contractId={contractId}
        onSuccess={onSuccess}
        onError={onError}
      />
    </>
  );
}

export default ElectronicSignatureButton;
