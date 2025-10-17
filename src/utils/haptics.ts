/**
 * Cross-platform haptic feedback utility
 * Works on iOS (via AudioContext) and Android (via Vibration API)
 */

export type HapticIntensity = 'light' | 'medium' | 'heavy';

export const triggerHapticFeedback = (type: HapticIntensity = 'light') => {
  // iOS: Use AudioContext to trigger taptic engine
  // This is a workaround since iOS doesn't support navigator.vibrate()
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Very low frequency (inaudible) to trigger haptic without sound
      oscillator.frequency.value = 0;
      gainNode.gain.value = 0.01;
      
      const duration = type === 'light' ? 0.01 : type === 'medium' ? 0.02 : 0.03;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
      
      // Clean up
      setTimeout(() => {
        audioContext.close();
      }, 100);
    } catch (error) {
      // Silently fail if AudioContext is not supported
      console.debug('Haptic feedback not supported');
    }
    return;
  }
  
  // Android: Use Vibration API
  if ('vibrate' in navigator) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
    navigator.vibrate(duration);
  }
};
