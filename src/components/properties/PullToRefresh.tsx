import { useState, useRef, useEffect } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { triggerHapticFeedback } from '@/utils/haptics';
import { toast } from '@/hooks/use-toast';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefresh = useRef(Date.now());
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hapticTriggered = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  
  // Use react-spring for elastic animation
  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start tracking if we're at the top of the scroll
      if (window.scrollY === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        hapticTriggered.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      // Only pull down with progressive resistance
      if (deltaY > 0) {
        // Progressive resistance (harder to pull as you go further)
        const resistance = Math.pow(deltaY / 300, 0.7);
        const adjustedY = Math.min(deltaY * resistance, 120);
        
        api.start({ y: adjustedY, immediate: true });

        // Trigger haptic at threshold
        if (adjustedY > 80 && !hapticTriggered.current) {
          triggerHapticFeedback('medium');
          hapticTriggered.current = true;
        }

        // Prevent default scroll if pulling
        if (deltaY > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      const currentY = y.get();
      
      if (currentY > 80 && !isRefreshing) {
        const timeSinceLastRefresh = Date.now() - lastRefresh.current;

        // Throttle: minimum 5 seconds between refreshes
        if (timeSinceLastRefresh < 5000) {
          toast({
            description: "⏳ Veuillez patienter avant de rafraîchir à nouveau",
            duration: 2000,
          });
          api.start({ y: 0, config: { tension: 200, friction: 20 } });
          startY.current = 0;
          return;
        }

        // Snap to refresh position
        api.start({ y: 60 });
        setIsRefreshing(true);
        lastRefresh.current = Date.now();
        
        try {
          await onRefresh();
          toast({
            description: "✓ Liste rafraîchie",
            duration: 2000,
          });
        } catch (error) {
          toast({
            title: "Erreur",
            description: "Impossible de rafraîchir la liste",
            variant: "destructive",
          });
        } finally {
          setIsRefreshing(false);
        }
      }

      // Elastic bounce back (instant if reduced motion)
      api.start({ 
        y: 0, 
        config: prefersReducedMotion 
          ? { tension: 500, friction: 50 } // Instant
          : { tension: 200, friction: 20 }  // Elastic
      });
      startY.current = 0;
      hapticTriggered.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, onRefresh, api, y]);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator with elastic animation */}
      <animated.div
        className="absolute top-0 left-0 right-0 flex justify-center items-center -translate-y-full"
        style={{
          opacity: y.to(val => val > 0 ? 1 : 0),
          height: y.to(val => `${val}px`),
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <animated.div
            style={{
              transform: y.to(val => `rotate(${Math.min(val / 80 * 180, 180)}deg) rotate(${val * 3}deg)`),
            }}
          >
            <ChevronDown className="h-6 w-6 text-primary" />
          </animated.div>
        )}
      </animated.div>

      {/* Content with elastic pull */}
      <animated.div
        style={{
          transform: y.to(val => `translateY(${val}px)`),
        }}
      >
        {children}
      </animated.div>
    </div>
  );
};
