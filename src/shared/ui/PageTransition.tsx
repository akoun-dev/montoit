import { useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition - Smooth fade transition between routes
 * Features:
 * - Fade in/out animation on route change
 * - Automatic scroll to top
 * - Respects prefers-reduced-motion
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit' | 'idle'>('enter');
  const previousPathRef = useRef(location.pathname);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Scroll to top on initial mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    // Skip animation if reduced motion is preferred
    if (prefersReducedMotion) {
      setDisplayChildren(children);
      return;
    }

    // Route has changed - trigger exit animation
    if (location.pathname !== previousPathRef.current) {
      setTransitionStage('exit');
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname, children, prefersReducedMotion]);

  // Handle animation end
  const handleAnimationEnd = () => {
    if (transitionStage === 'exit') {
      // After exit animation, update children and trigger enter
      setDisplayChildren(children);
      setTransitionStage('enter');

      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (transitionStage === 'enter') {
      setTransitionStage('idle');
    }
  };

  // If reduced motion, render without animation wrapper
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <div
      className={`page-transition ${transitionStage}`}
      onAnimationEnd={handleAnimationEnd}
      aria-live="polite"
    >
      {displayChildren}
    </div>
  );
}
