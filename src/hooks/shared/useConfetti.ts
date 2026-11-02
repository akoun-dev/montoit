// @ts-expect-error - canvas-confetti doesn't have type declarations
import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  origin?: { x?: number; y?: number };
}

export function useConfetti() {
  const triggerConfetti = (options?: ConfettiOptions) => {
    const defaultOptions = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F16522', '#4A2C17', '#22C55E', '#FFD700'],
    };

    confetti({
      ...defaultOptions,
      ...options,
    });
  };

  // Animation spéciale pour signature certifiée (burst des deux côtés pendant 2s)
  const triggerCertifiedSignatureConfetti = () => {
    const end = Date.now() + 2 * 1000;
    const colors = ['#F16522', '#4A2C17', '#22C55E', '#FFD700'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  return { triggerConfetti, triggerCertifiedSignatureConfetti };
}
