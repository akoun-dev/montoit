import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableImageItem from './SortableImageItem';
import ImageLightbox from './ImageLightbox';

interface DraggableImageGridProps {
  images: File[];
  previewUrls: string[];
  mainImageIndex: number;
  onImagesReorder: (fromIndex: number, toIndex: number) => void;
  onImageRemove: (index: number) => void;
  onMainImageSet: (index: number) => void;
  disabled?: boolean;
}

const DraggableImageGrid: React.FC<DraggableImageGridProps> = ({
  images,
  previewUrls,
  mainImageIndex,
  onImagesReorder,
  onImageRemove,
  onMainImageSet,
  disabled = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Générer des IDs stables pour chaque image
  const imageIds = useMemo(() => images.map((_, index) => `image-${index}`), [images.length]);

  // Configurer les sensors pour le drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de mouvement minimum avant d'activer le drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = imageIds.indexOf(active.id as string);
        const newIndex = imageIds.indexOf(over.id as string);

        if (oldIndex !== -1 && newIndex !== -1) {
          onImagesReorder(oldIndex, newIndex);
        }
      }
    },
    [imageIds, onImagesReorder]
  );

  const handleZoom = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const activeIndex = activeId ? imageIds.indexOf(activeId) : -1;
  const activeFile = activeIndex >= 0 ? images[activeIndex] : null;
  const activePreviewUrl = activeIndex >= 0 ? previewUrls[activeIndex] : '';

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={imageIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((file, index) => (
              <SortableImageItem
                key={imageIds[index] ?? `img-${index}`}
                id={imageIds[index] ?? `img-${index}`}
                file={file}
                previewUrl={previewUrls[index] || ''}
                index={index}
                isMainImage={index === mainImageIndex}
                onRemove={onImageRemove}
                onSetMain={onMainImageSet}
                onZoom={handleZoom}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>

        {/* Overlay pendant le drag */}
        <DragOverlay adjustScale={true}>
          {activeId && activeFile ? (
            <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-primary opacity-90 bg-background">
              <div className="aspect-square w-40 relative">
                <img
                  src={activePreviewUrl}
                  alt="Image en cours de déplacement"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/20" />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lightbox pour le zoom */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={previewUrls}
          currentIndex={lightboxIndex}
          isOpen={true}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
};

export default DraggableImageGrid;
