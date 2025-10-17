import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeInViewProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const FadeInView = ({ 
  children, 
  delay = 0,
  direction = 'up' 
}: FadeInViewProps) => {
  const directions = {
    up: { y: 50 },
    down: { y: -50 },
    left: { x: 50 },
    right: { x: -50 }
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directions[direction]
      }}
      whileInView={{ 
        opacity: 1, 
        y: 0,
        x: 0
      }}
      transition={{ 
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] // easeOutQuad
      }}
      viewport={{ once: true, margin: "-100px" }}
    >
      {children}
    </motion.div>
  );
};

