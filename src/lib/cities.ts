export interface City {
  name: string
  communes: string[]
}

export const CITIES: City[] = [
  {
    name: 'Abidjan',
    communes: ['Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Le Plateau', 'Marcory', 'Port-Bouët', 'Treichville', 'Yopougon'],
  },
  { name: 'Yamoussoukro', communes: [] },
  { name: 'Bouaké', communes: [] },
  { name: 'Daloa', communes: [] },
  { name: 'San-Pédro', communes: [] },
  { name: 'Korhogo', communes: [] },
  { name: 'Man', communes: [] },
  { name: 'Gagnoa', communes: [] },
  { name: 'Divo', communes: [] },
  { name: 'Soubré', communes: [] },
  { name: 'Abengourou', communes: [] },
  { name: 'Aboisso', communes: [] },
  { name: 'Adzopé', communes: [] },
  { name: 'Agboville', communes: [] },
  { name: 'Bondoukou', communes: [] },
  { name: 'Bouaflé', communes: [] },
  { name: 'Boundiali', communes: [] },
  { name: 'Bouna', communes: [] },
  { name: 'Daoukro', communes: [] },
  { name: 'Dabou', communes: [] },
  { name: 'Danané', communes: [] },
  { name: 'Dimbokro', communes: [] },
  { name: 'Duékoué', communes: [] },
  { name: 'Ferkessédougou', communes: [] },
  { name: 'Grand-Bassam', communes: [] },
  { name: 'Guiglo', communes: [] },
  { name: 'Issia', communes: [] },
  { name: 'Katiola', communes: [] },
  { name: 'Lakota', communes: [] },
  { name: 'Mankono', communes: [] },
  { name: 'Méagui', communes: [] },
  { name: 'Odienné', communes: [] },
  { name: 'Oumé', communes: [] },
  { name: 'Sassandra', communes: [] },
  { name: 'Séguéla', communes: [] },
  { name: 'Sinfra', communes: [] },
  { name: 'Tabou', communes: [] },
  { name: 'Tanda', communes: [] },
  { name: 'Touba', communes: [] },
  { name: 'Toumodi', communes: [] },
  { name: 'Vavoua', communes: [] },
  { name: 'Zuénoula', communes: [] },
]

export function getCity(name: string): City | undefined {
  return CITIES.find((c) => c.name === name)
}

export function getCommunesForCity(cityName: string | null | undefined): string[] {
  if (!cityName) return []
  const city = getCity(cityName)
  return city?.communes ?? []
}

export function isCityWithCommunes(cityName: string | null | undefined): boolean {
  return getCommunesForCity(cityName).length > 0
}
