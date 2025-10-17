import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface PageTransitionProps {
  children: ReactNode;
  direction?: 'forward' | 'back' | 'fade' | 'scale';
  className?: string;
}

const variants = {
  slideRight: {
    enter: { x: '100%', opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: '-30%', opacity: 0 },
  },
  slideLeft: {
    enter: { x: '-100%', opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: '30%', opacity: 0 },
  },
  fade: {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    enter: { scale: 0.9, opacity: 0 },
    center: { scale: 1, opacity: 1 },
    exit: { scale: 1.1, opacity: 0 },
  },
};

const transition = {
  type: 'tween' as const,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  duration: 0.3,
};

export const PageTransition = ({ 
  children, 
  direction = 'forward',
  className 
}: PageTransitionProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const getVariant = () => {
    // Si reduced motion, pas d'animation
    if (prefersReducedMotion) {
      return {
        enter: { opacity: 1, x: 0, scale: 1 },
        center: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 1, x: 0, scale: 1 },
      };
    }

    if (direction === 'fade') return variants.fade;
    if (direction === 'scale') return variants.scale;
    return direction === 'forward' ? variants.slideRight : variants.slideLeft;
  };

  const variant = getVariant();

  return (
    <motion.div
      initial="enter"
      animate="center"
      exit="exit"
      variants={variant}
      transition={{ 
        ...transition, 
        duration: prefersReducedMotion ? 0 : transition.duration 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export { AnimatePresence };
