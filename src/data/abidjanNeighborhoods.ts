/**
 * Données des quartiers d'Abidjan
 * Informations détaillées sur chaque quartier
 */

export interface Neighborhood {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    latitude: number;
    longitude: number;
  };
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  scores: {
    transport: number; // 0-10
    commerce: number; // 0-10
    education: number; // 0-10
    security: number; // 0-10
    healthcare: number; // 0-10
  };
  description: string;
  characteristics: string[];
  population?: number;
}

export const ABIDJAN_NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'cocody',
    name: 'Cocody',
    bounds: {
      north: 5.3800,
      south: 5.3400,
      east: -3.9600,
      west: -4.0200,
    },
    center: {
      latitude: 5.3599,
      longitude: -3.9889,
    },
    priceRange: {
      min: 250000,
      max: 800000,
      average: 450000,
    },
    scores: {
      transport: 8,
      commerce: 9,
      education: 10,
      security: 9,
      healthcare: 9,
    },
    description: 'Quartier résidentiel huppé d\'Abidjan, abritant l\'université et de nombreuses ambassades.',
    characteristics: [
      'Quartier résidentiel calme',
      'Nombreuses écoles internationales',
      'Ambassades et institutions',
      'Espaces verts',
      'Sécurité renforcée',
    ],
    population: 400000,
  },
  {
    id: 'plateau',
    name: 'Plateau',
    bounds: {
      north: 5.3350,
      south: 5.3100,
      east: -4.0000,
      west: -4.0300,
    },
    center: {
      latitude: 5.3244,
      longitude: -4.0125,
    },
    priceRange: {
      min: 300000,
      max: 1000000,
      average: 550000,
    },
    scores: {
      transport: 10,
      commerce: 10,
      education: 8,
      security: 9,
      healthcare: 8,
    },
    description: 'Centre d\'affaires et administratif d\'Abidjan, cœur économique de la Côte d\'Ivoire.',
    characteristics: [
      'Centre d\'affaires',
      'Immeubles modernes',
      'Banques et institutions',
      'Restaurants haut de gamme',
      'Vie nocturne animée',
    ],
    population: 15000,
  },
  {
    id: 'marcory',
    name: 'Marcory',
    bounds: {
      north: 5.3000,
      south: 5.2700,
      east: -3.9700,
      west: -4.0100,
    },
    center: {
      latitude: 5.2869,
      longitude: -3.9967,
    },
    priceRange: {
      min: 150000,
      max: 400000,
      average: 280000,
    },
    scores: {
      transport: 7,
      commerce: 8,
      education: 7,
      security: 7,
      healthcare: 7,
    },
    description: 'Quartier mixte résidentiel et commercial, en pleine expansion avec de nombreux centres commerciaux.',
    characteristics: [
      'Centres commerciaux modernes',
      'Zone résidentielle en développement',
      'Bon rapport qualité-prix',
      'Accès facile au Plateau',
      'Quartier familial',
    ],
    population: 300000,
  },
  {
    id: 'riviera',
    name: 'Riviera',
    bounds: {
      north: 5.3900,
      south: 5.3600,
      east: -3.9400,
      west: -3.9800,
    },
    center: {
      latitude: 5.3736,
      longitude: -3.9609,
    },
    priceRange: {
      min: 300000,
      max: 900000,
      average: 550000,
    },
    scores: {
      transport: 7,
      commerce: 8,
      education: 9,
      security: 9,
      healthcare: 8,
    },
    description: 'Quartier résidentiel moderne et sécurisé, prisé par les expatriés et cadres supérieurs.',
    characteristics: [
      'Résidences modernes',
      'Golf et loisirs',
      'Écoles internationales',
      'Sécurité 24/7',
      'Quartier calme',
    ],
    population: 200000,
  },
  {
    id: 'treichville',
    name: 'Treichville',
    bounds: {
      north: 5.2950,
      south: 5.2750,
      east: -3.9850,
      west: -4.0150,
    },
    center: {
      latitude: 5.2869,
      longitude: -3.9967,
    },
    priceRange: {
      min: 120000,
      max: 350000,
      average: 220000,
    },
    scores: {
      transport: 9,
      commerce: 9,
      education: 6,
      security: 6,
      healthcare: 7,
    },
    description: 'Quartier populaire et animé, centre culturel avec le marché et la gare routière.',
    characteristics: [
      'Quartier animé',
      'Marché traditionnel',
      'Vie nocturne',
      'Transport facile',
      'Prix abordables',
    ],
    population: 150000,
  },
  {
    id: 'yopougon',
    name: 'Yopougon',
    bounds: {
      north: 5.3600,
      south: 5.3100,
      east: -4.0600,
      west: -4.1200,
    },
    center: {
      latitude: 5.3369,
      longitude: -4.0894,
    },
    priceRange: {
      min: 80000,
      max: 250000,
      average: 150000,
    },
    scores: {
      transport: 6,
      commerce: 7,
      education: 6,
      security: 5,
      healthcare: 6,
    },
    description: 'Plus grande commune d\'Abidjan, quartier populaire avec de nombreux commerces.',
    characteristics: [
      'Quartier populaire',
      'Prix très abordables',
      'Nombreux commerces',
      'Marché important',
      'Forte densité',
    ],
    population: 1200000,
  },
  {
    id: 'adjame',
    name: 'Adjamé',
    bounds: {
      north: 5.3700,
      south: 5.3400,
      east: -4.0100,
      west: -4.0400,
    },
    center: {
      latitude: 5.3536,
      longitude: -4.0236,
    },
    priceRange: {
      min: 100000,
      max: 300000,
      average: 180000,
    },
    scores: {
      transport: 10,
      commerce: 10,
      education: 6,
      security: 6,
      healthcare: 6,
    },
    description: 'Centre commercial majeur avec le plus grand marché d\'Abidjan et la gare routière.',
    characteristics: [
      'Plus grand marché',
      'Hub de transport',
      'Commerce intense',
      'Quartier très animé',
      'Prix compétitifs',
    ],
    population: 500000,
  },
  {
    id: 'abobo',
    name: 'Abobo',
    bounds: {
      north: 5.4400,
      south: 5.3900,
      east: -4.0000,
      west: -4.0400,
    },
    center: {
      latitude: 5.4167,
      longitude: -4.0167,
    },
    priceRange: {
      min: 70000,
      max: 200000,
      average: 120000,
    },
    scores: {
      transport: 6,
      commerce: 7,
      education: 5,
      security: 5,
      healthcare: 6,
    },
    description: 'Commune populaire du nord d\'Abidjan, en pleine expansion urbaine.',
    characteristics: [
      'Quartier en expansion',
      'Prix très accessibles',
      'Jeune population',
      'Commerces locaux',
      'Forte croissance',
    ],
    population: 1200000,
  },
  {
    id: 'port-bouet',
    name: 'Port-Bouët',
    bounds: {
      north: 5.2700,
      south: 5.2300,
      east: -3.9100,
      west: -3.9500,
    },
    center: {
      latitude: 5.2539,
      longitude: -3.9263,
    },
    priceRange: {
      min: 100000,
      max: 350000,
      average: 200000,
    },
    scores: {
      transport: 9,
      commerce: 7,
      education: 6,
      security: 7,
      healthcare: 6,
    },
    description: 'Quartier abritant l\'aéroport international, proche de la mer.',
    characteristics: [
      'Proche aéroport',
      'Accès à la plage',
      'Zone industrielle',
      'Transport international',
      'Quartier mixte',
    ],
    population: 250000,
  },
  {
    id: 'deux-plateaux',
    name: 'Deux Plateaux',
    bounds: {
      north: 5.3700,
      south: 5.3500,
      east: -3.9900,
      west: -4.0100,
    },
    center: {
      latitude: 5.3600,
      longitude: -4.0000,
    },
    priceRange: {
      min: 200000,
      max: 600000,
      average: 380000,
    },
    scores: {
      transport: 7,
      commerce: 8,
      education: 8,
      security: 8,
      healthcare: 8,
    },
    description: 'Quartier résidentiel moderne de Cocody, prisé par la classe moyenne supérieure.',
    characteristics: [
      'Résidences modernes',
      'Quartier sécurisé',
      'Nombreux restaurants',
      'Vie nocturne',
      'Classe moyenne',
    ],
    population: 150000,
  },
];

// Fonction utilitaire pour obtenir la couleur selon le prix moyen
export const getPriceColor = (avgPrice: number): string => {
  if (avgPrice < 150000) return '#10b981'; // Vert - Abordable
  if (avgPrice < 300000) return '#f59e0b'; // Orange - Moyen
  if (avgPrice < 500000) return '#ef4444'; // Rouge - Cher
  return '#8b5cf6'; // Violet - Très cher
};

// Fonction pour obtenir le label de prix
export const getPriceLabel = (avgPrice: number): string => {
  if (avgPrice < 150000) return '< 150k FCFA';
  if (avgPrice < 300000) return '150k - 300k FCFA';
  if (avgPrice < 500000) return '300k - 500k FCFA';
  return '> 500k FCFA';
};

