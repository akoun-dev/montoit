/**
 * Composant pour afficher la progression de verification d'un dossier
 *
 * Affiche la progression par section et permet de voir les détails.
 */

import { CheckCircle2, Clock, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { DocumentVerificationStatus } from '@/features/verification/services/verificationApplications.service';

export interface VerificationSection {
  id: string;
  label: string;
  description?: string;
  progress: number; // 0-100
  documents: Array<{
    id: string;
    name: string;
    status: DocumentVerificationStatus;
  }>;
}

export interface VerificationProgressCardProps {
  sections: VerificationSection[];
  overallProgress: number;
  onSectionClick?: (sectionId: string) => void;
  onDocumentClick?: (sectionId: string, documentId: string) => void;
  loading?: boolean;
}

export function VerificationProgressCard({
  sections,
  overallProgress,
  onSectionClick,
  onDocumentClick,
  loading = false,
}: VerificationProgressCardProps) {
  const getSectionStatus = (progress: number, documents: VerificationSection['documents']) => {
    if (documents.length === 0) return 'empty';
    if (progress === 100) return 'complete';
    if (progress > 0) return 'in_progress';
    return 'pending';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'complete':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
        };
      case 'in_progress':
        return {
          icon: Clock,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
        };
      case 'pending':
        return {
          icon: Clock,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          borderColor: 'border-gray-200',
        };
      default:
        return {
          icon: AlertCircle,
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Overall Progress Header */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Progression du dossier</h3>
          <span className="text-2xl font-bold text-primary-600">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-200">
        {sections.map((section) => {
          const status = getSectionStatus(section.progress, section.documents);
          const statusConfig = getStatusConfig(status);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={section.id}
              onClick={() => onSectionClick?.(section.id)}
              className={cn(
                'px-6 py-4 transition-colors',
                onSectionClick && 'cursor-pointer hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', statusConfig.bgColor)}>
                    <StatusIcon className={cn('w-5 h-5', statusConfig.textColor)} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{section.label}</h4>
                    {section.description && (
                      <p className="text-sm text-gray-500">{section.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-sm font-semibold', statusConfig.textColor)}>
                    {section.progress}%
                  </span>
                  {onSectionClick && (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Section Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    status === 'complete'
                      ? 'bg-green-500'
                      : status === 'in_progress'
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                  )}
                  style={{ width: `${section.progress}%` }}
                />
              </div>

              {/* Documents List */}
              {section.documents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {section.documents.map((doc) => {
                    const docStatusConfig = getStatusConfig(doc.status);
                    const DocStatusIcon = docStatusConfig.icon;

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDocumentClick?.(section.id, doc.id);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          docStatusConfig.borderColor,
                          docStatusConfig.bgColor,
                          docStatusConfig.textColor,
                          onDocumentClick && 'hover:opacity-80'
                        )}
                      >
                        <DocStatusIcon className="w-3.5 h-3.5" />
                        <span className="max-w-[150px] truncate">{doc.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty State for Section */}
              {section.documents.length === 0 && status === 'empty' && (
                <div className="text-sm text-gray-400 italic">
                  Aucun document requis pour cette section
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="px-6 py-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune section de verification définie</p>
        </div>
      )}
    </div>
  );
}

export default VerificationProgressCard;
