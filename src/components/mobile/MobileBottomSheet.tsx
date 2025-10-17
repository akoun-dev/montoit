import { ReactNode, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { triggerHapticFeedback } from '@/utils/haptics';
import { cn } from '@/lib/utils';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxHeight?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  allowExpand?: boolean;
  initialHeight?: 'auto' | 'half' | 'full';
  className?: string;
}

export const MobileBottomSheet = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '80vh',
  showHandle = true,
  showCloseButton = true,
  allowExpand = false,
  initialHeight = 'auto',
  className
}: MobileBottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(initialHeight === 'full');

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      triggerHapticFeedback('light');
      onClose();
    }
  };

  const handleClose = () => {
    triggerHapticFeedback('medium');
    onClose();
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    triggerHapticFeedback('light');
  };

  const getSheetHeight = () => {
    if (isExpanded) return '90vh';
    if (initialHeight === 'half') return '50vh';
    return 'auto';
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              mass: 0.8
            }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              className
            )}
            style={{
              height: getSheetHeight(),
              maxHeight: isExpanded ? '95vh' : maxHeight
            }}
          >
            <Card className="h-full rounded-t-3xl border-0 shadow-2xl overflow-hidden">
              {/* Handle and Header */}
              <div className="relative">
                {/* Drag Handle */}
                {showHandle && (
                  <div className="flex justify-center py-3">
                    <div className="h-1 w-12 bg-gray-300 rounded-full" />
                  </div>
                )}

                {/* Header */}
                {(title || subtitle || showCloseButton || allowExpand) && (
                  <div className="px-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {title && (
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {title}
                          </h3>
                        )}
                        {subtitle && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {allowExpand && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={toggleExpand}
                            className="h-8 w-8"
                          >
                            {isExpanded ? (
                              <Minimize2 className="h-4 w-4" />
                            ) : (
                              <Maximize2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {showCloseButton && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleClose}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "overflow-y-auto",
                  isExpanded ? "h-full" : "max-h-[60vh]"
                )}
                style={{
                  maxHeight: isExpanded
                    ? 'calc(100% - 120px)'
                    : 'calc(80vh - 120px)'
                }}
              >
                <div className="px-6 py-4">
                  {children}
                </div>
              </div>

              {/* Bottom safe area */}
              <div className="h-safe-area-inset-bottom bg-white" />
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Swipeable Bottom Sheet Hook
export const useSwipeableBottomSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);
  const [props, setProps] = useState<Omit<MobileBottomSheetProps, 'isOpen' | 'onClose' | 'children'>>({});

  const openBottomSheet = (
    children: ReactNode,
    options: Omit<MobileBottomSheetProps, 'isOpen' | 'onClose' | 'children'> = {}
  ) => {
    setContent(children);
    setProps(options);
    setIsOpen(true);
    triggerHapticFeedback('light');
  };

  const closeBottomSheet = () => {
    setIsOpen(false);
    triggerHapticFeedback('medium');
    setTimeout(() => {
      setContent(null);
      setProps({});
    }, 300);
  };

  const BottomSheetComponent = () => (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={closeBottomSheet}
      {...props}
    >
      {content}
    </MobileBottomSheet>
  );

  return {
    openBottomSheet,
    closeBottomSheet,
    BottomSheetComponent
  };
};

export default MobileBottomSheet;