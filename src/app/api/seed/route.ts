import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Clean up existing data
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
    await db.user.deleteMany()

    // ─── Create Users ───────────────────────────────────────────────────
    const admin = await db.user.create({
      data: {
        phone: '+22501010101',
        firstName: 'Admin',
        lastName: 'Toit',
        email: 'admin@montoit.ci',
        role: 'ADMIN',
        isPhoneVerified: true,
        isActive: true,
      },
    })

    const tc = await db.user.create({
      data: {
        phone: '+22502020202',
        firstName: 'Tiers',
        lastName: 'Confiance',
        email: 'tc@montoit.ci',
        role: 'TIERS_CONFIANCE',
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
        email: 'kouadio@email.ci',
        role: 'PROPRIETAIRE',
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
        role: 'PROPRIETAIRE',
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
        email: 'moussa.k@email.ci',
        role: 'LOCATAIRE',
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
        role: 'LOCATAIRE',
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
        role: 'LOCATAIRE',
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

    return NextResponse.json({
      message: 'Données de démonstration créées avec succès',
      users: { admin: admin.id, tc: tc.id, owner1: owner1.id, owner2: owner2.id, tenant1: tenant1.id, tenant2: tenant2.id, tenant3: tenant3.id },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Erreur lors du seed', details: String(error) }, { status: 500 })
  }
}
