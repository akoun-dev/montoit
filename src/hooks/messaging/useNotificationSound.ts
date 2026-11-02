import { useRef, useCallback, useEffect } from 'react';
import { useMessageSettingsStore } from '../../store/messageSettingsStore';

// WhatsApp-like notification sound (base64 encoded short beep)
const INCOMING_SOUND_URL =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNPr3kAAAAAAD/+9DEAAAGRAFttBEAI5KhLLc00AEQB5uYBgwPc6D8f5QJD8EJA+D4f/+Hw//y+TdKLJOf/8dAQIjlAQP/yjhBz/0FDhdqUYi4WigO4gICAIOB0cjqD4Pik/KCgZxQOB9/ggc/wfB+SB8p/gh+UH/8H5d/5f/y7/3P/Lv////l/wmXeKAAAAKeLF0V/V1mOjHCW1mGrGAoQKgYVqNEDBE4H6GYCXgqALcIcBxCSKSLBhAXQKsKIFpFuUXDI7XWMMHBHCV7Cp4NtGEEBGYUfMSzpPRl9F0uJiUXONMlR3kbMxE2oo2xWuTJOkTEKmSZqptTMmHhUW/L/S/0oN//pWpnlbJi/W//6v/+ZT/9q///lqv///+rZbJJNqZv6v/+1Ja7fXa1NyzUzTV/+vE3//+q1M3d73u+7//+tTU/5m+1qar/+p//+qu973Xqpq7m5bf//6v/+qb/u7/qqqqqr//X///9q09fqqqqqqqqqqqrVVV1dbW6uqqr///6r/qqr/+7V1X/qqqru61qbf/Xf9qqv/9bqv/qqqrd11Wlqqqqtv/b///f/37//qqtVVVW16qqqqqqv//+u//q7v+7qqqtVVVVqqqqqq//t/////f/3e6qqqqqqqqqqqqqqqqqqv///3//d3d3d3u7u7u7u6qqqqqqqqqqq';

const OUTGOING_SOUND_URL =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNPr3kAAAAAAD/+9DEAAAGRAFttBEAI5KhLLc00AEQB5uYBgwPc6D8f5QJD8EJA+D4f/+Hw//y+TdKLJOf/8dAQIjlAQP/yjhBz/0FDhdqUYi4WigO4gICAIOB0cjqD4Pik/KCgZxQOB9/ggc/wfB+SB8p/gh+UH/8H5d/5f/y7/3P/Lv////l/wmXeKAAAAKeLF0V/V1mOjHCW1mGrGAoQKgYVqNEDBE4H6GYCXgqALcIcBxCSKSLBhAXQKsKIFpFuUXDI7XWMMHBHCV7Cp4NtGEEBGYUfMSzpPRl9F0uJiUXONMlR3kbMxE2oo2xWuTJOkTEKmSZqptTMmHhUW/L/S/0oN//pWpnlbJi/W//6v/+ZT/9q///lqv///+rZbJJNqZv6v/+1Ja7fXa1NyzUzTV/+vE3//+q1M3d73u+7//+tTU/5m+1qar/+p//+qu973Xqpq7m5bf//6v/+qb/u7/qqqqqr//X///9q09fqqqqqqqqqqqrVVV1dbW6uqqr///6r/qqr/+7V1X/qqqru61qbf/Xf9qqv/9bqv/qqqrd11Wlqqqqtv/b///f/37//qqtVVVW16qqqqqqv//+u//q7v+7qqqtVVVVqqqqqq//t/////f/3e6qqqqqqqqqqqqqqqqqqv///3//d3d3d3u7u7u7u6qqqqqqqqqqq';

export function useNotificationSound() {
  const { soundEnabled, soundVolume } = useMessageSettingsStore();
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);

  // Preload audio files
  useEffect(() => {
    incomingAudioRef.current = new Audio(INCOMING_SOUND_URL);
    outgoingAudioRef.current = new Audio(OUTGOING_SOUND_URL);

    // Enable audio after first user interaction
    const enableAudio = () => {
      hasInteractedRef.current = true;
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  const playIncomingSound = useCallback(() => {
    if (!soundEnabled || !hasInteractedRef.current || !incomingAudioRef.current) return;

    try {
      incomingAudioRef.current.volume = soundVolume;
      incomingAudioRef.current.currentTime = 0;
      incomingAudioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch {
      // Ignore errors
    }
  }, [soundEnabled, soundVolume]);

  const playOutgoingSound = useCallback(() => {
    if (!soundEnabled || !hasInteractedRef.current || !outgoingAudioRef.current) return;

    try {
      outgoingAudioRef.current.volume = soundVolume * 0.5; // Softer for outgoing
      outgoingAudioRef.current.currentTime = 0;
      outgoingAudioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch {
      // Ignore errors
    }
  }, [soundEnabled, soundVolume]);

  const playTestSound = useCallback(() => {
    hasInteractedRef.current = true;
    if (!incomingAudioRef.current) return;

    try {
      incomingAudioRef.current.volume = soundVolume;
      incomingAudioRef.current.currentTime = 0;
      incomingAudioRef.current.play().catch(() => {});
    } catch {
      // Ignore errors
    }
  }, [soundVolume]);

  return {
    playIncomingSound,
    playOutgoingSound,
    playTestSound,
    soundEnabled,
    soundVolume,
  };
}
