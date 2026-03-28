/**
 * ReportButton Component
 *
 * Reusable button to trigger report modal for any entity type
 */

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ReportModal from './ReportModal';
import { hasReported, type ReportType } from '@/services/reports/reportService';

interface ReportButtonProps {
  entityType: ReportType;
  entityId: string;
  entityTitle?: string;
  variant?: 'button' | 'menu';
  onSuccess?: () => void;
  className?: string;
}

export default function ReportButton({
  entityType,
  entityId,
  entityTitle,
  variant = 'button',
  onSuccess,
  className = '',
}: ReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if user has already reported this entity
  const { data: hasAlreadyReported } = useQuery({
    queryKey: ['hasReported', entityType, entityId],
    queryFn: () => hasReported(entityType, entityId),
    enabled: isModalOpen, // Only check when modal opens
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    onSuccess?.();
    // Invalidate queries to refresh hasReported status
    setTimeout(() => {
      window.location.reload(); // Simple refresh to update UI
    }, 2000);
  };

  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={handleOpenModal}
          className={`w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 ${className}`}
        >
          <Flag className="w-4 h-4" />
          {hasAlreadyReported ? 'Signalement envoyé' : 'Signaler'}
        </button>

        <ReportModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          entityType={entityType}
          entityId={entityId}
          entityTitle={entityTitle}
          onSuccess={handleSuccess}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={hasAlreadyReported}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          hasAlreadyReported
            ? 'bg-neutral-100 text-neutral-400 cursor-default'
            : 'text-red-600 hover:bg-red-50'
        } ${className}`}
        title={hasAlreadyReported ? 'Vous avez déjà signalé ce contenu' : 'Signaler ce contenu'}
      >
        <Flag className="w-4 h-4" />
        {hasAlreadyReported ? 'Signalé' : 'Signaler'}
      </button>

      <ReportModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        entityType={entityType}
        entityId={entityId}
        entityTitle={entityTitle}
        onSuccess={handleSuccess}
      />
    </>
  );
}

/**
 * ReportMenuItem - For dropdown menus
 */
export function ReportMenuItem(props: Omit<ReportButtonProps, 'variant'>) {
  return <ReportButton {...props} variant="menu" />;
}
