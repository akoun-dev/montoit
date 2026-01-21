/**
 * Liste des villes et quartiers de Côte d'Ivoire
 * Pour la recherche de propriétés
 */

export interface City {
  name: string;
  neighborhoods?: string[];
}

export const ABIDJAN_NEIGHBORHOODS = [
  'Cocody',
  'Plateau',
  'Marcory',
  'Yopougon',
  'Abobo',
  'Adjamé',
  'Koumassi',
  'Treichville',
  'Port-Bouët',
  'Attécoubé',
  // Note: Bingerville est une commune autonome, pas un quartier d'Abidjan
  'Songon',
  'Anyama',
  'Riviera',
  'Deux Plateaux',
  'Angré',
  'Blockhaus',
  'Zone 4',
  'Vridi',
  'Gonzagueville',
];

// VILLES PRINCIPALES (sans les quartiers d'Abidjan)
export const CITIES: City[] = [
  {
    name: 'Abidjan',
    neighborhoods: ABIDJAN_NEIGHBORHOODS,
  },
  { name: 'Yamoussoukro' },
  { name: 'Bouaké' },
  { name: 'Daloa' },
  { name: 'San-Pédro' },
  { name: 'Korhogo' },
  { name: 'Man' },
  { name: 'Gagnoa' },
  { name: 'Divo' },
  { name: 'Abengourou' },
  { name: 'Grand-Bassam' },
  { name: 'Sassandra' },
  { name: 'Soubré' },
  { name: 'Agboville' },
  { name: 'Bondoukou' },
];

// IMPORTANT: Ne PAS mélanger villes et quartiers !
// Les quartiers d'Abidjan sont dans ABIDJAN_NEIGHBORHOODS

export const CITY_NAMES = CITIES.map((city) => city.name);

/**
 * Obtenir les quartiers d'une ville
 */
export function getNeighborhoods(cityName: string): string[] {
  const city = CITIES.find((c) => c.name === cityName);
  return city?.neighborhoods || [];
}
