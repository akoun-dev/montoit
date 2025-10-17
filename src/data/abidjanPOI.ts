/**
 * Points d'Intérêt (POI) d'Abidjan
 * Données réelles des principaux lieux d'intérêt de la ville
 */

export interface POI {
  id: string;
  name: string;
  type: 'school' | 'transport' | 'hospital' | 'market' | 'mall' | 'restaurant';
  latitude: number;
  longitude: number;
  neighborhood: string;
  description?: string;
}

export const ABIDJAN_POI: POI[] = [
  // ÉCOLES
  {
    id: 'school-1',
    name: 'Lycée Classique d\'Abidjan',
    type: 'school',
    latitude: 5.3244,
    longitude: -4.0125,
    neighborhood: 'Plateau',
    description: 'Lycée public prestigieux',
  },
  {
    id: 'school-2',
    name: 'Université Félix Houphouët-Boigny',
    type: 'school',
    latitude: 5.3599,
    longitude: -3.9889,
    neighborhood: 'Cocody',
    description: 'Principale université publique',
  },
  {
    id: 'school-3',
    name: 'École Internationale Jean-Mermoz',
    type: 'school',
    latitude: 5.3736,
    longitude: -3.9609,
    neighborhood: 'Riviera',
    description: 'École française internationale',
  },
  {
    id: 'school-4',
    name: 'Groupe Scolaire Sainte-Marie',
    type: 'school',
    latitude: 5.3450,
    longitude: -4.0050,
    neighborhood: 'Cocody',
    description: 'École catholique réputée',
  },

  // TRANSPORTS
  {
    id: 'transport-1',
    name: 'Gare de Treichville',
    type: 'transport',
    latitude: 5.2869,
    longitude: -3.9967,
    neighborhood: 'Treichville',
    description: 'Principale gare routière',
  },
  {
    id: 'transport-2',
    name: 'Gare d\'Adjamé',
    type: 'transport',
    latitude: 5.3536,
    longitude: -4.0236,
    neighborhood: 'Adjamé',
    description: 'Gare routière nord',
  },
  {
    id: 'transport-3',
    name: 'Gare de Yopougon',
    type: 'transport',
    latitude: 5.3369,
    longitude: -4.0894,
    neighborhood: 'Yopougon',
    description: 'Gare routière ouest',
  },
  {
    id: 'transport-4',
    name: 'Aéroport Félix Houphouët-Boigny',
    type: 'transport',
    latitude: 5.2539,
    longitude: -3.9263,
    neighborhood: 'Port-Bouët',
    description: 'Aéroport international',
  },

  // HÔPITAUX
  {
    id: 'hospital-1',
    name: 'CHU de Cocody',
    type: 'hospital',
    latitude: 5.3599,
    longitude: -3.9789,
    neighborhood: 'Cocody',
    description: 'Centre hospitalier universitaire',
  },
  {
    id: 'hospital-2',
    name: 'CHU de Treichville',
    type: 'hospital',
    latitude: 5.2900,
    longitude: -4.0050,
    neighborhood: 'Treichville',
    description: 'Grand hôpital public',
  },
  {
    id: 'hospital-3',
    name: 'Polyclinique Internationale Sainte Anne-Marie',
    type: 'hospital',
    latitude: 5.3650,
    longitude: -3.9950,
    neighborhood: 'Cocody',
    description: 'Clinique privée moderne',
  },
  {
    id: 'hospital-4',
    name: 'Hôpital Général d\'Abobo',
    type: 'hospital',
    latitude: 5.4167,
    longitude: -4.0167,
    neighborhood: 'Abobo',
    description: 'Hôpital général',
  },

  // MARCHÉS
  {
    id: 'market-1',
    name: 'Marché d\'Adjamé',
    type: 'market',
    latitude: 5.3536,
    longitude: -4.0236,
    neighborhood: 'Adjamé',
    description: 'Plus grand marché d\'Abidjan',
  },
  {
    id: 'market-2',
    name: 'Marché de Treichville',
    type: 'market',
    latitude: 5.2869,
    longitude: -3.9967,
    neighborhood: 'Treichville',
    description: 'Marché traditionnel',
  },
  {
    id: 'market-3',
    name: 'Marché de Cocody',
    type: 'market',
    latitude: 5.3599,
    longitude: -3.9889,
    neighborhood: 'Cocody',
    description: 'Marché moderne',
  },
  {
    id: 'market-4',
    name: 'Marché de Yopougon',
    type: 'market',
    latitude: 5.3369,
    longitude: -4.0894,
    neighborhood: 'Yopougon',
    description: 'Grand marché populaire',
  },

  // CENTRES COMMERCIAUX
  {
    id: 'mall-1',
    name: 'Cap Sud',
    type: 'mall',
    latitude: 5.2869,
    longitude: -3.9867,
    neighborhood: 'Marcory',
    description: 'Centre commercial moderne',
  },
  {
    id: 'mall-2',
    name: 'Playce Marcory',
    type: 'mall',
    latitude: 5.2900,
    longitude: -3.9900,
    neighborhood: 'Marcory',
    description: 'Mall avec cinéma',
  },
  {
    id: 'mall-3',
    name: 'Cosmos Yopougon',
    type: 'mall',
    latitude: 5.3400,
    longitude: -4.0850,
    neighborhood: 'Yopougon',
    description: 'Centre commercial populaire',
  },
  {
    id: 'mall-4',
    name: 'Carrefour Marcory',
    type: 'mall',
    latitude: 5.2850,
    longitude: -3.9850,
    neighborhood: 'Marcory',
    description: 'Hypermarché Carrefour',
  },

  // RESTAURANTS
  {
    id: 'restaurant-1',
    name: 'La Taverne Romaine',
    type: 'restaurant',
    latitude: 5.3244,
    longitude: -4.0125,
    neighborhood: 'Plateau',
    description: 'Restaurant italien haut de gamme',
  },
  {
    id: 'restaurant-2',
    name: 'Chez Amina',
    type: 'restaurant',
    latitude: 5.3599,
    longitude: -3.9889,
    neighborhood: 'Cocody',
    description: 'Cuisine ivoirienne authentique',
  },
  {
    id: 'restaurant-3',
    name: 'Le Bâteau Ivre',
    type: 'restaurant',
    latitude: 5.2869,
    longitude: -3.9967,
    neighborhood: 'Treichville',
    description: 'Restaurant français',
  },
  {
    id: 'restaurant-4',
    name: 'Maquis du Coin',
    type: 'restaurant',
    latitude: 5.3736,
    longitude: -3.9609,
    neighborhood: 'Riviera',
    description: 'Maquis traditionnel',
  },
];

export const POI_CATEGORIES = {
  school: {
    label: 'Écoles',
    icon: '🏫',
    color: '#3b82f6',
  },
  transport: {
    label: 'Transports',
    icon: '🚌',
    color: '#10b981',
  },
  hospital: {
    label: 'Hôpitaux',
    icon: '🏥',
    color: '#ef4444',
  },
  market: {
    label: 'Marchés',
    icon: '🛒',
    color: '#f59e0b',
  },
  mall: {
    label: 'Centres commerciaux',
    icon: '🏬',
    color: '#8b5cf6',
  },
  restaurant: {
    label: 'Restaurants',
    icon: '🍽️',
    color: '#ec4899',
  },
};

