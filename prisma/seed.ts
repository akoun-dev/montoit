import { db } from '../src/lib/db'
import { hash } from 'bcryptjs'

const DEMO_PASSWORD = 'demo1234'
const SALT_ROUNDS = 10

async function main() {
  console.log('🌱 Seeding database...')

  // ─── 1. Create Users ──────────────────────────────────────────────────────────
  const passwordHash = await hash(DEMO_PASSWORD, SALT_ROUNDS)

  const admin = await db.user.upsert({
    where: { email: 'admin@montoit.ci' },
    update: {
      activeRole: 'ADMIN',
    },
    create: {
      email: 'admin@montoit.ci',
      passwordHash,
      firstName: 'Admin',
      lastName: 'MonToit',
      role: 'ADMIN',
      activeRole: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  })

  const proprietaire = await db.user.upsert({
    where: { email: 'proprietaire@montoit.ci' },
    update: {
      activeRole: 'PROPRIETAIRE',
    },
    create: {
      email: 'proprietaire@montoit.ci',
      passwordHash,
      firstName: 'Aminata',
      lastName: 'Koné',
      role: 'PROPRIETAIRE',
      activeRole: 'PROPRIETAIRE',
      isActive: true,
      isEmailVerified: true,
    },
  })

  const locataire = await db.user.upsert({
    where: { email: 'locataire@montoit.ci' },
    update: {
      activeRole: 'LOCATAIRE',
    },
    create: {
      email: 'locataire@montoit.ci',
      passwordHash,
      firstName: 'Moussa',
      lastName: 'Ouattara',
      role: 'LOCATAIRE',
      activeRole: 'LOCATAIRE',
      isActive: true,
      isEmailVerified: true,
    },
  })

  console.log(`✅ Users created: ${admin.email}, ${proprietaire.email}, ${locataire.email}`)

  // ─── 2. Delete existing properties (avoid duplicates) ─────────────────────────
  await db.maintenanceRequest.deleteMany({})
  await db.payment.deleteMany({})
  await db.lease.deleteMany({})
  await db.rentalFileDocument.deleteMany({})
  await db.rentalFile.deleteMany({})
  await db.ownerFileDocument.deleteMany({})
  await db.ownerFile.deleteMany({})
  await db.propertyImage.deleteMany({})
  await db.property.deleteMany({})
  console.log('🗑️  Existing properties & leases deleted')

  // ─── 3. Create Properties ────────────────────────────────────────────────────
  const ownerId = proprietaire.id

  // 1. Appartement F3 moderne – Cocody
  const p1 = await db.property.create({
    data: {
      title: 'Appartement F3 moderne – Cocody',
      description:
        "Superbe appartement F3 entièrement rénové dans la résidence sécurisée de Cocody Riviera 2. Salon spacieux avec baie vitrée donnant sur un balcon fleuri, cuisine équipée moderne, 2 chambres avec placards intégrés + suite parentale avec salle de bain privative. Climatisation réversible dans toutes les pièces. Gardien 24h/24, piscine communautaire.",
      type: 'APPARTEMENT',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 150000,
      currency: 'FCFA',
      area: 85,
      bedrooms: 3,
      bathrooms: 2,
      address: 'Cocody Riviera 2',
      city: 'Abidjan',
      commune: 'Cocody',
      latitude: 5.358,
      longitude: -3.975,
      isFurnished: true,
      isVerified: true,
      hasParking: true,
      hasGarden: false,
      hasPool: false,
      hasGuardian: true,
      hasClimate: true,
      amenities: JSON.stringify([
        'wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee',
        'machine_laver', 'refrigerateur', 'television', 'balcon', 'piscine',
        'ascenseur', 'placards',
      ]),
      rentalTerms: JSON.stringify({
        caution: 1500000,
        dureeBail: '12 mois renouvelable',
        chargesIncluses: ['Eau', 'Gardiennage', 'Entretien parties communes', 'Piscine'],
        chargesNonIncluses: ['Électricité', 'Internet'],
        modePaiement: ['Virement bancaire', 'Mobile Money'],
        conditions: [
          'Garant obligatoire', 'Justificatif de revenus (3x le loyer)',
          "Attestation de l'employeur", "Pièce d'identité valide",
        ],
        etatLieux: 'État des lieux réalisé en présence des deux parties à l\'entrée et à la sortie',
        preavis: '3 mois',
      }),
      viewsCount: 142,
      ownerId,
      images: { create: { url: '/images/property-1.png', order: 0 } },
    },
  })

  // 2. Studio Meublé – Plateau
  const p2 = await db.property.create({
    data: {
      title: 'Studio Meublé – Plateau',
      description:
        "Studio meublé et climatisé au cœur du Plateau, idéal pour jeune cadre. Cuisine américaine équipée, salle de bain moderne avec douche italienne. Building sécurisé avec ascenseur, parking souterrain. Proche des administrations et commerces.",
      type: 'STUDIO',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 75000,
      currency: 'FCFA',
      area: 35,
      bedrooms: null,
      bathrooms: 1,
      address: 'Plateau Dokui',
      city: 'Abidjan',
      commune: 'Plateau',
      latitude: 5.319,
      longitude: -4.015,
      isFurnished: true,
      isVerified: true,
      hasParking: false,
      hasGarden: false,
      hasPool: false,
      hasGuardian: true,
      hasClimate: true,
      amenities: JSON.stringify([
        'wifi', 'climatisation', 'gardien', 'cuisine_equipee', 'refrigerateur',
        'television', 'ascenseur', 'douche_italienne',
      ]),
      rentalTerms: JSON.stringify({
        caution: 150000,
        dureeBail: '6 mois renouvelable',
        chargesIncluses: ['Gardiennage', 'Entretien'],
        chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
        modePaiement: ['Virement bancaire', 'Wave', 'Orange Money'],
        conditions: ['Justificatif de revenus', "Pièce d'identité valide"],
        etatLieux: "État des lieux à l'entrée et à la sortie",
        preavis: '1 mois',
      }),
      viewsCount: 89,
      ownerId,
      images: { create: { url: '/images/property-2.png', order: 0 } },
    },
  })

  // 3. Villa 4 Chambres – Marcory
  const p3 = await db.property.create({
    data: {
      title: 'Villa 4 Chambres – Marcory',
      description:
        "Magnifique villa 4 chambres dans le quartier résidentiel de Marcory. Grand séjour double, cuisine indépendante aménagée, terrasse couverte donnant sur un jardin tropical de 500m². Garage double, dépendance studio. Terrain clos avec portail motorisé.",
      type: 'VILLA',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 350000,
      currency: 'FCFA',
      area: 200,
      bedrooms: 4,
      bathrooms: 3,
      address: 'Marcory Résidentiel',
      city: 'Abidjan',
      commune: 'Marcory',
      latitude: 5.295,
      longitude: -3.985,
      isFurnished: false,
      isVerified: true,
      hasParking: true,
      hasGarden: true,
      hasPool: false,
      hasGuardian: true,
      hasClimate: true,
      amenities: JSON.stringify([
        'wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee',
        'machine_laver', 'refrigerateur', 'television', 'jardin', 'terrasse',
        'garage', 'portail_motorise',
      ]),
      rentalTerms: JSON.stringify({
        caution: 1050000,
        dureeBail: '24 mois renouvelable',
        chargesIncluses: ['Gardiennage', 'Entretien jardin'],
        chargesNonIncluses: ['Eau', 'Électricité', 'Internet', 'Entretien piscine'],
        modePaiement: ['Virement bancaire', 'Chèque'],
        conditions: [
          'Garant obligatoire', 'Justificatif de revenus (4x le loyer)',
          "Attestation de l'employeur", "Pièce d'identité valide", "Photo d'identité",
        ],
        etatLieux: 'État des lieux contradictoire détaillé à l\'entrée et à la sortie',
        preavis: '3 mois',
      }),
      viewsCount: 215,
      ownerId,
      images: { create: { url: '/images/property-3.png', order: 0 } },
    },
  })

  // 4. Appartement F2 – Yopougon (rented by locataire)
  const p4 = await db.property.create({
    data: {
      title: 'Appartement F2 – Yopougon',
      description:
        "Appartement F2 fonctionnel à Yopougon Sipimap, proche des transports et commodités. Séjour lumineux, 2 chambres avec placards, cuisine aménagée. Résidence calme et familiale avec aire de jeux pour enfants.",
      type: 'APPARTEMENT',
      status: 'ACTIVE',
      rentalStatus: 'loue',
      price: 90000,
      currency: 'FCFA',
      area: 55,
      bedrooms: 2,
      bathrooms: 1,
      address: 'Yopougon Sipimap',
      city: 'Abidjan',
      commune: 'Yopougon',
      latitude: 5.34,
      longitude: -4.09,
      isFurnished: false,
      isVerified: false,
      hasParking: false,
      hasGarden: false,
      hasPool: false,
      hasGuardian: false,
      hasClimate: false,
      amenities: JSON.stringify(['cuisine_equipee', 'placards', 'aire_jeux']),
      rentalTerms: JSON.stringify({
        caution: 180000,
        dureeBail: '12 mois renouvelable',
        chargesIncluses: ['Entretien parties communes'],
        chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
        modePaiement: ['Virement bancaire', 'Mobile Money'],
        conditions: ['Justificatif de revenus', "Pièce d'identité valide"],
        etatLieux: "État des lieux à l'entrée et à la sortie",
        preavis: '2 mois',
      }),
      viewsCount: 67,
      ownerId,
      images: { create: { url: '/images/property-4.png', order: 0 } },
    },
  })

  // 5. Duplex Moderne – Abobo
  const p5 = await db.property.create({
    data: {
      title: 'Duplex Moderne – Abobo',
      description:
        "Duplex meublé moderne à Abobo Avocatier. Réparti sur 2 niveaux : en bas, séjour ouvert sur cuisine américaine et WC visiteurs ; en haut, 3 chambres et 2 salles de bain. Terrasse rooftop avec vue panoramique.",
      type: 'DUPLEX',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 180000,
      currency: 'FCFA',
      area: 120,
      bedrooms: 3,
      bathrooms: 2,
      address: 'Abobo Avocatier',
      city: 'Abidjan',
      commune: 'Abobo',
      latitude: 5.38,
      longitude: -4.04,
      isFurnished: true,
      isVerified: true,
      hasParking: true,
      hasGarden: false,
      hasPool: false,
      hasGuardian: false,
      hasClimate: true,
      amenities: JSON.stringify([
        'wifi', 'climatisation', 'parking', 'cuisine_equipee', 'machine_laver',
        'refrigerateur', 'television', 'terrasse', 'placards',
      ]),
      rentalTerms: JSON.stringify({
        caution: 540000,
        dureeBail: '12 mois renouvelable',
        chargesIncluses: ['Entretien'],
        chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
        modePaiement: ['Virement bancaire', 'Wave', 'Orange Money'],
        conditions: [
          'Garant obligatoire', 'Justificatif de revenus (3x le loyer)',
          "Pièce d'identité valide",
        ],
        etatLieux: "État des lieux à l'entrée et à la sortie",
        preavis: '2 mois',
      }),
      viewsCount: 178,
      ownerId,
      images: { create: { url: '/images/property-5.png', order: 0 } },
    },
  })

  // 6. Penthouse – Riviera Palmeraie
  const p6 = await db.property.create({
    data: {
      title: 'Penthouse – Riviera Palmeraie',
      description:
        "Penthouse d'exception à Riviera Palmeraie avec vue lagunaire. Grand salon cathédrale, cuisine haut de gamme, suite master avec dressing et salle de bain attenante, 3 chambres supplémentaires. Piscine privée sur terrasse panoramique. Prestations luxe.",
      type: 'PENTHOUSE',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 500000,
      currency: 'FCFA',
      area: 180,
      bedrooms: 4,
      bathrooms: 3,
      address: 'Riviera Palmeraie',
      city: 'Abidjan',
      commune: 'Riviera',
      latitude: 5.37,
      longitude: -3.95,
      isFurnished: true,
      isVerified: true,
      hasParking: true,
      hasGarden: true,
      hasPool: true,
      hasGuardian: true,
      hasClimate: true,
      amenities: JSON.stringify([
        'wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee',
        'machine_laver', 'refrigerateur', 'television', 'balcon', 'piscine',
        'terrasse', 'placards', 'dressing', 'ascenseur', 'jardin',
      ]),
      rentalTerms: JSON.stringify({
        caution: 3000000,
        dureeBail: '24 mois renouvelable',
        chargesIncluses: ['Eau', 'Gardiennage', 'Entretien parties communes', 'Piscine', 'Ascenseur'],
        chargesNonIncluses: ['Électricité', 'Internet', 'Entretien piscine privé'],
        modePaiement: ['Virement bancaire'],
        conditions: [
          'Garant obligatoire', 'Justificatif de revenus (5x le loyer)',
          "Attestation de l'employeur", "Pièce d'identité valide",
          'Références bancaires', "Photo d'identité",
        ],
        etatLieux: "État des lieux contradictoire détaillé avec photos à l'entrée et à la sortie",
        preavis: '3 mois',
      }),
      viewsCount: 304,
      ownerId,
      images: { create: { url: '/images/property-6.png', order: 0 } },
    },
  })

  // 7. Appartement F4 – Deux Plateaux
  const p7 = await db.property.create({
    data: {
      title: 'Appartement F4 – Deux Plateaux',
      description:
        "Appartement F4 lumineux à Deux Plateaux, quartier calme et résidentiel. Grand séjour, cuisine séparée, 4 chambres dont une suite parentale. Balcon filant. Charges incluses dans le loyer.",
      type: 'APPARTEMENT',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 220000,
      currency: 'FCFA',
      area: 110,
      bedrooms: 4,
      bathrooms: 2,
      address: 'Deux Plateaux',
      city: 'Abidjan',
      commune: 'Cocody',
      latitude: 5.345,
      longitude: -3.96,
      isFurnished: false,
      isVerified: true,
      hasParking: true,
      hasGarden: false,
      hasPool: false,
      hasGuardian: true,
      hasClimate: true,
      amenities: JSON.stringify([
        'wifi', 'climatisation', 'parking', 'gardien', 'cuisine_equipee',
        'machine_laver', 'refrigerateur', 'television', 'balcon', 'placards',
      ]),
      rentalTerms: JSON.stringify({
        caution: 660000,
        dureeBail: '12 mois renouvelable',
        chargesIncluses: ['Eau', 'Gardiennage', 'Entretien parties communes'],
        chargesNonIncluses: ['Électricité', 'Internet'],
        modePaiement: ['Virement bancaire', 'Mobile Money'],
        conditions: [
          'Garant obligatoire', 'Justificatif de revenus (3x le loyer)',
          "Attestation de l'employeur", "Pièce d'identité valide",
        ],
        etatLieux: "État des lieux contradictoire à l'entrée et à la sortie",
        preavis: '3 mois',
      }),
      viewsCount: 178,
      ownerId,
      images: { create: { url: '/images/property-1.png', order: 0 } },
    },
  })

  // 8. Studio Climatisé – Treichville
  const p8 = await db.property.create({
    data: {
      title: 'Studio Climatisé – Treichville',
      description:
        "Studio climatisé à Treichville, idéalement situé près du marché et de la gare. Pièce principale avec coin nuit séparé par un claustra, kitchenette, salle de douche moderne. Immeuble rénové récemment.",
      type: 'STUDIO',
      status: 'ACTIVE',
      rentalStatus: 'disponible',
      price: 65000,
      currency: 'FCFA',
      area: 28,
      bedrooms: null,
      bathrooms: 1,
      address: 'Treichville',
      city: 'Abidjan',
      commune: 'Treichville',
      latitude: 5.298,
      longitude: -4.03,
      isFurnished: true,
      isVerified: false,
      hasParking: false,
      hasGarden: false,
      hasPool: false,
      hasGuardian: false,
      hasClimate: true,
      amenities: JSON.stringify(['climatisation', 'cuisine_equipee', 'refrigerateur']),
      rentalTerms: JSON.stringify({
        caution: 130000,
        dureeBail: '6 mois renouvelable',
        chargesIncluses: ['Entretien'],
        chargesNonIncluses: ['Eau', 'Électricité', 'Internet'],
        modePaiement: ['Mobile Money', 'Espèces'],
        conditions: ['Justificatif de revenus', "Pièce d'identité valide"],
        etatLieux: "État des lieux à l'entrée et à la sortie",
        preavis: '1 mois',
      }),
      viewsCount: 89,
      ownerId,
      images: { create: { url: '/images/property-2.png', order: 0 } },
    },
  })

  console.log(`✅ Properties created: ${[p1, p2, p3, p4, p5, p6, p7, p8].length}`)

  // ─── 4. Create Rental File for locataire ─────────────────────────────────────
  const rentalFile = await db.rentalFile.create({
    data: {
      tenantId: locataire.id,
      status: 'SUBMITTED',
      tenantCategory: 'SALARIE',
      monthlyIncome: 450000,
      employer: 'SOTRA',
      employmentType: 'CDI',
      guarantorName: 'Ibrahim Ouattara',
      guarantorPhone: '+225 07 08 09 10',
      guarantorRelation: 'parent',
      documents: {
        create: [
          { type: 'ID_CARD', name: 'carte_identite_moussa.pdf', url: 'seed', status: 'VALIDATED' },
          { type: 'EMPLOYMENT_CONTRACT', name: 'contrat_travail_sotra.pdf', url: 'seed', status: 'VALIDATED' },
          { type: 'BANK_STATEMENT', name: 'releve_bancaire_3mois.pdf', url: 'seed', status: 'PENDING' },
        ],
      },
    },
  })

  console.log(`✅ Rental file created for ${locataire.email}`)

  // ─── 5. Create Owner File for proprietaire ───────────────────────────────────
  const ownerFile = await db.ownerFile.create({
    data: {
      ownerId: proprietaire.id,
      status: 'VALIDATED',
      documents: {
        create: [
          { type: 'ID_CARD', name: 'carte_identite_aminata.pdf', url: 'seed', status: 'VALIDATED' },
          { type: 'PROPERTY_TITLE', name: 'titre_propriete_cocody.pdf', url: 'seed', status: 'VALIDATED' },
          { type: 'UTILITY_BILL', name: 'facture_cie_dec2024.pdf', url: 'seed', status: 'VALIDATED' },
          { type: 'BANK_ACCOUNT_DETAILS', name: 'rib_bicici.pdf', url: 'seed', status: 'VALIDATED' },
        ],
      },
    },
  })

  console.log(`✅ Owner file created for ${proprietaire.email}`)

  // ─── 6. Create Lease for locataire@montoit.ci ────────────────────────────────
  const now = new Date()
  const leaseStart = new Date(now.getFullYear() - 1, 0, 1) // Jan 1 last year
  const leaseEnd = new Date(now.getFullYear(), 11, 31) // Dec 31 this year

  const lease = await db.lease.create({
    data: {
      propertyId: p4.id,
      tenantId: locataire.id,
      ownerId: proprietaire.id,
      rentalFileId: rentalFile.id,
      status: 'ACTIVE',
      startDate: leaseStart,
      endDate: leaseEnd,
      monthlyRent: 90000,
      charges: 10000,
      deposit: 180000,
      ownerSignedAt: leaseStart,
      tenantSignedAt: leaseStart,
    },
  })

  // ─── 7. Create Payments for the lease ────────────────────────────────────────
  const paymentMonths = [
    { month: 0, status: 'PAID' as const },
    { month: 1, status: 'PAID' as const },
    { month: 2, status: 'PAID' as const },
    { month: 3, status: 'PAID' as const },
    { month: 4, status: 'PAID' as const },
    { month: 5, status: 'PAID' as const },
    { month: 6, status: 'PAID' as const },
    { month: 7, status: 'PAID' as const },
    { month: 8, status: 'PAID' as const },
    { month: 9, status: 'PAID' as const },
    { month: 10, status: 'PAID' as const },
    { month: 11, status: 'LATE' as const },
  ]

  for (const pm of paymentMonths) {
    const dueDate = new Date(now.getFullYear(), pm.month, 5)
    await db.payment.create({
      data: {
        leaseId: lease.id,
        tenantId: locataire.id,
        amount: 90000,
        status: pm.status,
        dueDate,
        paidAt: pm.status === 'PAID' ? new Date(now.getFullYear(), pm.month, 3) : null,
        reference: `PAY-${now.getFullYear()}${String(pm.month + 1).padStart(2, '0')}`,
      },
    })
  }

  console.log(`✅ Lease & payments created for ${locataire.email}`)

  // ─── 8. Create Maintenance Request ───────────────────────────────────────
  await db.maintenanceRequest.create({
    data: {
      leaseId: lease.id,
      tenantId: locataire.id,
      title: 'Fuite robinet cuisine',
      description: 'Le robinet de la cuisine fuit depuis quelques jours. Besoin intervention plombier.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
    },
  })

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
