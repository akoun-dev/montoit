import confetti from 'canvas-confetti';

/**
 * Confetti pour certification ANSUT réussie
 * Couleurs: Or, Orange (couleurs ANSUT)
 */
export const celebrateCertification = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Confetti doré et orange (couleurs ANSUT)
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF8F00', '#FFA500', '#FFB700'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF8F00', '#FFA500', '#FFB700'],
    });
  }, 250);
};

/**
 * Confetti pour première candidature envoyée
 * Couleurs: Bleu primaire, Violet
 */
export const celebrateFirstApplication = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#2563eb', '#7c3aed', '#3b82f6', '#8b5cf6'],
    zIndex: 9999,
  });
};

/**
 * Confetti pour bail signé électroniquement
 * Couleurs: Vert succès, Animation spectaculaire
 */
export const celebrateLeaseSigned = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  const fire = (particleRatio: number, opts: confetti.Options) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac'],
    });
  };

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};
