/**
 * Mapping des illustrations ivoiriennes générées par l'IA
 * Ces illustrations sont utilisées à travers l'application pour enrichir l'expérience visuelle
 */

export const illustrationPaths = {
  // Famille et maison ivoirienne - Hero, Features
  'ivorian-family-house': '/src/assets/illustrations/ivorian/ivorian-family-house.png',
  
  // Visite d'appartement - Features, Explorer
  'apartment-visit': '/src/assets/illustrations/ivorian/apartment-visit.png',
  
  // Agent immobilier - Features, Certification
  'real-estate-agent': '/src/assets/illustrations/ivorian/real-estate-agent.png',
  
  // Quartier d'Abidjan - Explorer, HowItWorks
  'abidjan-neighborhood': '/src/assets/illustrations/ivorian/abidjan-neighborhood.png',
  
  // Salon moderne - PropertyCard, Explorer
  'modern-living-room': '/src/assets/illustrations/ivorian/modern-living-room.png',
  
  // Skyline d'Abidjan - Hero alternatif, Footer
  'abidjan-skyline': '/src/assets/illustrations/ivorian/abidjan-skyline.png',
  
  // Remise de clés - Testimonials, Success page
  'key-handover': '/src/assets/illustrations/ivorian/key-handover.png',
  
  // Famille en déménagement - HowItWorks, Onboarding
  'family-moving': '/src/assets/illustrations/ivorian/family-moving.png',
  
  // Réunion copropriété - Admin, Agence Dashboard
  'co-ownership-meeting': '/src/assets/illustrations/ivorian/co-ownership-meeting.png',
  
  // Certification ANSUT - Certification, CertificationBanner
  'certification-ansut-illustration': '/src/assets/illustrations/ivorian/certification-ansut-illustration.png',
} as const;

export type IllustrationKey = keyof typeof illustrationPaths;

/**
 * Helper pour obtenir le chemin d'une illustration
 * @param key - La clé de l'illustration
 * @returns Le chemin de l'illustration ou undefined si non trouvée
 */
export const getIllustrationPath = (key: IllustrationKey): string | undefined => {
  return illustrationPaths[key];
};

/**
 * Helper pour obtenir le chemin optimisé d'une illustration (WebP)
 * @param key - La clé de l'illustration
 * @param format - Format souhaité ('webp' ou 'png')
 * @returns Le chemin optimisé de l'illustration ou undefined si non trouvée
 */
export const getOptimizedIllustrationPath = (
  key: IllustrationKey, 
  format: 'webp' | 'png' = 'webp'
): string | undefined => {
  const path = illustrationPaths[key];
  if (!path) return undefined;
  
  if (format === 'webp') {
    return path.replace('.png', '.webp');
  }
  return path;
};

/**
 * Vérifier si une illustration existe
 * @param key - La clé de l'illustration
 */
export const hasIllustration = (key: IllustrationKey): boolean => {
  return key in illustrationPaths;
};
