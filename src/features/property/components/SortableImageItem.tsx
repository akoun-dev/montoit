import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Star, X, ZoomIn, GripVertical } from 'lucide-react';

interface SortableImageItemProps {
  id: string;
  file: File;
  previewUrl: string;
  index: number;
  isMainImage: boolean;
  onRemove: (index: number) => void;
  onSetMain: (index: number) => void;
  onZoom: (index: number) => void;
  disabled?: boolean;
}

const SortableImageItem: React.FC<SortableImageItemProps> = memo(
  ({ id, file, previewUrl, index, isMainImage, onRemove, onSetMain, onZoom, disabled = false }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
      useSortable({
        id,
        disabled,
      });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition ?? 'transform 200ms ease',
      zIndex: isDragging ? 50 : 'auto',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
        relative group rounded-xl overflow-hidden bg-background border-2 transition-all duration-200
        ${
          isMainImage
            ? 'border-amber-400 ring-2 ring-amber-200 shadow-lg'
            : 'border-border hover:border-primary/50'
        }
        ${isDragging ? 'opacity-50 scale-105 shadow-2xl' : ''}
        ${isOver && !isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      >
        {/* Image */}
        <div className="aspect-square relative overflow-hidden">
          <img
            src={previewUrl}
            alt={`Photo ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Badge de position */}
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm text-foreground px-2 py-1 rounded-full text-xs font-medium shadow-sm">
            {index + 1}
          </div>

          {/* Indicateur image principale avec effet brillance */}
          {isMainImage && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center shadow-lg animate-pulse">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Principale
            </div>
          )}

          {/* Handle de drag */}
          {!disabled && (
            <div
              {...attributes}
              {...listeners}
              className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-background"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {/* Overlay avec boutons d'action */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              {/* Zoom */}
              <button
                type="button"
                onClick={() => onZoom(index)}
                className="bg-white/90 backdrop-blur-sm text-foreground p-2.5 rounded-full hover:bg-white shadow-lg transition-all hover:scale-110"
                title="Agrandir"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Définir comme principale */}
              {!isMainImage && (
                <button
                  type="button"
                  onClick={() => onSetMain(index)}
                  disabled={disabled}
                  className="bg-amber-500 text-white p-2.5 rounded-full hover:bg-amber-600 disabled:opacity-50 shadow-lg transition-all hover:scale-110"
                  title="Définir comme image principale"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}

              {/* Supprimer */}
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                className="bg-destructive text-destructive-foreground p-2.5 rounded-full hover:bg-destructive/90 disabled:opacity-50 shadow-lg transition-all hover:scale-110"
                title="Supprimer cette image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Informations */}
        <div className="p-2.5 bg-background border-t border-border">
          <div className="text-xs text-foreground font-medium truncate">{file.name}</div>
          <div className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </div>
        </div>

        {/* Indicateur de drop zone */}
        {isOver && !isDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/10 rounded-xl pointer-events-none" />
        )}
      </div>
    );
  }
);

SortableImageItem.displayName = 'SortableImageItem';

export default SortableImageItem;
