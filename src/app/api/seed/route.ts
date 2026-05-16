import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const DEMO_PASSWORD = 'demo1234'

export async function POST() {
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

    // Clean up existing data
    await db.maintenanceRequest.deleteMany()
    await db.payment.deleteMany()
    await db.notification.deleteMany()
    await db.validationSLA.deleteMany()
    await db.dispute.deleteMany()
    await db.rating.deleteMany()
    await db.message.deleteMany()
    await db.conversation.deleteMany()
    await db.lease.deleteMany()
    await db.rentalFileDocument.deleteMany()
    await db.rentalFile.deleteMany()
    await db.ownershipDocument.deleteMany()
    await db.visitRequest.deleteMany()
    await db.propertyImage.deleteMany()
    await db.property.deleteMany()
    await db.auditLog.deleteMany()
    await db.oTPCode.deleteMany()
    await db.session.deleteMany()
    await db.user.deleteMany()

    // ─── Create Users ───────────────────────────────────────────────────
    const admin = await db.user.create({
      data: {
        phone: '+22501010101',
        firstName: 'Admin',
        lastName: 'Toit',
        email: 'admin@montoit.ci',
        passwordHash,
        role: 'ADMIN',
        activeRole: 'ADMIN',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    const tc = await db.user.create({
      data: {
        phone: '+22502020202',
        firstName: 'Aya',
        lastName: 'Diabaté',
        email: 'tc@montoit.ci',
        passwordHash,
        role: 'TIERS_CONFIANCE',
        activeRole: 'TIERS_CONFIANCE',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    // Propriétaires
    const owner1 = await db.user.create({
      data: {
        phone: '+22503030303',
        firstName: 'Kouadio',
        lastName: 'Yao',
        email: 'proprietaire@montoit.ci',
        passwordHash,
        role: 'PROPRIETAIRE',
        activeRole: 'PROPRIETAIRE',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    const owner2 = await db.user.create({
      data: {
        phone: '+22504040404',
        firstName: 'Awa',
        lastName: 'Diallo',
        email: 'awa.diallo@email.ci',
        passwordHash,
        role: 'PROPRIETAIRE',
        activeRole: 'PROPRIETAIRE',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    // Locataires
    const tenant1 = await db.user.create({
      data: {
        phone: '+22505050505',
        firstName: 'Moussa',
        lastName: 'Koné',
        email: 'locataire@montoit.ci',
        passwordHash,
        role: 'LOCATAIRE',
        activeRole: 'LOCATAIRE',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    const tenant2 = await db.user.create({
      data: {
        phone: '+22506060606',
        firstName: 'Fatou',
        lastName: 'Bamba',
        email: 'fatou.b@email.ci',
        passwordHash,
        role: 'LOCATAIRE',
        activeRole: 'LOCATAIRE',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    const tenant3 = await db.user.create({
      data: {
        phone: '+22507070707',
        firstName: 'Jean',
        lastName: 'Coulibaly',
        email: 'jean.c@email.ci',
        passwordHash,
        role: 'LOCATAIRE',
        activeRole: 'LOCATAIRE',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    })

    // ─── Create Properties ──────────────────────────────────────────────
    const propertyImages = [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    ]

    const propertiesData = [
      {
        title: 'Appartement F3 Cocody',
        description: 'Bel appartement F3 dans une résidence sécurisée à Cocody. Vue dégagée, climatisation, cuisine équipée.',
        type: 'APPARTEMENT' as const,
        price: 250000,
        area: 85,
        bedrooms: 2,
        bathrooms: 1,
        address: 'Riviera 3, Cocody',
        city: 'Abidjan',
        commune: 'Cocody',
        isFurnished: true,
        hasParking: true,
        hasGarden: false,
        hasPool: true,
        ownerId: owner1.id,
        images: [propertyImages[0], propertyImages[1]],
      },
      {
        title: 'Studio Meublé Plateau',
        description: 'Studio entièrement meublé au cœur du Plateau. Idéal pour jeune professionnel. Proche commodités.',
        type: 'STUDIO' as const,
        price: 120000,
        area: 35,
        bedrooms: null,
        bathrooms: 1,
        address: 'Avenue Franchet d\'Espérey, Plateau',
        city: 'Abidjan',
        commune: 'Plateau',
        isFurnished: true,
        hasParking: false,
        hasGarden: false,
        hasPool: false,
        ownerId: owner1.id,
        images: [propertyImages[2]],
      },
      {
        title: 'Villa 4 Chambres Marcory',
        description: 'Magnifique villa 4 chambres avec jardin et piscine à Marcory. Quartier résidentiel calme.',
        type: 'VILLA' as const,
        status: 'PENDING_VERIFICATION' as const,
        price: 450000,
        area: 220,
        bedrooms: 4,
        bathrooms: 3,
        address: 'Zone 4, Marcory',
        city: 'Abidjan',
        commune: 'Marcory',
        isFurnished: false,
        hasParking: true,
        hasGarden: true,
        hasPool: true,
        ownerId: owner1.id,
        images: [propertyImages[3]],
      },
      {
        title: 'Appartement F2 Yopougon',
        description: 'Appartement F2 rénové à Yopougon. Proche marché et transports. Loyer très abordable.',
        type: 'APPARTEMENT' as const,
        price: 80000,
        area: 55,
        bedrooms: 1,
        bathrooms: 1,
        address: 'Sogefiha, Yopougon',
        city: 'Abidjan',
        commune: 'Yopougon',
        isFurnished: false,
        hasParking: false,
        hasGarden: false,
        hasPool: false,
        ownerId: owner2.id,
        images: [propertyImages[4]],
      },
      {
        title: 'Duplex Riviera Palmeraie',
        description: 'Superbe duplex standing à la Riviera Palmeraie. Finitions haut de gamme, vue lagune.',
        type: 'DUPLEX' as const,
        status: 'PENDING_VERIFICATION' as const,
        price: 600000,
        area: 180,
        bedrooms: 3,
        bathrooms: 2,
        address: 'Riviera Palmeraie',
        city: 'Abidjan',
        commune: 'Cocody',
        isFurnished: true,
        hasParking: true,
        hasGarden: true,
        hasPool: true,
        ownerId: owner2.id,
        images: [propertyImages[5], propertyImages[0]],
      },
      {
        title: 'Penthouse Zone 4',
        description: 'Penthouse de luxe avec terrasse panoramique. Vue imprenable sur la lagune Ébrié.',
        type: 'PENTHOUSE' as const,
        price: 850000,
        area: 200,
        bedrooms: 3,
        bathrooms: 2,
        address: 'Zone 4, Marcory',
        city: 'Abidjan',
        commune: 'Marcory',
        isFurnished: true,
        hasParking: true,
        hasGarden: false,
        hasPool: true,
        ownerId: owner2.id,
        images: [propertyImages[3], propertyImages[5]],
      },
    ]

    const createdProperties = []
    for (const pData of propertiesData) {
      const { images, ...data } = pData
      const property = await db.property.create({
        data: {
          ...data,
          images: {
            create: images.map((url, i) => ({ url, order: i })),
          },
        },
      })
      createdProperties.push(property)
    }

    // ─── Create Rental Files ────────────────────────────────────────────
    const rentalFile1 = await db.rentalFile.create({
      data: {
        tenantId: tenant1.id,
        status: 'VALIDATED',
        monthlyIncome: 500000,
        employer: 'Orange CI',
        employmentType: 'CDI',
        guarantorName: 'Ibrahim Koné',
        guarantorPhone: '+22508080808',
        guarantorRelation: 'Père',
        reviewedById: tc.id,
        reviewedAt: new Date(),
        documents: {
          create: [
            { type: 'ID_CARD', url: '/docs/id_koné.pdf', name: 'Carte d\'identité', status: 'VALIDATED' },
            { type: 'PAY_SLIP', url: '/docs/pay_koné.pdf', name: 'Fiche de paie', status: 'VALIDATED' },
            { type: 'EMPLOYMENT_CONTRACT', url: '/docs/contract_koné.pdf', name: 'Contrat de travail', status: 'VALIDATED' },
          ],
        },
      },
    })

    const rentalFile2 = await db.rentalFile.create({
      data: {
        tenantId: tenant2.id,
        status: 'TC_REVIEW',
        monthlyIncome: 350000,
        employer: 'SODECI',
        employmentType: 'CDI',
        documents: {
          create: [
            { type: 'ID_CARD', url: '/docs/id_bamba.pdf', name: 'Carte d\'identité', status: 'VALIDATED' },
            { type: 'PAY_SLIP', url: '/docs/pay_bamba.pdf', name: 'Fiche de paie', status: 'PENDING' },
            { type: 'BANK_STATEMENT', url: '/docs/bank_bamba.pdf', name: 'Relevé bancaire', status: 'PENDING' },
          ],
        },
      },
    })

    const rentalFile3 = await db.rentalFile.create({
      data: {
        tenantId: tenant3.id,
        status: 'SUBMITTED',
        monthlyIncome: 280000,
        employer: 'Free-lance',
        employmentType: 'FREELANCE',
        guarantorName: 'Marie Coulibaly',
        guarantorPhone: '+22509090909',
        guarantorRelation: 'Sœur',
        documents: {
          create: [
            { type: 'PASSPORT', url: '/docs/pass_coulibaly.pdf', name: 'Passeport', status: 'PENDING' },
            { type: 'BANK_STATEMENT', url: '/docs/bank_coulibaly.pdf', name: 'Relevé bancaire', status: 'PENDING' },
            { type: 'GUARANTOR_ID', url: '/docs/guarantor_coulibaly.pdf', name: 'Pièce garant', status: 'PENDING' },
          ],
        },
      },
    })

    // ─── Create Leases ──────────────────────────────────────────────────
    const lease1 = await db.lease.create({
      data: {
        propertyId: createdProperties[0].id,
        tenantId: tenant1.id,
        ownerId: owner1.id,
        rentalFileId: rentalFile1.id,
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-12-31'),
        monthlyRent: 250000,
        charges: 25000,
        deposit: 500000,
        ownerSignedAt: new Date('2025-01-01'),
        tenantSignedAt: new Date('2025-01-02'),
      },
    })

    // ─── Create Additional Leases (for "Mes locataires" feature) ──────
    const lease2 = await db.lease.create({
      data: {
        propertyId: createdProperties[2].id,
        tenantId: tenant2.id,
        ownerId: owner1.id,
        rentalFileId: rentalFile2.id,
        status: 'ACTIVE',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2027-02-28'),
        monthlyRent: 450000,
        charges: 50000,
        deposit: 900000,
        ownerSignedAt: new Date('2025-03-01'),
        tenantSignedAt: new Date('2025-03-02'),
      },
    })

    const lease3 = await db.lease.create({
      data: {
        propertyId: createdProperties[1].id,
        tenantId: tenant3.id,
        ownerId: owner1.id,
        rentalFileId: rentalFile3.id,
        status: 'ACTIVE',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2026-05-31'),
        monthlyRent: 120000,
        charges: 10000,
        deposit: 240000,
        ownerSignedAt: new Date('2025-06-01'),
        tenantSignedAt: new Date('2025-06-02'),
      },
    })

    const lease4 = await db.lease.create({
      data: {
        propertyId: createdProperties[3].id,
        tenantId: tenant1.id,
        ownerId: owner2.id,
        rentalFileId: rentalFile1.id,
        status: 'TERMINATED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        monthlyRent: 80000,
        charges: 5000,
        deposit: 160000,
        ownerSignedAt: new Date('2023-01-01'),
        tenantSignedAt: new Date('2023-01-02'),
        specialConditions: 'Animaux de compagnie non autorisés. Pas de sous-location.',
      },
    })

    const lease5 = await db.lease.create({
      data: {
        propertyId: createdProperties[4].id,
        tenantId: tenant3.id,
        ownerId: owner2.id,
        rentalFileId: rentalFile3.id,
        status: 'ACTIVE',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2027-08-31'),
        monthlyRent: 600000,
        charges: 75000,
        deposit: 1200000,
        ownerSignedAt: new Date('2025-09-01'),
        tenantSignedAt: new Date('2025-09-03'),
      },
    })

    // ─── Create Second Active Lease for tenant1 (with owner2) ─────────
    const lease6 = await db.lease.create({
      data: {
        propertyId: createdProperties[5].id, // Penthouse Zone 4 (owner2)
        tenantId: tenant1.id,
        ownerId: owner2.id,
        rentalFileId: rentalFile1.id,
        status: 'ACTIVE',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2027-05-31'),
        monthlyRent: 850000,
        charges: 100000,
        deposit: 1700000,
        ownerSignedAt: new Date('2025-06-01'),
        tenantSignedAt: new Date('2025-06-03'),
        specialConditions: 'Utilisation exclusive de la terrasse panoramique. Pas d\'animaux.',
      },
    })

    // ─── Create Additional Payments ─────────────────────────────────────
    // Payments for lease2 (tenant2 - Fatou Bamba, Villa Marcory)
    await db.payment.createMany({
      data: [
        {
          leaseId: lease2.id,
          tenantId: tenant2.id,
          amount: 450000,
          status: 'PAID',
          dueDate: new Date('2025-03-01'),
          paidAt: new Date('2025-03-02'),
          reference: 'PMT-2025-010',
        },
        {
          leaseId: lease2.id,
          tenantId: tenant2.id,
          amount: 450000,
          status: 'PAID',
          dueDate: new Date('2025-04-01'),
          paidAt: new Date('2025-04-01'),
          reference: 'PMT-2025-011',
        },
        {
          leaseId: lease2.id,
          tenantId: tenant2.id,
          amount: 450000,
          status: 'LATE',
          dueDate: new Date('2025-02-01'),
          reference: 'PMT-2025-012',
        },
        {
          leaseId: lease2.id,
          tenantId: tenant2.id,
          amount: 450000,
          status: 'PENDING',
          dueDate: new Date('2025-05-01'),
          reference: 'PMT-2025-013',
        },
      ],
    })

    // Payments for lease3 (tenant3 - Jean Coulibaly, Studio Plateau)
    await db.payment.createMany({
      data: [
        {
          leaseId: lease3.id,
          tenantId: tenant3.id,
          amount: 120000,
          status: 'PAID',
          dueDate: new Date('2025-06-01'),
          paidAt: new Date('2025-06-03'),
          reference: 'PMT-2025-020',
        },
        {
          leaseId: lease3.id,
          tenantId: tenant3.id,
          amount: 120000,
          status: 'PAID',
          dueDate: new Date('2025-07-01'),
          paidAt: new Date('2025-07-01'),
          reference: 'PMT-2025-021',
        },
        {
          leaseId: lease3.id,
          tenantId: tenant3.id,
          amount: 120000,
          status: 'PENDING',
          dueDate: new Date('2025-08-01'),
          reference: 'PMT-2025-022',
        },
      ],
    })

    // Payments for lease4 (tenant1 - Moussa Koné, terminated lease)
    await db.payment.createMany({
      data: [
        {
          leaseId: lease4.id,
          tenantId: tenant1.id,
          amount: 80000,
          status: 'PAID',
          dueDate: new Date('2024-11-01'),
          paidAt: new Date('2024-11-02'),
          reference: 'PMT-2024-110',
        },
        {
          leaseId: lease4.id,
          tenantId: tenant1.id,
          amount: 80000,
          status: 'PAID',
          dueDate: new Date('2024-12-01'),
          paidAt: new Date('2024-12-01'),
          reference: 'PMT-2024-112',
        },
      ],
    })

    // Payments for lease5 (tenant3 - Jean Coulibaly, Duplex Riviera)
    await db.payment.createMany({
      data: [
        {
          leaseId: lease5.id,
          tenantId: tenant3.id,
          amount: 600000,
          status: 'PAID',
          dueDate: new Date('2025-09-01'),
          paidAt: new Date('2025-09-02'),
          reference: 'PMT-2025-030',
        },
        {
          leaseId: lease5.id,
          tenantId: tenant3.id,
          amount: 600000,
          status: 'LATE',
          dueDate: new Date('2025-10-01'),
          reference: 'PMT-2025-031',
        },
        {
          leaseId: lease5.id,
          tenantId: tenant3.id,
          amount: 600000,
          status: 'PENDING',
          dueDate: new Date('2025-11-01'),
          reference: 'PMT-2025-032',
        },
      ],
    })

    // Payments for lease6 (tenant1 - Moussa Koné, Penthouse Zone 4 with owner2)
    await db.payment.createMany({
      data: [
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PAID',
          dueDate: new Date('2025-06-01'),
          paidAt: new Date('2025-06-02'),
          reference: 'PMT-2025-040',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PAID',
          dueDate: new Date('2025-07-01'),
          paidAt: new Date('2025-07-01'),
          reference: 'PMT-2025-041',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PAID',
          dueDate: new Date('2025-08-01'),
          paidAt: new Date('2025-08-03'),
          reference: 'PMT-2025-042',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PAID',
          dueDate: new Date('2025-09-01'),
          paidAt: new Date('2025-09-01'),
          reference: 'PMT-2025-043',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PAID',
          dueDate: new Date('2025-10-01'),
          paidAt: new Date('2025-10-02'),
          reference: 'PMT-2025-044',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PAID',
          dueDate: new Date('2025-11-01'),
          paidAt: new Date('2025-11-01'),
          reference: 'PMT-2025-045',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'LATE',
          dueDate: new Date('2025-05-01'),
          reference: 'PMT-2025-039',
        },
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          amount: 850000,
          status: 'PENDING',
          dueDate: new Date('2025-12-01'),
          reference: 'PMT-2025-046',
        },
      ],
    })

    // ─── Create Additional Maintenance Requests ────────────────────────
    await db.maintenanceRequest.createMany({
      data: [
        {
          leaseId: lease2.id,
          tenantId: tenant2.id,
          title: 'Fuite toiture véranda',
          description: 'La véranda présente une fuite au niveau de la toiture lors des fortes pluies.',
          status: 'PENDING',
          priority: 'HIGH',
        },
        {
          leaseId: lease3.id,
          tenantId: tenant3.id,
          title: 'Remplacement ampoules couloir',
          description: 'Les ampoules du couloir sont grillées et nécessitent un remplacement.',
          status: 'RESOLVED',
          priority: 'LOW',
        },
      ],
    })

    // ─── Create Visit Requests ──────────────────────────────────────────
    await db.visitRequest.createMany({
      data: [
        {
          propertyId: createdProperties[1].id,
          tenantId: tenant2.id,
          requestedDate: new Date('2026-03-10'),
          timeSlot: '10:00-11:00',
          status: 'PENDING',
        },
        {
          propertyId: createdProperties[3].id,
          tenantId: tenant3.id,
          requestedDate: new Date('2026-03-11'),
          timeSlot: '14:00-15:00',
          status: 'PENDING',
        },
        {
          propertyId: createdProperties[0].id,
          tenantId: tenant2.id,
          requestedDate: new Date('2026-03-05'),
          timeSlot: '09:00-10:00',
          status: 'COMPLETED',
        },
        {
          propertyId: createdProperties[4].id,
          tenantId: tenant1.id,
          requestedDate: new Date('2026-03-12'),
          timeSlot: '11:00-12:00',
          status: 'ACCEPTED',
        },
      ],
    })

    // ─── Create Ownership Documents ─────────────────────────────────────
    await db.ownershipDocument.createMany({
      data: [
        {
          ownerId: owner1.id,
          type: 'TITRE_FONCIER',
          url: '/docs/tf_yao.pdf',
          name: 'Titre foncier - Cocody',
          status: 'PENDING',
        },
        {
          ownerId: owner2.id,
          type: 'ATTESTATION_PROPRIETE',
          url: '/docs/att_diallo.pdf',
          name: 'Attestation de propriété - Marcory',
          status: 'PENDING',
        },
      ],
    })

    // ─── Create Conversations & Messages ────────────────────────────────
    const conv1 = await db.conversation.create({
      data: {
        participant1Id: tenant1.id,
        participant2Id: owner1.id,
        propertyId: createdProperties[0].id,
        lastMessageAt: new Date(),
        messages: {
          create: [
            {
              senderId: tenant1.id,
              content: 'Bonjour, je suis intéressé par l\'appartement F3 à Cocody. Est-il toujours disponible ?',
            },
            {
              senderId: owner1.id,
              content: 'Bonsoir ! Oui, l\'appartement est toujours disponible. Souhaitez-vous planifier une visite ?',
            },
            {
              senderId: tenant1.id,
              content: 'Oui, quand serais-je disponible cette semaine ?',
            },
          ],
        },
      },
    })

    await db.message.updateMany({
      where: { conversationId: conv1.id, senderId: owner1.id, isRead: false },
      data: { isRead: true },
    })

    const conv2 = await db.conversation.create({
      data: {
        participant1Id: tenant2.id,
        participant2Id: owner2.id,
        propertyId: createdProperties[3].id,
        lastMessageAt: new Date(),
        messages: {
          create: [
            {
              senderId: tenant2.id,
              content: 'Bonjour Madame Diallo, l\'appartement F2 à Yopougon est-il meublé ?',
            },
            {
              senderId: owner2.id,
              content: 'Bonjour ! Non, il n\'est pas meublé, mais il est bien renové. N\'hésitez pas à venir visiter.',
            },
          ],
        },
      },
    })

    await db.message.updateMany({
      where: { conversationId: conv2.id, senderId: owner2.id, isRead: false },
      data: { isRead: true },
    })

    // Conversation between tenant1 and owner2 (Penthouse Zone 4)
    const conv3 = await db.conversation.create({
      data: {
        participant1Id: tenant1.id,
        participant2Id: owner2.id,
        propertyId: createdProperties[5].id,
        lastMessageAt: new Date(),
        messages: {
          create: [
            {
              senderId: tenant1.id,
              content: 'Bonjour Madame Diallo, le penthouse Zone 4 est-il toujours disponible ?',
            },
            {
              senderId: owner2.id,
              content: 'Bonjour Moussa ! Oui, il est disponible. La vue sur la lagune est magnifique.',
            },
            {
              senderId: tenant1.id,
              content: 'Super ! Est-ce que la terrasse est accessible en toute saison ?',
            },
            {
              senderId: owner2.id,
              content: 'Oui, la terrasse est couverte. Vous pouvez en profiter toute l\'année. N\'hésitez pas à visiter !',
            },
          ],
        },
      },
    })

    await db.message.updateMany({
      where: { conversationId: conv3.id, senderId: owner2.id, isRead: false },
      data: { isRead: true },
    })

    // ─── Create Validation SLAs ─────────────────────────────────────────
    await db.validationSLA.createMany({
      data: [
        {
          entityType: 'RENTAL_FILE',
          entityId: rentalFile2.id,
          submittedAt: new Date(),
          deadlineAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          reviewerId: tc.id,
        },
        {
          entityType: 'RENTAL_FILE',
          entityId: rentalFile3.id,
          submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          reviewerId: tc.id,
        },
      ],
    })

    // ─── Create Payments for tenant1's active lease ────────────────────
    await db.payment.createMany({
      data: [
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          amount: 250000,
          status: 'PAID',
          dueDate: new Date('2025-01-01'),
          paidAt: new Date('2025-01-03'),
          reference: 'PMT-2025-001',
        },
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          amount: 250000,
          status: 'PAID',
          dueDate: new Date('2025-02-01'),
          paidAt: new Date('2025-02-02'),
          reference: 'PMT-2025-002',
        },
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          amount: 250000,
          status: 'PAID',
          dueDate: new Date('2025-03-01'),
          paidAt: new Date('2025-03-01'),
          reference: 'PMT-2025-003',
        },
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          amount: 250000,
          status: 'PENDING',
          dueDate: new Date('2025-04-01'),
          reference: 'PMT-2025-004',
        },
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          amount: 250000,
          status: 'LATE',
          dueDate: new Date('2024-12-01'),
          reference: 'PMT-2024-012',
        },
      ],
    })

    // ─── Create Notifications for tenant1 ────────────────────────────────
    await db.notification.createMany({
      data: [
        {
          userId: tenant1.id,
          type: 'MESSAGE',
          title: 'Nouveau message',
          message: 'Nouveau message de Kouadio Yao',
          isRead: false,
          actionUrl: '/dashboard?section=messages',
        },
        {
          userId: tenant1.id,
          type: 'DOSSIER_UPDATE',
          title: 'Dossier locatif',
          message: 'Votre dossier locatif a été validé',
          isRead: true,
          actionUrl: '/dashboard?section=my-applications',
        },
        {
          userId: tenant1.id,
          type: 'VISIT_REMINDER',
          title: 'Rappel de visite',
          message: 'Rappel : visite prévue le 12 mars',
          isRead: false,
          actionUrl: '/dashboard?section=my-visits',
        },
        {
          userId: tenant1.id,
          type: 'PAYMENT_ALERT',
          title: 'Paiement en retard',
          message: 'Paiement en retard - décembre 2024',
          isRead: false,
          actionUrl: '/dashboard?section=my-leases',
        },
        {
          userId: tenant1.id,
          type: 'SYSTEM',
          title: 'Bienvenue',
          message: 'Bienvenue sur Mon Toit !',
          isRead: true,
        },
        {
          userId: tenant1.id,
          type: 'PROMOTION',
          title: 'Offre spéciale',
          message: 'Offre spéciale : premiers mois réduits',
          isRead: false,
        },
        // Additional notifications for tenant1
        {
          userId: tenant1.id,
          type: 'MESSAGE',
          title: 'Nouveau message',
          message: 'Nouveau message de Awa Diallo',
          isRead: false,
          actionUrl: '/dashboard?section=messages',
        },
        {
          userId: tenant1.id,
          type: 'PAYMENT_ALERT',
          title: 'Rappel de paiement',
          message: 'Paiement en attente - Penthouse Zone 4, décembre 2025',
          isRead: false,
          actionUrl: '/dashboard?section=my-leases',
        },
        {
          userId: tenant1.id,
          type: 'PAYMENT_ALERT',
          title: 'Paiement en retard',
          message: 'Paiement en retard - Penthouse Zone 4, mai 2025',
          isRead: false,
          actionUrl: '/dashboard?section=my-leases',
        },
        {
          userId: tenant1.id,
          type: 'DOSSIER_UPDATE',
          title: 'Baux actifs',
          message: 'Vous avez 2 baux actifs : Appartement F3 Cocody et Penthouse Zone 4',
          isRead: true,
          actionUrl: '/dashboard?section=my-leases',
        },
        {
          userId: tenant1.id,
          type: 'SYSTEM',
          title: 'Profil partagé',
          message: 'Votre profil locataire a été partagé avec succès',
          isRead: true,
        },
      ],
    })

    // ─── Create MaintenanceRequests for tenant1's active lease ──────────
    await db.maintenanceRequest.createMany({
      data: [
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          title: 'Réparation robinet cuisine',
          description: 'Le robinet de la cuisine fuit depuis quelques jours. Une réparation est nécessaire pour éviter le gaspillage d\'eau.',
          status: 'RESOLVED',
          priority: 'MEDIUM',
          resolution: 'Robinets remplacés par le plombier mandaté par le propriétaire le 15/02/2025.',
        },
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          title: 'Climatisation défaillante chambre 2',
          description: 'La climatisation de la chambre 2 ne souffle plus d\'air froid. Le compresseur semble défaillant.',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        },
        {
          leaseId: lease1.id,
          tenantId: tenant1.id,
          title: 'Porte d\'entrée difficile à fermer',
          description: 'La porte d\'entrée nécessite un effort important pour se fermer correctement. La serrure semble légèrement décalée.',
          status: 'PENDING',
          priority: 'LOW',
        },
        // Maintenance request for tenant1's second lease (Penthouse Zone 4)
        {
          leaseId: lease6.id,
          tenantId: tenant1.id,
          title: 'Fuite terrasse panoramique',
          description: 'La terrasse panoramique présente une infiltration d\'eau au niveau du joint d\'étanchéité lors des pluies torrentielles.',
          status: 'PENDING',
          priority: 'HIGH',
        },
      ],
    })

    // ─── Create AuditLog entries for tenant1 ─────────────────────────────
    await db.auditLog.createMany({
      data: [
        {
          userId: tenant1.id,
          action: 'LOGIN',
          entity: 'SESSION',
          details: 'Connexion depuis Abidjan, Côte d\'Ivoire',
        },
        {
          userId: tenant1.id,
          action: 'PROFILE_UPDATE',
          entity: 'USER',
          entityId: tenant1.id,
          details: 'Mise à jour des informations personnelles',
        },
        {
          userId: tenant1.id,
          action: 'DOSSIER_SUBMIT',
          entity: 'RENTAL_FILE',
          entityId: rentalFile1.id,
          details: 'Soumission du dossier locatif pour Appartement F3 Cocody',
        },
        {
          userId: tenant1.id,
          action: 'FAVORITE_ADD',
          entity: 'PROPERTY',
          entityId: createdProperties[0].id,
          details: 'Ajout du bien "Appartement F3 Cocody" aux favoris',
        },
        {
          userId: tenant1.id,
          action: 'VISIT_REQUEST',
          entity: 'PROPERTY',
          entityId: createdProperties[4].id,
          details: 'Demande de visite pour Duplex Riviera Palmeraie',
        },
        {
          userId: tenant1.id,
          action: 'PAYMENT_MADE',
          entity: 'PAYMENT',
          details: 'Paiement de 250 000 FCFA — référence PMT-2025-003',
        },
      ],
    })

    // ─── Create Rating for tenant1 (rating owner1) ───────────────────────
    await db.rating.create({
      data: {
        leaseId: lease1.id,
        fromUserId: tenant1.id,
        toUserId: owner1.id,
        score: 4,
        comment: 'Propriétaire réactif et logement en bon état',
      },
    })

    return NextResponse.json({
      message: 'Données de démonstration créées avec succès',
      demoPassword: DEMO_PASSWORD,
      users: { admin: admin.id, tc: tc.id, owner1: owner1.id, owner2: owner2.id, tenant1: tenant1.id, tenant2: tenant2.id, tenant3: tenant3.id },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Erreur lors du seed', details: String(error) }, { status: 500 })
  }
}
