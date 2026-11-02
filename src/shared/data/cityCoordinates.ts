/**
 * Coordonnées GPS des villes et quartiers de Côte d'Ivoire
 * Utilisées pour afficher les propriétés sur la carte
 */

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Grandes villes
  Abidjan: { lat: 5.36, lng: -4.0083 },
  Yamoussoukro: { lat: 6.8276, lng: -5.2893 },
  Bouaké: { lat: 7.6906, lng: -5.0312 },
  'San-Pédro': { lat: 4.7485, lng: -6.6363 },
  Korhogo: { lat: 9.458, lng: -5.6295 },
  Man: { lat: 7.4125, lng: -7.5536 },
  Daloa: { lat: 6.8773, lng: -6.4502 },
  Gagnoa: { lat: 6.1319, lng: -5.9506 },

  // Quartiers d'Abidjan
  Cocody: { lat: 5.3515, lng: -3.9891 },
  Plateau: { lat: 5.3201, lng: -4.02 },
  Marcory: { lat: 5.3063, lng: -3.9824 },
  Yopougon: { lat: 5.3287, lng: -4.0772 },
  Riviera: { lat: 5.3756, lng: -3.9554 },
  Treichville: { lat: 5.2974, lng: -3.9941 },
  Adjamé: { lat: 5.3511, lng: -4.0173 },
  Koumassi: { lat: 5.296, lng: -3.9589 },
  'Port-Bouët': { lat: 5.2589, lng: -3.9247 },
  Abobo: { lat: 5.4175, lng: -4.0209 },
  Bingerville: { lat: 5.3564, lng: -3.8869 },
  'Grand-Bassam': { lat: 5.2089, lng: -3.7308 },
  Anyama: { lat: 5.4925, lng: -4.0561 },

  // Autres villes
  Abengourou: { lat: 6.7297, lng: -3.4964 },
  Agboville: { lat: 5.9286, lng: -4.2135 },
  Bondoukou: { lat: 8.04, lng: -2.8 },
  Divo: { lat: 5.8378, lng: -5.357 },
  Ferkessédougou: { lat: 9.5933, lng: -5.1947 },
  Guiglo: { lat: 6.5333, lng: -7.4833 },
  Odienné: { lat: 9.5, lng: -7.5667 },
  Séguéla: { lat: 7.9667, lng: -6.6667 },
  Soubré: { lat: 5.7833, lng: -6.6 },
  Touba: { lat: 8.2833, lng: -7.6833 },
};

/**
 * Obtient les coordonnées d'une ville avec un léger décalage aléatoire
 * pour éviter que toutes les propriétés d'une même ville se superposent
 */
export function getCityCoordinates(
  city: string,
  withJitter = false
): { lat: number; lng: number } | null {
  const coords = CITY_COORDINATES[city];
  if (!coords) return null;

  if (!withJitter) return coords;

  // Ajoute un décalage aléatoire de ~500m
  const jitter = 0.005;
  return {
    lat: coords.lat + (Math.random() - 0.5) * jitter,
    lng: coords.lng + (Math.random() - 0.5) * jitter,
  };
}

/**
 * Trouve la ville la plus proche des coordonnées données
 */
export function findNearestCity(lat: number, lng: number): string | null {
  let nearestCity: string | null = null;
  let minDistance = Infinity;

  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    const distance = Math.sqrt(Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2));
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  return nearestCity;
}
