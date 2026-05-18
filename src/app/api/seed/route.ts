import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const DEMO_PASSWORD = 'demo1234'

const uuid = () => crypto.randomUUID()

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient()
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

    const allUuid = '00000000-0000-0000-0000-000000000000'

    await supabase.from('commission').delete().neq('id', allUuid).maybeSingle()
    await supabase.from('agency_agent_properties').delete().neq('id', allUuid)
    await supabase.from('agency_agents').delete().neq('id', allUuid)
    await supabase.from('signalements').delete().neq('id', allUuid)
    await supabase.from('maintenance_requests').delete().neq('id', allUuid)
    await supabase.from('payments').delete().neq('id', allUuid)
    await supabase.from('notifications').delete().neq('id', allUuid)
    await supabase.from('validation_slas').delete().neq('id', allUuid)
    await supabase.from('disputes').delete().neq('id', allUuid)
    await supabase.from('ratings').delete().neq('id', allUuid)
    await supabase.from('messages').delete().neq('id', allUuid)
    await supabase.from('conversations').delete().neq('id', allUuid)
    await supabase.from('leases').delete().neq('id', allUuid)
    await supabase.from('rental_file_documents').delete().neq('id', allUuid)
    await supabase.from('rental_files').delete().neq('id', allUuid)
    await supabase.from('ownership_documents').delete().neq('id', allUuid)
    await supabase.from('visit_requests').delete().neq('id', allUuid)
    await supabase.from('property_images').delete().neq('id', allUuid)
    await supabase.from('properties').delete().neq('id', allUuid)
    await supabase.from('audit_logs').delete().neq('id', allUuid)
    await supabase.from('otp_codes').delete().neq('id', allUuid)
    await supabase.from('users').delete().neq('id', allUuid)
    await supabase.from('mandats').delete().neq('id', allUuid)

    const { data: admin } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22501010101',
        first_name: 'Admin',
        last_name: 'Toit',
        email: 'admin@montoit.ci',
        password_hash: passwordHash,
        role: 'ADMIN',
        active_role: 'ADMIN',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

    const { data: tc } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22502020202',
        first_name: 'Aya',
        last_name: 'Diabaté',
        email: 'tc@montoit.ci',
        password_hash: passwordHash,
        role: 'TIERS_CONFIANCE',
        active_role: 'TIERS_CONFIANCE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

    const { data: owner1 } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22503030303',
        first_name: 'Kouadio',
        last_name: 'Yao',
        email: 'proprietaire@montoit.ci',
        password_hash: passwordHash,
        role: 'PROPRIETAIRE',
        active_role: 'PROPRIETAIRE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

    const { data: owner2 } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22504040404',
        first_name: 'Awa',
        last_name: 'Diallo',
        email: 'awa.diallo@email.ci',
        password_hash: passwordHash,
        role: 'PROPRIETAIRE',
        active_role: 'PROPRIETAIRE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

    const { data: tenant1 } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22505050505',
        first_name: 'Moussa',
        last_name: 'Koné',
        email: 'locataire@montoit.ci',
        password_hash: passwordHash,
        role: 'LOCATAIRE',
        active_role: 'LOCATAIRE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

    const { data: tenant2 } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22506060606',
        first_name: 'Fatou',
        last_name: 'Bamba',
        email: 'fatou.b@email.ci',
        password_hash: passwordHash,
        role: 'LOCATAIRE',
        active_role: 'LOCATAIRE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

    const { data: tenant3 } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22507070707',
        first_name: 'Jean',
        last_name: 'Coulibaly',
        email: 'jean.c@email.ci',
        password_hash: passwordHash,
        role: 'LOCATAIRE',
        active_role: 'LOCATAIRE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
      })
      .select()
      .single() as any

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
        type: 'APPARTEMENT',
        price: 250000,
        area: 85,
        bedrooms: 2,
        bathrooms: 1,
        address: 'Riviera 3, Cocody',
        city: 'Abidjan',
        commune: 'Cocody',
        is_furnished: true,
        has_parking: true,
        has_garden: false,
        has_pool: true,
        owner_id: owner1.id,
        images: [propertyImages[0], propertyImages[1]],
      },
      {
        title: 'Studio Meublé Plateau',
        description: 'Studio entièrement meublé au cœur du Plateau. Idéal pour jeune professionnel. Proche commodités.',
        type: 'STUDIO',
        price: 120000,
        area: 35,
        bedrooms: null,
        bathrooms: 1,
        address: 'Avenue Franchet d\'Espérey, Plateau',
        city: 'Abidjan',
        commune: 'Plateau',
        is_furnished: true,
        has_parking: false,
        has_garden: false,
        has_pool: false,
        owner_id: owner1.id,
        images: [propertyImages[2]],
      },
      {
        title: 'Villa 4 Chambres Marcory',
        description: 'Magnifique villa 4 chambres avec jardin et piscine à Marcory. Quartier résidentiel calme.',
        type: 'VILLA',
        status: 'PENDING_VERIFICATION',
        price: 450000,
        area: 220,
        bedrooms: 4,
        bathrooms: 3,
        address: 'Zone 4, Marcory',
        city: 'Abidjan',
        commune: 'Marcory',
        is_furnished: false,
        has_parking: true,
        has_garden: true,
        has_pool: true,
        owner_id: owner1.id,
        images: [propertyImages[3]],
      },
      {
        title: 'Appartement F2 Yopougon',
        description: 'Appartement F2 rénové à Yopougon. Proche marché et transports. Loyer très abordable.',
        type: 'APPARTEMENT',
        price: 80000,
        area: 55,
        bedrooms: 1,
        bathrooms: 1,
        address: 'Sogefiha, Yopougon',
        city: 'Abidjan',
        commune: 'Yopougon',
        is_furnished: false,
        has_parking: false,
        has_garden: false,
        has_pool: false,
        owner_id: owner2.id,
        images: [propertyImages[4]],
      },
      {
        title: 'Duplex Riviera Palmeraie',
        description: 'Superbe duplex standing à la Riviera Palmeraie. Finitions haut de gamme, vue lagune.',
        type: 'DUPLEX',
        status: 'PENDING_VERIFICATION',
        price: 600000,
        area: 180,
        bedrooms: 3,
        bathrooms: 2,
        address: 'Riviera Palmeraie',
        city: 'Abidjan',
        commune: 'Cocody',
        is_furnished: true,
        has_parking: true,
        has_garden: true,
        has_pool: true,
        owner_id: owner2.id,
        images: [propertyImages[5], propertyImages[0]],
      },
      {
        title: 'Penthouse Zone 4',
        description: 'Penthouse de luxe avec terrasse panoramique. Vue imprenable sur la lagune Ébrié.',
        type: 'PENTHOUSE',
        price: 850000,
        area: 200,
        bedrooms: 3,
        bathrooms: 2,
        address: 'Zone 4, Marcory',
        city: 'Abidjan',
        commune: 'Marcory',
        is_furnished: true,
        has_parking: true,
        has_garden: false,
        has_pool: true,
        owner_id: owner2.id,
        images: [propertyImages[3], propertyImages[5]],
      },
    ]

    const createdProperties: any[] = []
    for (const pData of propertiesData) {
      const { images, ...data } = pData
      const { data: property } = await supabase
        .from('properties')
        .insert({
          id: uuid(),
          ...data,
        })
        .select()
        .single() as any
      createdProperties.push(property)

      for (let i = 0; i < images.length; i++) {
        await supabase
          .from('property_images')
          .insert({
            id: uuid(),
            url: images[i],
            order: i,
            property_id: property.id,
          } as any)
      }
    }

    const { data: rentalFile1 } = await supabase
      .from('rental_files')
      .insert({
        id: uuid(),
        tenant_id: tenant1.id,
        status: 'VALIDATED',
        monthly_income: 500000,
        employer: 'Orange CI',
        employment_type: 'CDI',
        guarantor_name: 'Ibrahim Koné',
        guarantor_phone: '+22508080808',
        guarantor_relation: 'Père',
        reviewed_by_id: tc.id,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single() as any

    await supabase.from('rental_file_documents').insert([
      { rental_file_id: rentalFile1.id, type: 'ID_CARD', url: '/docs/id_koné.pdf', name: 'Carte d\'identité', status: 'VALIDATED' },
      { rental_file_id: rentalFile1.id, type: 'PAY_SLIP', url: '/docs/pay_koné.pdf', name: 'Fiche de paie', status: 'VALIDATED' },
      { rental_file_id: rentalFile1.id, type: 'EMPLOYMENT_CONTRACT', url: '/docs/contract_koné.pdf', name: 'Contrat de travail', status: 'VALIDATED' },
    ] as any)

    const { data: rentalFile2 } = await supabase
      .from('rental_files')
      .insert({
        id: uuid(),
        tenant_id: tenant2.id,
        status: 'TC_REVIEW',
        monthly_income: 350000,
        employer: 'SODECI',
        employment_type: 'CDI',
      })
      .select()
      .single() as any

    await supabase.from('rental_file_documents').insert([
      { rental_file_id: rentalFile2.id, type: 'ID_CARD', url: '/docs/id_bamba.pdf', name: 'Carte d\'identité', status: 'VALIDATED' },
      { rental_file_id: rentalFile2.id, type: 'PAY_SLIP', url: '/docs/pay_bamba.pdf', name: 'Fiche de paie', status: 'PENDING' },
      { rental_file_id: rentalFile2.id, type: 'BANK_STATEMENT', url: '/docs/bank_bamba.pdf', name: 'Relevé bancaire', status: 'PENDING' },
    ] as any)

    const { data: rentalFile3 } = await supabase
      .from('rental_files')
      .insert({
        id: uuid(),
        tenant_id: tenant3.id,
        status: 'SUBMITTED',
        monthly_income: 280000,
        employer: 'Free-lance',
        employment_type: 'FREELANCE',
        guarantor_name: 'Marie Coulibaly',
        guarantor_phone: '+22509090909',
        guarantor_relation: 'Sœur',
      })
      .select()
      .single() as any

    await supabase.from('rental_file_documents').insert([
      { rental_file_id: rentalFile3.id, type: 'PASSPORT', url: '/docs/pass_coulibaly.pdf', name: 'Passeport', status: 'PENDING' },
      { rental_file_id: rentalFile3.id, type: 'BANK_STATEMENT', url: '/docs/bank_coulibaly.pdf', name: 'Relevé bancaire', status: 'PENDING' },
      { rental_file_id: rentalFile3.id, type: 'GUARANTOR_ID', url: '/docs/guarantor_coulibaly.pdf', name: 'Pièce garant', status: 'PENDING' },
    ] as any)

    const { data: lease1 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: createdProperties[0].id,
        tenant_id: tenant1.id,
        owner_id: owner1.id,
        rental_file_id: rentalFile1.id,
        status: 'ACTIVE',
        start_date: '2025-01-01',
        end_date: '2026-12-31',
        monthly_rent: 250000,
        charges: 25000,
        deposit: 500000,
        owner_signed_at: '2025-01-01T00:00:00.000Z',
        tenant_signed_at: '2025-01-02T00:00:00.000Z',
      })
      .select()
      .single() as any

    const { data: lease2 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: createdProperties[2].id,
        tenant_id: tenant2.id,
        owner_id: owner1.id,
        rental_file_id: rentalFile2.id,
        status: 'ACTIVE',
        start_date: '2025-03-01',
        end_date: '2027-02-28',
        monthly_rent: 450000,
        charges: 50000,
        deposit: 900000,
        owner_signed_at: '2025-03-01T00:00:00.000Z',
        tenant_signed_at: '2025-03-02T00:00:00.000Z',
      })
      .select()
      .single() as any

    const { data: lease3 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: createdProperties[1].id,
        tenant_id: tenant3.id,
        owner_id: owner1.id,
        rental_file_id: rentalFile3.id,
        status: 'ACTIVE',
        start_date: '2025-06-01',
        end_date: '2026-05-31',
        monthly_rent: 120000,
        charges: 10000,
        deposit: 240000,
        owner_signed_at: '2025-06-01T00:00:00.000Z',
        tenant_signed_at: '2025-06-02T00:00:00.000Z',
      })
      .select()
      .single() as any

    const { data: lease4 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: createdProperties[3].id,
        tenant_id: tenant1.id,
        owner_id: owner2.id,
        rental_file_id: rentalFile1.id,
        status: 'TERMINATED',
        start_date: '2023-01-01',
        end_date: '2024-12-31',
        monthly_rent: 80000,
        charges: 5000,
        deposit: 160000,
        owner_signed_at: '2023-01-01T00:00:00.000Z',
        tenant_signed_at: '2023-01-02T00:00:00.000Z',
        special_conditions: 'Animaux de compagnie non autorisés. Pas de sous-location.',
      })
      .select()
      .single() as any

    const { data: lease5 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: createdProperties[4].id,
        tenant_id: tenant3.id,
        owner_id: owner2.id,
        rental_file_id: rentalFile3.id,
        status: 'ACTIVE',
        start_date: '2025-09-01',
        end_date: '2027-08-31',
        monthly_rent: 600000,
        charges: 75000,
        deposit: 1200000,
        owner_signed_at: '2025-09-01T00:00:00.000Z',
        tenant_signed_at: '2025-09-03T00:00:00.000Z',
      })
      .select()
      .single() as any

    const { data: lease6 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: createdProperties[5].id,
        tenant_id: tenant1.id,
        owner_id: owner2.id,
        rental_file_id: rentalFile1.id,
        status: 'ACTIVE',
        start_date: '2025-06-01',
        end_date: '2027-05-31',
        monthly_rent: 850000,
        charges: 100000,
        deposit: 1700000,
        owner_signed_at: '2025-06-01T00:00:00.000Z',
        tenant_signed_at: '2025-06-03T00:00:00.000Z',
        special_conditions: 'Utilisation exclusive de la terrasse panoramique. Pas d\'animaux.',
      })
      .select()
      .single() as any

    await supabase.from('payments').insert([
      { lease_id: lease2.id, tenant_id: tenant2.id, amount: 450000, status: 'PAID', due_date: '2025-03-01', paid_at: '2025-03-02T00:00:00.000Z', reference: 'PMT-2025-010' },
      { lease_id: lease2.id, tenant_id: tenant2.id, amount: 450000, status: 'PAID', due_date: '2025-04-01', paid_at: '2025-04-01T00:00:00.000Z', reference: 'PMT-2025-011' },
      { lease_id: lease2.id, tenant_id: tenant2.id, amount: 450000, status: 'LATE', due_date: '2025-02-01', reference: 'PMT-2025-012' },
      { lease_id: lease2.id, tenant_id: tenant2.id, amount: 450000, status: 'PENDING', due_date: '2025-05-01', reference: 'PMT-2025-013' },
    ] as any)

    await supabase.from('payments').insert([
      { lease_id: lease3.id, tenant_id: tenant3.id, amount: 120000, status: 'PAID', due_date: '2025-06-01', paid_at: '2025-06-03T00:00:00.000Z', reference: 'PMT-2025-020' },
      { lease_id: lease3.id, tenant_id: tenant3.id, amount: 120000, status: 'PAID', due_date: '2025-07-01', paid_at: '2025-07-01T00:00:00.000Z', reference: 'PMT-2025-021' },
      { lease_id: lease3.id, tenant_id: tenant3.id, amount: 120000, status: 'PENDING', due_date: '2025-08-01', reference: 'PMT-2025-022' },
    ] as any)

    await supabase.from('payments').insert([
      { lease_id: lease4.id, tenant_id: tenant1.id, amount: 80000, status: 'PAID', due_date: '2024-11-01', paid_at: '2024-11-02T00:00:00.000Z', reference: 'PMT-2024-110' },
      { lease_id: lease4.id, tenant_id: tenant1.id, amount: 80000, status: 'PAID', due_date: '2024-12-01', paid_at: '2024-12-01T00:00:00.000Z', reference: 'PMT-2024-112' },
    ] as any)

    await supabase.from('payments').insert([
      { lease_id: lease5.id, tenant_id: tenant3.id, amount: 600000, status: 'PAID', due_date: '2025-09-01', paid_at: '2025-09-02T00:00:00.000Z', reference: 'PMT-2025-030' },
      { lease_id: lease5.id, tenant_id: tenant3.id, amount: 600000, status: 'LATE', due_date: '2025-10-01', reference: 'PMT-2025-031' },
      { lease_id: lease5.id, tenant_id: tenant3.id, amount: 600000, status: 'PENDING', due_date: '2025-11-01', reference: 'PMT-2025-032' },
    ] as any)

    await supabase.from('payments').insert([
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PAID', due_date: '2025-06-01', paid_at: '2025-06-02T00:00:00.000Z', reference: 'PMT-2025-040' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PAID', due_date: '2025-07-01', paid_at: '2025-07-01T00:00:00.000Z', reference: 'PMT-2025-041' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PAID', due_date: '2025-08-01', paid_at: '2025-08-03T00:00:00.000Z', reference: 'PMT-2025-042' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PAID', due_date: '2025-09-01', paid_at: '2025-09-01T00:00:00.000Z', reference: 'PMT-2025-043' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PAID', due_date: '2025-10-01', paid_at: '2025-10-02T00:00:00.000Z', reference: 'PMT-2025-044' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PAID', due_date: '2025-11-01', paid_at: '2025-11-01T00:00:00.000Z', reference: 'PMT-2025-045' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'LATE', due_date: '2025-05-01', reference: 'PMT-2025-039' },
      { lease_id: lease6.id, tenant_id: tenant1.id, amount: 850000, status: 'PENDING', due_date: '2025-12-01', reference: 'PMT-2025-046' },
    ] as any)

    await supabase.from('maintenance_requests').insert([
      { lease_id: lease2.id, tenant_id: tenant2.id, title: 'Fuite toiture véranda', description: 'La véranda présente une fuite au niveau de la toiture lors des fortes pluies.', status: 'PENDING', priority: 'HIGH' },
      { lease_id: lease3.id, tenant_id: tenant3.id, title: 'Remplacement ampoules couloir', description: 'Les ampoules du couloir sont grillées et nécessitent un remplacement.', status: 'RESOLVED', priority: 'LOW' },
    ] as any)

    await supabase.from('visit_requests').insert([
      { property_id: createdProperties[1].id, tenant_id: tenant2.id, requested_date: '2026-03-10', time_slot: '10:00-11:00', status: 'PENDING' },
      { property_id: createdProperties[3].id, tenant_id: tenant3.id, requested_date: '2026-03-11', time_slot: '14:00-15:00', status: 'PENDING' },
      { property_id: createdProperties[0].id, tenant_id: tenant2.id, requested_date: '2026-03-05', time_slot: '09:00-10:00', status: 'COMPLETED' },
      { property_id: createdProperties[4].id, tenant_id: tenant1.id, requested_date: '2026-03-12', time_slot: '11:00-12:00', status: 'ACCEPTED' },
    ] as any)

    await supabase.from('ownership_documents').insert([
      { owner_id: owner1.id, type: 'TITRE_FONCIER', url: '/docs/tf_yao.pdf', name: 'Titre foncier - Cocody', status: 'PENDING' },
      { owner_id: owner2.id, type: 'ATTESTATION_PROPRIETE', url: '/docs/att_diallo.pdf', name: 'Attestation de propriété - Marcory', status: 'PENDING' },
    ] as any)

    const { data: conv1 } = await supabase
      .from('conversations')
      .insert({
        id: uuid(),
        participant1_id: tenant1.id,
        participant2_id: owner1.id,
        property_id: createdProperties[0].id,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single() as any

    await supabase.from('messages').insert([
      { conversation_id: conv1.id, sender_id: tenant1.id, content: 'Bonjour, je suis intéressé par l\'appartement F3 à Cocody. Est-il toujours disponible ?' },
      { conversation_id: conv1.id, sender_id: owner1.id, content: 'Bonsoir ! Oui, l\'appartement est toujours disponible. Souhaitez-vous planifier une visite ?' },
      { conversation_id: conv1.id, sender_id: tenant1.id, content: 'Oui, quand serais-je disponible cette semaine ?' },
    ] as any)

    await supabase
      .from('messages')
      .update({ is_read: true } as any)
      .eq('conversation_id', conv1.id)
      .eq('sender_id', owner1.id)

    const { data: conv2 } = await supabase
      .from('conversations')
      .insert({
        id: uuid(),
        participant1_id: tenant2.id,
        participant2_id: owner2.id,
        property_id: createdProperties[3].id,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single() as any

    await supabase.from('messages').insert([
      { conversation_id: conv2.id, sender_id: tenant2.id, content: 'Bonjour Madame Diallo, l\'appartement F2 à Yopougon est-il meublé ?' },
      { conversation_id: conv2.id, sender_id: owner2.id, content: 'Bonjour ! Non, il n\'est pas meublé, mais il est bien renové. N\'hésitez pas à venir visiter.' },
    ] as any)

    await supabase
      .from('messages')
      .update({ is_read: true } as any)
      .eq('conversation_id', conv2.id)
      .eq('sender_id', owner2.id)

    const { data: conv3 } = await supabase
      .from('conversations')
      .insert({
        id: uuid(),
        participant1_id: tenant1.id,
        participant2_id: owner2.id,
        property_id: createdProperties[5].id,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single() as any

    await supabase.from('messages').insert([
      { conversation_id: conv3.id, sender_id: tenant1.id, content: 'Bonjour Madame Diallo, le penthouse Zone 4 est-il toujours disponible ?' },
      { conversation_id: conv3.id, sender_id: owner2.id, content: 'Bonjour Moussa ! Oui, il est disponible. La vue sur la lagune est magnifique.' },
      { conversation_id: conv3.id, sender_id: tenant1.id, content: 'Super ! Est-ce que la terrasse est accessible en toute saison ?' },
      { conversation_id: conv3.id, sender_id: owner2.id, content: 'Oui, la terrasse est couverte. Vous pouvez en profiter toute l\'année. N\'hésitez pas à visiter !' },
    ] as any)

    await supabase
      .from('messages')
      .update({ is_read: true } as any)
      .eq('conversation_id', conv3.id)
      .eq('sender_id', owner2.id)

    await supabase.from('validation_slas').insert([
      { entity_type: 'RENTAL_FILE', entity_id: rentalFile2.id, submitted_at: new Date().toISOString(), deadline_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), reviewer_id: tc.id },
      { entity_type: 'RENTAL_FILE', entity_id: rentalFile3.id, submitted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), reviewer_id: tc.id },
    ] as any)

    await supabase.from('payments').insert([
      { lease_id: lease1.id, tenant_id: tenant1.id, amount: 250000, status: 'PAID', due_date: '2025-01-01', paid_at: '2025-01-03T00:00:00.000Z', reference: 'PMT-2025-001' },
      { lease_id: lease1.id, tenant_id: tenant1.id, amount: 250000, status: 'PAID', due_date: '2025-02-01', paid_at: '2025-02-02T00:00:00.000Z', reference: 'PMT-2025-002' },
      { lease_id: lease1.id, tenant_id: tenant1.id, amount: 250000, status: 'PAID', due_date: '2025-03-01', paid_at: '2025-03-01T00:00:00.000Z', reference: 'PMT-2025-003' },
      { lease_id: lease1.id, tenant_id: tenant1.id, amount: 250000, status: 'PENDING', due_date: '2025-04-01', reference: 'PMT-2025-004' },
      { lease_id: lease1.id, tenant_id: tenant1.id, amount: 250000, status: 'LATE', due_date: '2024-12-01', reference: 'PMT-2024-012' },
    ] as any)

    await supabase.from('notifications').insert([
      { user_id: tenant1.id, type: 'MESSAGE', title: 'Nouveau message', message: 'Nouveau message de Kouadio Yao', is_read: false, action_url: '/dashboard?section=messages' },
      { user_id: tenant1.id, type: 'DOSSIER_UPDATE', title: 'Dossier locatif', message: 'Votre dossier locatif a été validé', is_read: true, action_url: '/dashboard?section=my-applications' },
      { user_id: tenant1.id, type: 'VISIT_REMINDER', title: 'Rappel de visite', message: 'Rappel : visite prévue le 12 mars', is_read: false, action_url: '/dashboard?section=my-visits' },
      { user_id: tenant1.id, type: 'PAYMENT_ALERT', title: 'Paiement en retard', message: 'Paiement en retard - décembre 2024', is_read: false, action_url: '/dashboard?section=my-leases' },
      { user_id: tenant1.id, type: 'SYSTEM', title: 'Bienvenue', message: 'Bienvenue sur Mon Toit !', is_read: true },
      { user_id: tenant1.id, type: 'PROMOTION', title: 'Offre spéciale', message: 'Offre spéciale : premiers mois réduits', is_read: false },
      { user_id: tenant1.id, type: 'MESSAGE', title: 'Nouveau message', message: 'Nouveau message de Awa Diallo', is_read: false, action_url: '/dashboard?section=messages' },
      { user_id: tenant1.id, type: 'PAYMENT_ALERT', title: 'Rappel de paiement', message: 'Paiement en attente - Penthouse Zone 4, décembre 2025', is_read: false, action_url: '/dashboard?section=my-leases' },
      { user_id: tenant1.id, type: 'PAYMENT_ALERT', title: 'Paiement en retard', message: 'Paiement en retard - Penthouse Zone 4, mai 2025', is_read: false, action_url: '/dashboard?section=my-leases' },
      { user_id: tenant1.id, type: 'DOSSIER_UPDATE', title: 'Baux actifs', message: 'Vous avez 2 baux actifs : Appartement F3 Cocody et Penthouse Zone 4', is_read: true, action_url: '/dashboard?section=my-leases' },
      { user_id: tenant1.id, type: 'SYSTEM', title: 'Profil partagé', message: 'Votre profil locataire a été partagé avec succès', is_read: true },
    ] as any)

    await supabase.from('maintenance_requests').insert([
      { lease_id: lease1.id, tenant_id: tenant1.id, title: 'Réparation robinet cuisine', description: 'Le robinet de la cuisine fuit depuis quelques jours. Une réparation est nécessaire pour éviter le gaspillage d\'eau.', status: 'RESOLVED', priority: 'MEDIUM', resolution: 'Robinets remplacés par le plombier mandaté par le propriétaire le 15/02/2025.' },
      { lease_id: lease1.id, tenant_id: tenant1.id, title: 'Climatisation défaillante chambre 2', description: 'La climatisation de la chambre 2 ne souffle plus d\'air froid. Le compresseur semble défaillant.', status: 'IN_PROGRESS', priority: 'HIGH' },
      { lease_id: lease1.id, tenant_id: tenant1.id, title: 'Porte d\'entrée difficile à fermer', description: 'La porte d\'entrée nécessite un effort important pour se fermer correctement. La serrure semble légèrement décalée.', status: 'PENDING', priority: 'LOW' },
      { lease_id: lease6.id, tenant_id: tenant1.id, title: 'Fuite terrasse panoramique', description: 'La terrasse panoramique présente une infiltration d\'eau au niveau du joint d\'étanchéité lors des pluies torrentielles.', status: 'PENDING', priority: 'HIGH' },
    ] as any)

    await supabase.from('audit_logs').insert([
      { user_id: tenant1.id, action: 'LOGIN', entity: 'SESSION', details: 'Connexion depuis Abidjan, Côte d\'Ivoire' },
      { user_id: tenant1.id, action: 'PROFILE_UPDATE', entity: 'USER', entity_id: tenant1.id, details: 'Mise à jour des informations personnelles' },
      { user_id: tenant1.id, action: 'DOSSIER_SUBMIT', entity: 'RENTAL_FILE', entity_id: rentalFile1.id, details: 'Soumission du dossier locatif pour Appartement F3 Cocody' },
      { user_id: tenant1.id, action: 'FAVORITE_ADD', entity: 'PROPERTY', entity_id: createdProperties[0].id, details: 'Ajout du bien "Appartement F3 Cocody" aux favoris' },
      { user_id: tenant1.id, action: 'VISIT_REQUEST', entity: 'PROPERTY', entity_id: createdProperties[4].id, details: 'Demande de visite pour Duplex Riviera Palmeraie' },
      { user_id: tenant1.id, action: 'PAYMENT_MADE', entity: 'PAYMENT', details: 'Paiement de 250 000 FCFA — référence PMT-2025-003' },
    ] as any)

    await supabase.from('ratings').insert({
      lease_id: lease1.id,
      from_user_id: tenant1.id,
      to_user_id: owner1.id,
      score: 4,
      comment: 'Propriétaire réactif et logement en bon état',
    }) as any

    const { data: agency } = await supabase
      .from('users')
      .insert({
        id: uuid(),
        phone: '+22508080808',
        first_name: 'Immobilier',
        last_name: 'Cocody',
        email: 'agence@montoit.ci',
        password_hash: passwordHash,
        role: 'AGENCE',
        active_role: 'AGENCE',
        is_email_verified: true,
        is_phone_verified: true,
        is_active: true,
        company_name: 'Immobilier Cocody SARL',
        city: 'Abidjan',
        address: 'Boulevard de France, Cocody',
      })
      .select()
      .single() as any

    const { data: agent1 } = await supabase
      .from('agency_agents')
      .insert({
        id: uuid(),
        first_name: 'Aminata',
        last_name: 'Touré',
        email: 'aminata.toure@immococody.ci',
        phone: '+22508111111',
        role: 'ADMIN',
        status: 'ACTIVE',
        agency_id: agency.id,
      } as any)
      .select()
      .single() as any

    const { data: agent2 } = await supabase
      .from('agency_agents')
      .insert({
        id: uuid(),
        first_name: 'Seydou',
        last_name: 'Konaté',
        email: 'seydou.konate@immococody.ci',
        phone: '+22508222222',
        role: 'AGENT',
        status: 'ACTIVE',
        agency_id: agency.id,
      } as any)
      .select()
      .single() as any

    const { data: agent3 } = await supabase
      .from('agency_agents')
      .insert({
        id: uuid(),
        first_name: 'Marie',
        last_name: 'Brou',
        email: 'marie.brou@immococody.ci',
        phone: '+22508333333',
        role: 'AGENT',
        status: 'ACTIVE',
        agency_id: agency.id,
      } as any)
      .select()
      .single() as any

    const { data: agencyProperty1 } = await supabase
      .from('properties')
      .insert({
        id: uuid(),
        title: 'Appartement Standing Riviera 2',
        description: 'Appartement haut standing à Riviera 2. 3 chambres, salon double, cuisine américaine.',
        type: 'APPARTEMENT',
        status: 'ACTIVE',
        price: 350000,
        area: 120,
        bedrooms: 3,
        bathrooms: 2,
        address: 'Riviera 2, Cocody',
        city: 'Abidjan',
        commune: 'Cocody',
        is_furnished: true,
        has_parking: true,
        has_garden: false,
        has_pool: true,
        is_verified: true,
        owner_id: agency.id,
      })
      .select()
      .single() as any

    await supabase.from('property_images').insert([
      { url: propertyImages[0], order: 0, property_id: agencyProperty1.id },
      { url: propertyImages[1], order: 1, property_id: agencyProperty1.id },
    ] as any)

    const { data: agencyProperty2 } = await supabase
      .from('properties')
      .insert({
        id: uuid(),
        title: 'Villa Familiale Bingerville',
        description: 'Belle villa familiale avec grand jardin à Bingerville. Quartier calme et résidentiel.',
        type: 'VILLA',
        status: 'ACTIVE',
        price: 400000,
        area: 280,
        bedrooms: 5,
        bathrooms: 3,
        address: 'Route de Bingerville',
        city: 'Abidjan',
        commune: 'Cocody',
        is_furnished: false,
        has_parking: true,
        has_garden: true,
        has_pool: true,
        is_verified: true,
        owner_id: agency.id,
      })
      .select()
      .single() as any

    await supabase.from('property_images').insert([
      { url: propertyImages[3], order: 0, property_id: agencyProperty2.id },
    ] as any)

    const { data: agencyProperty3 } = await supabase
      .from('properties')
      .insert({
        id: uuid(),
        title: 'Studio Moderne Plateau',
        description: 'Studio moderne et fonctionnel au Plateau. Idéal cadre de travail.',
        type: 'STUDIO',
        status: 'PENDING_VERIFICATION',
        price: 150000,
        area: 40,
        bedrooms: null,
        bathrooms: 1,
        address: 'Rue du Commerce, Plateau',
        city: 'Abidjan',
        commune: 'Plateau',
        is_furnished: true,
        has_parking: false,
        has_garden: false,
        has_pool: false,
        is_verified: false,
        owner_id: agency.id,
      })
      .select()
      .single() as any

    await supabase.from('property_images').insert([
      { url: propertyImages[2], order: 0, property_id: agencyProperty3.id },
    ] as any)

    await supabase.from('agency_agent_properties').insert([
      { agent_id: agent1.id, property_id: agencyProperty1.id },
      { agent_id: agent1.id, property_id: agencyProperty2.id },
      { agent_id: agent2.id, property_id: agencyProperty2.id },
      { agent_id: agent2.id, property_id: agencyProperty3.id },
      { agent_id: agent3.id, property_id: agencyProperty1.id },
    ] as any)

    const { data: mandat1 } = await supabase
      .from('mandats')
      .insert({
        id: uuid(),
        type: 'GESTION_COMPLETE',
        status: 'ACTIVE',
        commission_rate: 8.5,
        commission_type: 'PERCENTAGE',
        start_date: '2025-01-01',
        end_date: '2027-12-31',
        conditions: 'Gestion complète incluant encaissement des loyers et maintenance courante.',
        owner_signed_at: '2025-01-02T00:00:00.000Z',
        agency_signed_at: '2025-01-01T00:00:00.000Z',
        property_id: agencyProperty1.id,
        owner_id: owner1.id,
        agency_id: agency.id,
      })
      .select()
      .single() as any

    const { data: mandat2 } = await supabase
      .from('mandats')
      .insert({
        id: uuid(),
        type: 'GESTION_LOCATION',
        status: 'ACTIVE',
        commission_rate: 6.0,
        commission_type: 'PERCENTAGE',
        start_date: '2025-03-01',
        end_date: '2027-02-28',
        conditions: 'Gestion de la location uniquement. Le propriétaire conserve la gestion technique.',
        owner_signed_at: '2025-03-02T00:00:00.000Z',
        agency_signed_at: '2025-03-01T00:00:00.000Z',
        property_id: agencyProperty2.id,
        owner_id: owner2.id,
        agency_id: agency.id,
      })
      .select()
      .single() as any

    const { data: mandat3 } = await supabase
      .from('mandats')
      .insert({
        id: uuid(),
        type: 'MANDAT_SIMPLE',
        status: 'PENDING_SIGNATURE',
        commission_rate: 5.0,
        commission_type: 'PERCENTAGE',
        start_date: '2025-06-01',
        end_date: '2026-05-31',
        conditions: 'Mandat simple de mise en relation.',
        property_id: agencyProperty3.id,
        owner_id: owner1.id,
        agency_id: agency.id,
      })
      .select()
      .single() as any

    const { data: agencyLease1 } = await supabase
      .from('leases')
      .insert({
        id: uuid(),
        property_id: agencyProperty1.id,
        tenant_id: tenant1.id,
        owner_id: agency.id,
        rental_file_id: rentalFile1.id,
        status: 'ACTIVE',
        start_date: '2025-02-01',
        end_date: '2027-01-31',
        monthly_rent: 350000,
        charges: 35000,
        deposit: 700000,
        owner_signed_at: '2025-02-01T00:00:00.000Z',
        tenant_signed_at: '2025-02-02T00:00:00.000Z',
      })
      .select()
      .single() as any

    await supabase.from('commission').insert([
      { agent_id: agent1.id, agency_id: agency.id, amount: 29750, rate: 8.5, status: 'PAID', description: 'Commission janvier 2025 - Appartement Riviera 2', paid_at: '2025-02-05T00:00:00.000Z', mandat_id: mandat1.id },
      { agent_id: agent1.id, agency_id: agency.id, amount: 29750, rate: 8.5, status: 'PAID', description: 'Commission février 2025 - Appartement Riviera 2', paid_at: '2025-03-05T00:00:00.000Z', mandat_id: mandat1.id },
      { agent_id: agent2.id, agency_id: agency.id, amount: 24000, rate: 6.0, status: 'PENDING', description: 'Commission mars 2025 - Villa Bingerville', mandat_id: mandat2.id },
      { agent_id: agent3.id, agency_id: agency.id, amount: 29750, rate: 8.5, status: 'PENDING', description: 'Commission mars 2025 - Appartement Riviera 2', mandat_id: mandat1.id },
    ] as any)

    await supabase.from('signalements').insert([
      { reason: 'FRAUD', description: 'Suspicion de fausse annonce : le prix semble anormalement bas pour cette zone.', status: 'PENDING', entity_type: 'PROPERTY', entity_id: createdProperties[3].id, reporter_id: tenant2.id },
      { reason: 'INAPPROPRIATE_CONTENT', description: 'Photos non conformes au bien décrit dans l\'annonce.', status: 'IN_REVIEW', entity_type: 'PROPERTY', entity_id: createdProperties[4].id, reporter_id: tenant1.id, handled_by_id: admin.id },
    ] as any)

    await supabase.from('notifications').insert([
      { user_id: agency.id, type: 'MISSION_ASSIGNED', title: 'Nouveau mandat', message: 'Nouveau mandat de gestion signé avec Kouadio Yao', is_read: false },
      { user_id: agency.id, type: 'DOSSIER_UPDATE', title: 'Dossier validé', message: 'Le dossier de Moussa Koné a été validé par le TC', is_read: true },
      { user_id: agency.id, type: 'PAYMENT_ALERT', title: 'Paiement reçu', message: 'Paiement de 350 000 FCFA reçu pour Appartement Riviera 2', is_read: false },
    ] as any)

    return NextResponse.json({
      message: 'Données de démonstration créées avec succès',
      demoPassword: DEMO_PASSWORD,
      users: { admin: admin.id, tc: tc.id, owner1: owner1.id, owner2: owner2.id, tenant1: tenant1.id, tenant2: tenant2.id, tenant3: tenant3.id, agency: agency.id },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Erreur lors du seed', details: String(error) }, { status: 500 })
  }
}
