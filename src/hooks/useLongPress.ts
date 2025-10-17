import { useCallback, useRef, useState } from 'react';
import { triggerHapticFeedback } from '@/utils/haptics';

interface LongPressOptions {
  onLongPress: () => void;
  onClick: () => void;
  delay?: number;
}

export const useLongPress = (
  { onLongPress, onClick, delay = 500 }: LongPressOptions
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    timeout.current = setTimeout(() => {
      onLongPress();
      setLongPressTriggered(true);
      triggerHapticFeedback('medium');
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    setLongPressTriggered(false);
  }, []);

  const clickHandler = useCallback((event: React.MouseEvent) => {
    if (!longPressTriggered) {
      onClick();
    }
    clear();
  }, [onClick, longPressTriggered, clear]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
    onClick: clickHandler,
  };
};
