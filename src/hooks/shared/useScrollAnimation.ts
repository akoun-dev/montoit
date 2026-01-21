import { useState, useEffect, useRef, RefObject } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseScrollAnimationReturn<T extends HTMLElement> {
  ref: RefObject<T>;
  isVisible: boolean;
}

/**
 * Custom hook for scroll-triggered animations using IntersectionObserver
 * Respects user's reduced motion preferences for accessibility
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn<T> {
  const { threshold = 0.15, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options;

  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

/**
 * Animation class helper - returns appropriate classes based on visibility
 */
export function getAnimationClasses(
  isVisible: boolean,
  animationType: 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scaleIn' = 'fadeUp',
  delay: number = 0
): string {
  const baseClasses = 'transition-all duration-700 ease-out';
  const delayClass = delay > 0 ? `delay-[${delay}ms]` : '';

  const animations = {
    fadeUp: {
      hidden: 'opacity-0 translate-y-8',
      visible: 'opacity-100 translate-y-0',
    },
    fadeIn: {
      hidden: 'opacity-0',
      visible: 'opacity-100',
    },
    slideLeft: {
      hidden: 'opacity-0 -translate-x-12',
      visible: 'opacity-100 translate-x-0',
    },
    slideRight: {
      hidden: 'opacity-0 translate-x-12',
      visible: 'opacity-100 translate-x-0',
    },
    scaleIn: {
      hidden: 'opacity-0 scale-95',
      visible: 'opacity-100 scale-100',
    },
  };

  const animation = animations[animationType];
  const stateClasses = isVisible ? animation.visible : animation.hidden;

  return `${baseClasses} ${delayClass} ${stateClasses}`.trim();
}

export default useScrollAnimation;
