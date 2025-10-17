import { motion } from 'framer-motion';
import { useState, MouseEvent } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

interface RippleButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const RippleButton = ({ children, onClick, ...props }: RippleButtonProps) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples([...ripples, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
    
    if (onClick) onClick(e);
  };

  return (
    <Button
      {...props}
      onClick={handleClick}
      className={`relative overflow-hidden ${props.className || ''}`}
    >
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ 
            width: 300, 
            height: 300, 
            opacity: 0,
            x: -150,
            y: -150
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
      {children}
    </Button>
  );
};

