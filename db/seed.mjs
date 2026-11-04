/**
 * Seed de données de test — Mon Toit CI (base PostgreSQL locale)
 * Comptes de test pour chaque acteur + données métier réalistes :
 *  - 9 comptes (admin, 2 locataires, 3 propriétaires, agence, 2 Tiers de Confiance)
 *  - ~56 biens dont 50 « déjà validés » actifs (is_verified=true), images, équipements
 *  - dossiers locataires, candidatures, visites, avis, favoris, baux, paiements
 * Idempotent : purge les données de test existantes avant réinsertion.
 * Usage: node db/seed.mjs  (ou: bun run db:seed)
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';

const URL = 'postgresql://postgres@127.0.0.1:5432/montoit';
const EMAIL_DOMAIN = '@montoit-test.ci';
const PASSWORD = 'Test1234!';

// ── Générateur pseudo-aléatoire déterministe (seed stable entre les exécutions)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261104);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const roundTo = (n, step) => Math.round(n / step) * step;

const TYPES_FR = {
  STUDIO: 'Studio', APPARTEMENT: 'Appartement', MAISON: 'Maison',
  DUPLEX: 'Duplex', VILLA: 'Villa', PENTHOUSE: 'Penthouse',
};

// Quartiers réalistes : [adresse, commune, lat, lng]
const QUARTIERS = [
  ['Angré 7e Tranche', 'Cocody', 5.396, -3.995], ['Angré 8e Tranche', 'Cocody', 5.401, -3.988],
  ['II Plateaux Vallon', 'Cocody', 5.361, -3.994], ['Riviera Palmeraie', 'Cocody', 5.369, -3.954],
  ['Riviera Golf', 'Cocody', 5.36, -3.96], ['Cocody Centre', 'Cocody', 5.345, -4.008],
  ['Niangon Nord', 'Yopougon', 5.34, -4.087], ['Mobo', 'Yopougon', 5.352, -4.078],
  ['Siporex', 'Yopougon', 5.334, -4.077], ['Yopougon Attié', 'Yopougon', 5.323, -4.081],
  ['Marcory Résidentiel', 'Marcory', 5.292, -3.993], ['Zone 4', 'Marcory', 5.299, -4.007],
  ['Plateau', 'Plateau', 5.324, -4.02], ['Adjamé 220 Logements', 'Adjamé', 5.356, -4.023],
  ['Koumassi Remblais', 'Koumassi', 5.286, -3.954], ['Grand Koumassi', 'Koumassi', 5.291, -3.96],
  ['Gonzagueville', 'Port-Bouët', 5.253, -3.929], ['Vridi Canal', 'Port-Bouët', 5.259, -4.006],
  ['Treichville Centre', 'Treichville', 5.296, -4.01], ['Télébonou', 'Attécoubé', 5.313, -4.023],
  ['Bingerville Centre', 'Bingerville', 5.355, -3.886], ['Abobo Baoulé', 'Abobo', 5.42, -4.021],
];
const AUTRES_VILLES = [
  ['Air France', 'Bouaké', 7.69, -5.03], ['Habitat', 'Yamoussoukro', 6.827, -5.289],
  ['Front de mer', 'San-Pédro', 4.748, -6.636], ['Quartier France', 'Grand-Bassam', 5.2, -3.738],
  ['Centre', 'Daloa', 6.877, -6.45],
];

// Type → [min loyer, max loyer, poids, surface min/max, chambres min/max]
const TYPE_DEFS = [
  ['STUDIO', 60000, 180000, 12, [20, 45], [1, 1]],
  ['APPARTEMENT', 180000, 650000, 19, [55, 160], [2, 4]],
  ['MAISON', 350000, 900000, 5, [90, 250], [3, 5]],
  ['DUPLEX', 400000, 950000, 5, [120, 240], [3, 5]],
  ['VILLA', 600000, 2000000, 6, [180, 400], [4, 6]],
  ['PENTHOUSE', 900000, 1800000, 3, [140, 300], [3, 5]],
];

const AMENITIES_POOL = ['Climatisation', 'Parking', 'Piscine', 'Jardin', 'Groupe électrogène', 'Ascenseur', 'Gardien 24/7', 'Terrasse', 'Balcon', 'Wi-Fi', 'Cuisine équipée', 'Eau chaude'];
const ADJECTIFS = ['moderne', 'cosy', 'fonctionnel', 'lumineux', 'récent', 'de standing', 'rénové', 'familial', 'spacieux', 'atypique'];

function buildTitle(type, rooms, quartier) {
  const fr = TYPES_FR[type];
  switch (type) {
    case 'STUDIO': return `Studio ${pick(ADJECTIFS)} — ${quartier}`;
    case 'APPARTEMENT': return `Appartement ${rooms} pièces ${pick(ADJECTIFS)} — ${quartier}`;
    case 'MAISON': return `Maison ${rooms} pièces avec cour — ${quartier}`;
    case 'DUPLEX': return `Duplex ${rooms} pièces ${pick(ADJECTIFS)} — ${quartier}`;
    case 'VILLA': return `Villa ${rooms} pièces ${pick(['avec jardin', 'basse + haute', 'de standing', 'clôturée'])} — ${quartier}`;
    case 'PENTHOUSE': return `Penthouse ${rooms} pièces vue ${pick(['lagune', 'ville', 'mer'])} — ${quartier}`;
    default: return `${fr} — ${quartier}`;
  }
}

function buildDescription(type, rooms, quartier, commune, surface) {
  return `Bien de type ${TYPES_FR[type].toLowerCase()} de ${rooms} pièce(s) d'environ ${surface} m² situé à ${quartier}, ${commune}. ` +
    `Espaces adaptés à une installation confortable, quartier desservi et proche des commodités (écoles, commerces, transport). ` +
    `Dossier locataire validé requis — visite et signature 100 % en ligne via Mon Toit CI.`;
}

function buildRentalTerms(price) {
  return JSON.stringify({
    caution: 2 * price,
    dureeBail: '12 mois',
    chargesIncluses: pick([[], ['Eau'], ['Eau', 'Ordures ménagères'], ['Ordures ménagères']]),
    chargesNonIncluses: pick([['Électricité'], ['Électricité', 'Internet'], ['Électricité', 'Eau']]),
    modePaiement: ['Orange Money', 'Wave', 'MTN Mobile Money'],
    conditions: ['Dossier locataire validé requis', 'Visite payante, remboursable sur le 1er loyer'],
    etatLieux: "Constat côtier à l'entrée et à la sortie",
    preavis: '1 mois',
    depositMonths: 2,
    advanceMonths: 2,
    agencyFeesMonths: 1,
    advanceAmount: 2 * price,
    agencyFeesAmount: price,
  });
}

function buildAmenities(type) {
  const list = new Set();
  const add = (v) => list.add(v);
  add('Climatisation');
  if (type === 'VILLA' || type === 'MAISON') { add('Jardin'); if (rand() > 0.5) add('Piscine'); }
  if (type === 'VILLA' || type === 'DUPLEX' || type === 'PENTHOUSE') { add('Parking'); add('Terrasse'); }
  if (type === 'APPARTEMENT') { add('Balcon'); if (rand() > 0.4) add('Parking'); if (rand() > 0.6) add('Ascenseur'); if (rand() > 0.7) add('Gardien 24/7'); }
  if (type === 'PENTHOUSE') { add('Ascenseur'); add('Gardien 24/7'); }
  while (list.size < between(4, 7)) add(pick(AMENITIES_POOL));
  return JSON.stringify([...list]);
}

/** Images locales servies par l'app (public/seed-imgs) — pas de dépendance réseau. */
function seedImage(type, k) {
  return `/seed-imgs/${type.toLowerCase()}-${k}.svg`;
}

async function main() {
  const c = new pg.Client({ connectionString: URL });
  await c.connect();

  const hash = await bcrypt.hash(PASSWORD, 10);

  // ── Purge des données de test existantes (ordre des dépendances FK)
  const emails = ['admin', 'locataire', 'locataire2', 'proprietaire', 'proprietaire2', 'proprietaire3', 'agence', 'tc1', 'tc2']
    .map((u) => u + EMAIL_DOMAIN);
  await c.query(`DELETE FROM payments WHERE lease_id LIKE 'lease-test-%'`);
  await c.query(`DELETE FROM ratings WHERE lease_id LIKE 'lease-test-%' OR id LIKE 'rat-seed-%'`);
  await c.query(`DELETE FROM leases WHERE id LIKE 'lease-test-%'`);
  await c.query(`DELETE FROM applications WHERE id LIKE 'app-seed-%'`);
  await c.query(`DELETE FROM visit_requests WHERE id LIKE 'visit-seed-%'`);
  await c.query(`DELETE FROM favorites WHERE id LIKE 'fav-seed-%'`);
  await c.query(`DELETE FROM property_images WHERE property_id LIKE 'prop-seed-%' OR property_id LIKE 'prop-test-%'`);
  await c.query(`DELETE FROM properties WHERE id LIKE 'prop-seed-%' OR id LIKE 'prop-test-%' OR owner_id LIKE 'u-test-%'`);
  await c.query(`DELETE FROM rental_files WHERE id LIKE 'rf-test-%'`);
  await c.query(`DELETE FROM lease_contracts WHERE id = '33333333-3333-4333-8333-333333333331'`);
  await c.query(`DELETE FROM user_roles WHERE user_id::text LIKE 'aaaaaaaa-0000-4000-8000-0000000000%'`);
  await c.query(`DELETE FROM profiles WHERE id IN ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')`);
  const del = await c.query(`DELETE FROM users WHERE email = ANY($1)`, [emails]);
  if (del.rowCount > 0) console.log(`🧹 Anciennes données de test purgées (${del.rowCount} users)`);

  // ── 1. UTILISATEURS (tous les acteurs)
  const U = {
    admin: 'aaaaaaaa-0000-4000-8000-000000000001',
    locataire: 'aaaaaaaa-0000-4000-8000-000000000002',
    proprietaire: 'aaaaaaaa-0000-4000-8000-000000000003',
    agence: 'aaaaaaaa-0000-4000-8000-000000000004',
    tc1: 'aaaaaaaa-0000-4000-8000-000000000005',
    tc2: 'aaaaaaaa-0000-4000-8000-000000000006',
    locataire2: 'aaaaaaaa-0000-4000-8000-000000000007',
    proprietaire2: 'aaaaaaaa-0000-4000-8000-000000000008',
    proprietaire3: 'aaaaaaaa-0000-4000-8000-000000000009',
  };
  const users = [
    [U.admin, '+225 07 00 00 01', 'admin' + EMAIL_DOMAIN, 'Kouamé', 'Admin', 'ADMIN', 'Abidjan Plateau'],
    [U.locataire, '+225 07 00 00 02', 'locataire' + EMAIL_DOMAIN, 'Aya', 'Konan', 'LOCATAIRE', 'Abidjan Cocody'],
    [U.proprietaire, '+225 07 00 00 03', 'proprietaire' + EMAIL_DOMAIN, 'Yao', "N'Guessan", 'PROPRIETAIRE', 'Abidjan Marcory'],
    [U.agence, '+225 07 00 00 04', 'agence' + EMAIL_DOMAIN, 'Immo', 'Plus CI', 'AGENCE', 'Abidjan Riviera'],
    [U.tc1, '+225 07 00 00 05', 'tc1' + EMAIL_DOMAIN, 'Sekou', 'Touré', 'TIERS_CONFIANCE', 'Abidjan Yopougon'],
    [U.tc2, '+225 07 00 00 06', 'tc2' + EMAIL_DOMAIN, 'Fatou', 'Diallo', 'TIERS_CONFIANCE', 'Bouaké Centre'],
    [U.locataire2, '+225 07 00 00 07', 'locataire2' + EMAIL_DOMAIN, 'Mariam', 'Bamba', 'LOCATAIRE', 'Abidjan Yopougon'],
    [U.proprietaire2, '+225 07 00 00 08', 'proprietaire2' + EMAIL_DOMAIN, 'Awa', 'Traoré', 'PROPRIETAIRE', 'Abidjan Cocody'],
    [U.proprietaire3, '+225 07 00 00 09', 'proprietaire3' + EMAIL_DOMAIN, 'Bakary', 'Sylla', 'PROPRIETAIRE', 'Abidjan Koumassi'],
  ];
  for (const [id, phone, email, first, last, role, city] of users) {
    await c.query(
      `INSERT INTO users (id, phone, email, password_hash, first_name, last_name, role, active_role, city, is_active, is_email_verified, is_phone_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,true,true,true)
       ON CONFLICT (id) DO NOTHING`,
      [id, phone, email, hash, first, last, role, city]
    );
  }
  console.log(`👥 ${users.length} utilisateurs de test (mot de passe : ${PASSWORD})`);

  // ── 2. PROPRIÉTÉS nommées (scénarios ciblés)
  const namedProps = [
    ['prop-test-angre', U.proprietaire, 'Bel appartement 3 pièces Angré 7e tranche', 'APPARTEMENT', 'ACTIVE', 'disponible', 350000, 3, 2, 'Angré 7e Tranche', 'Cocody', 125],
    ['prop-test-yop', U.proprietaire, 'Studio moderne Yopougon Niangon', 'STUDIO', 'ACTIVE', 'disponible', 120000, 1, 1, 'Niangon Nord', 'Yopougon', 35],
    ['prop-test-marcory', U.agence, 'Villa 5 pièces Marcory Résidentiel avec jardin', 'VILLA', 'ACTIVE', 'loue', 850000, 5, 4, 'Marcory Résidentiel', 'Marcory', 300],
    ['prop-test-riviera', U.agence, 'Duplex standing Riviera Palmeraie', 'DUPLEX', 'ACTIVE', 'reserve', 600000, 4, 3, 'Riviera Palmeraie', 'Cocody', 200],
  ];

  // ── 2bis. GÉNÉRATION : 50 biens « déjà validés » + 2 en attente de vérification
  const generated = [];
  const owners = [U.proprietaire, U.agence, U.proprietaire2, U.proprietaire3];
  for (let i = 1; i <= 50; i++) {
    // Répartition par poids des types
    let type;
    const roll = rand() * 50;
    if (roll < 12) type = 'STUDIO';
    else if (roll < 31) type = 'APPARTEMENT';
    else if (roll < 36) type = 'MAISON';
    else if (roll < 41) type = 'DUPLEX';
    else if (roll < 47) type = 'VILLA';
    else type = 'PENTHOUSE';
    const def = TYPE_DEFS.find((d) => d[0] === type);

    const horsAbidjan = i % 10 === 0; // 1 bien sur 5 hors Abidjan
    const lieu = horsAbidjan ? pick(AUTRES_VILLES) : pick(QUARTIERS);
    const [addr, commune, lat, lng] = lieu;
    const city = commune; // city = commune d'Abidjan ou ville

    const price = roundTo(between(def[1], def[2]), 5000);
    const area = between(def[4][0], def[4][1]);
    const bedrooms = between(def[5][0], def[5][1]);
    const bathrooms = Math.min(bedrooms, between(1, 2) + (bedrooms > 3 ? 1 : 0));
    const rooms = type === 'STUDIO' ? 1 : bedrooms;

    // 80 % disponible, 12 % loue, 8 % réservé (déterministe)
    const rental = i % 25 < 20 ? 'disponible' : i % 25 < 23 ? 'loue' : 'reserve';
    // 2 biens en attente de vérification (file admin) — les 48 autres actifs
    const status = i > 48 ? 'PENDING_VERIFICATION' : 'ACTIVE';

    generated.push([
      `prop-seed-${String(i).padStart(3, '0')}`,
      owners[i % owners.length],
      buildTitle(type, rooms, addr),
      type, status, rental, price, bedrooms, bathrooms, addr, city, area,
      lat + (rand() - 0.5) * 0.01,
      lng + (rand() - 0.5) * 0.01,
      type,
    ]);
  }

  const allProps = [...namedProps.map((p) => [...p, null, null, null]), ...generated];
  for (const [id, owner, title, type, status, rental, price, beds, baths, addr, city, area, lat, lng, genType] of allProps) {
    const typeFinal = genType ?? type;
    const isGenerated = !!genType;
    await c.query(
      `INSERT INTO properties (id, owner_id, title, description, type, status, rental_status, price, currency, bedrooms, bathrooms, address, city, commune, area, latitude, longitude, is_verified, is_furnished, has_parking, has_garden, has_pool, has_guardian, has_climate, has_balcony, has_terrace, has_kitchen, has_box, amenities, rental_terms, featured, views_count, main_image, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'FCFA',$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$19,$20,$21,$22,$23,$24,true,$25,$26,$27,$28,$29,$30, now() - ($31 || ' days')::interval, now() - ($31 || ' days')::interval)
       ON CONFLICT (id) DO NOTHING`,
      [
        id, owner, title, buildDescription(typeFinal, beds, addr, city, area),
        typeFinal, status, rental, price, beds, baths, addr, city, isGenerated ? city : null, area,
        lat, lng,
        isGenerated ? (typeFinal === 'VILLA' || typeFinal === 'MAISON' ? rand() > 0.3 : rand() > 0.8) : false, // is_furnished
        typeFinal === 'VILLA' || typeFinal === 'DUPLEX' || typeFinal === 'PENTHOUSE' || rand() > 0.6, // has_parking
        typeFinal === 'VILLA' || typeFinal === 'MAISON', // has_garden
        (typeFinal === 'VILLA' || typeFinal === 'PENTHOUSE') && rand() > 0.5, // has_pool
        (typeFinal === 'APPARTEMENT' || typeFinal === 'DUPLEX' || typeFinal === 'PENTHOUSE') && rand() > 0.4, // has_guardian
        true, // has_climate
        typeFinal === 'APPARTEMENT' || typeFinal === 'DUPLEX', // has_balcony
        typeFinal === 'DUPLEX' || typeFinal === 'PENTHOUSE' || typeFinal === 'VILLA', // has_terrace
        typeFinal === 'VILLA' || typeFinal === 'PENTHOUSE', // has_box
        isGenerated ? buildAmenities(typeFinal) : '[]',
        isGenerated ? buildRentalTerms(price) : '{}',
        isGenerated && rand() > 0.85, // featured
        between(15, 900),
        seedImage(typeFinal, 0),
        String(between(0, 60)),
      ]
    );
    // 3 images par bien (illustrations locales par type de bien)
    for (let k = 0; k < 3; k++) {
      await c.query(
        `INSERT INTO property_images (id, url, "order", property_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [`img-${id}-${k}`, seedImage(typeFinal, k), k, id]
      );
    }
  }
  const dispo = allProps.filter((p) => p[5] === 'disponible').length;
  console.log(`🏠 ${allProps.length} biens (${dispo} disponibles, ${allProps.length - dispo} loués/réservés — tous is_verified=true, 2 en attente de vérification)`);

  // ── 3. DOSSIERS DE LOCATION
  await c.query(
    `INSERT INTO rental_files (id, tenant_id, status, priority, on_hold, file_type, tenant_category, monthly_income, employer, employment_type, valid_until, reviewed_at, reviewed_by_id)
     VALUES ('rf-test-001', $1, 'VALIDATED', 'NORMAL', false, 'STANDARD', 'SALARIE', 450000, 'DGDI Abidjan', 'CDI', now() + interval '180 days', now() - interval '10 days', $2)
     ON CONFLICT (id) DO NOTHING`,
    [U.locataire, U.tc1]
  );
  await c.query(
    `INSERT INTO rental_files (id, tenant_id, status, priority, on_hold, file_type, tenant_category, monthly_income, employer, employment_type)
     VALUES ('rf-test-002', $1, 'SUBMITTED', 'NORMAL', false, 'FAMILLE', 'SALARIE', 320000, 'CIE Abidjan', 'CDI')
     ON CONFLICT (id) DO NOTHING`,
    [U.locataire2]
  );
  console.log('📁 2 dossiers : Aya VALIDATED · Mariam (locataire2) SUBMITTED — en cours de validation');

  // ── 4. BAUX (leases)
  const leases = [
    ['lease-test-001', 'prop-test-angre', U.locataire, U.proprietaire, 'ACTIVE', '2026-01-01', '2026-12-31', 350000, 25000, 700000],
    ['lease-test-002', 'prop-test-yop', U.locataire, U.proprietaire, 'PENDING_SIGNATURE', '2026-12-01', '2027-11-30', 120000, 10000, 240000],
  ];
  for (const [id, prop, tenant, owner, status, start, end, rent, charges, deposit] of leases) {
    await c.query(
      `INSERT INTO leases (id, property_id, tenant_id, owner_id, rental_file_id, status, start_date, end_date, monthly_rent, charges, deposit, owner_signed_at, tenant_signed_at)
       VALUES ($1,$2,$3,$4,'rf-test-001',$5,$6,$7,$8,$9,$10,
         CASE WHEN $11 = 'ACTIVE' THEN now() END,
         CASE WHEN $11 = 'ACTIVE' THEN now() END)
       ON CONFLICT (id) DO NOTHING`,
      [id, prop, tenant, owner, status, start, end, rent, charges, deposit, status]
    );
  }
  console.log(`📜 ${leases.length} baux (1 ACTIVE, 1 PENDING_SIGNATURE)`);

  // ── 5. PAIEMENTS
  const payments = [
    ['pay-test-001', 'lease-test-001', U.locataire, 375000, 375000, 'PAID', '2026-11-01', '2026-11-02', 'ORANGE_MONEY'],
    ['pay-test-002', 'lease-test-001', U.locataire, 375000, 375000, 'PAID', '2026-12-01', '2026-12-01', 'WAVE'],
    ['pay-test-003', 'lease-test-001', U.locataire, 375000, 0, 'PENDING', '2027-01-01', null, 'ORANGE_MONEY'],
    ['pay-test-004', 'lease-test-001', U.locataire, 375000, 150000, 'LATE', '2026-10-01', '2026-10-20', 'MTN_MOMO'],
  ];
  for (const [id, lease, tenant, amount, paid, status, due, paidAt, method] of payments) {
    await c.query(
      `INSERT INTO payments (id, lease_id, tenant_id, amount, amount_paid, status, due_date, paid_at, method, reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [id, lease, tenant, amount, paid, status, due, paidAt, method, 'MT-TEST-' + id.slice(-3).toUpperCase()]
    );
  }
  console.log(`💰 ${payments.length} paiements (2 PAID, 1 PENDING, 1 LATE)`);

  // ── 6. CANDIDATURES (applications) — Aya a un dossier VALIDATED
  const applications = [
    ['app-seed-001', 'prop-seed-001', 'SUBMITTED', 'Je souhaite loger ma famille proche de mon lieu de travail, dossier complet et validé sur Mon Toit.'],
    ['app-seed-002', 'prop-seed-006', 'ACCEPTED', 'Très intéressée par ce bien lumineux, je suis disponible pour signer rapidement.'],
    ['app-seed-003', 'prop-seed-011', 'REJECTED', 'Recherche un bien familial pour un bail de 12 mois renouvelable.'],
  ];
  for (const [id, prop, status, motivation] of applications) {
    await c.query(
      `INSERT INTO applications (id, rental_file_id, property_id, tenant_id, status, motivation, employment_type, monthly_income)
       VALUES ($1,'rf-test-001',$2,$3,$4,$5,'CDI',450000)
       ON CONFLICT (id) DO NOTHING`,
      [id, prop, U.locataire, status, motivation]
    );
  }
  console.log(`📨 ${applications.length} candidatures (SUBMITTED, ACCEPTED, REJECTED)`);

  // ── 7. VISITES
  const visits = [
    ['visit-seed-001', 'prop-seed-002', 'PHYSICAL', 3, '09:00-11:00', 'ACCEPTED', 'Bonjour, je souhaite visiter ce bien cette semaine si possible.'],
    ['visit-seed-002', 'prop-seed-007', 'PHYSICAL', 6, '15:00-17:00', 'PENDING', 'Disponible en fin de journée après 15h.'],
    ['visit-seed-003', 'prop-seed-012', 'VIRTUAL', 2, '11:00-12:00', 'COUNTER_PROPOSED', 'Visite virtuelle souhaitée avant déplacement.'],
    ['visit-seed-004', 'prop-seed-013', 'PHYSICAL', -8, '10:00-12:00', 'COMPLETED', 'Merci pour la visite, le bien correspond à l\u2019annonce.'],
  ];
  for (const [id, prop, vtype, inDays, slot, status, message] of visits) {
    await c.query(
      `INSERT INTO visit_requests (id, property_id, tenant_id, visit_type, requested_date, time_slot, status, tenant_message, counter_date, counter_time_slot, tenant_rating, tenant_review)
       VALUES ($1,$2,$3,$4::visit_type, now() + ($5 || ' days')::interval, $6, $7::visit_request_status, $8,
         CASE WHEN $7::text = 'COUNTER_PROPOSED' THEN now() + interval '4 days' ELSE NULL END,
         CASE WHEN $7::text = 'COUNTER_PROPOSED' THEN '16:00-18:00' ELSE NULL END,
         CASE WHEN $7::text = 'COMPLETED' THEN 4 ELSE NULL END,
         CASE WHEN $7::text = 'COMPLETED' THEN 'Visite bien organisée, hôte ponctuel.' ELSE NULL END)
       ON CONFLICT (id) DO NOTHING`,
      [id, prop, U.locataire, vtype, String(inDays), slot, status, message]
    );
  }
  console.log(`📅 ${visits.length} demandes de visite (ACCEPTED, PENDING, COUNTER_PROPOSED, COMPLETED)`);

  // ── 8. AVIS (ratings — liés au bail actif)
  const ratings = [
    ['rat-seed-001', 'prop-test-angre', U.locataire, U.proprietaire, 5, 'Propriétaire très réactif, bien conforme à l\u2019annonce. Quartier calme.', 'Merci Aya, au plaisir de continuer ainsi !'],
    ['rat-seed-002', 'prop-test-angre', U.proprietaire, U.locataire, 4, 'Locataire sérieuse et ponctuelle dans les paiements, logement bien entretenu.', null],
  ];
  for (const [id, prop, from, to, score, comment, reply] of ratings) {
    await c.query(
      `INSERT INTO ratings (id, lease_id, property_id, from_user_id, to_user_id, score, comment, reply, replied_at, status, created_at)
       VALUES ($1,'lease-test-001',$2,$3,$4,$5,$6,$7::text,
         CASE WHEN $7::text IS NOT NULL THEN now() - interval '2 days' ELSE NULL END,
         'PUBLISHED', now() - interval '15 days')
       ON CONFLICT (id) DO NOTHING`,
      [id, prop, from, to, score, comment, reply]
    );
  }
  console.log(`⭐ ${ratings.length} avis croisés (5★ et 4★)`);

  // ── 9. FAVORIS
  const favorites = [
    ['fav-seed-001', U.locataire, 'prop-seed-003'],
    ['fav-seed-002', U.locataire, 'prop-seed-008'],
    ['fav-seed-003', U.locataire, 'prop-seed-014'],
    ['fav-seed-004', U.locataire, 'prop-seed-021'],
    ['fav-seed-005', U.locataire2, 'prop-seed-002'],
  ];
  for (const [id, user, prop] of favorites) {
    await c.query(
      `INSERT INTO favorites (id, user_id, property_id) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [id, user, prop]
    );
  }
  console.log(`❤️  ${favorites.length} favoris`);

  // ── 10. COMPATIBILITÉ LEGACY (profiles / lease_contracts / user_roles)
  await c.query(
    `INSERT INTO profiles (id, user_id, email, phone, full_name, first_name, last_name, user_type, is_verified, city)
     VALUES
       ('11111111-1111-4111-8111-111111111111',$1,'locataire$3','+225 07 00 00 02','Aya Konan','Aya','Konan','LOCATAIRE',true,'Abidjan Cocody'),
       ('22222222-2222-4222-8222-222222222222',$2,'proprietaire$3','+225 07 00 00 03','Yao N''Guessan','Yao','N''Guessan','PROPRIETAIRE',true,'Abidjan Marcory')
     ON CONFLICT (id) DO NOTHING`.replaceAll('$3', EMAIL_DOMAIN)
  , [U.locataire, U.proprietaire]);
  await c.query(
    `INSERT INTO lease_contracts (id, contract_number, property_id, owner_id, tenant_id, status, rent_amount, start_date, end_date)
     VALUES ('33333333-3333-4333-8333-333333333331','BAIL-2026-TEST-001','prop-test-angre',$1,'11111111-1111-4111-8111-111111111111','actif',350000,'2026-01-01','2026-12-31')
     ON CONFLICT (id) DO NOTHING`
  , [U.proprietaire]);
  for (const [userId, role] of [[U.tc1, 'trust_agent'], [U.tc2, 'trust_agent'], [U.admin, 'admin']]) {
    await c.query(`INSERT INTO user_roles (user_id, role) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, role]);
  }
  console.log('🔗 Compat legacy : 2 profiles, 1 lease_contract, 3 user_roles');

  // ── Résumé
  const summary = await c.query(`
    SELECT
      (SELECT count(*) FROM users)            AS users,
      (SELECT count(*) FROM properties)       AS properties,
      (SELECT count(*) FROM properties WHERE is_verified AND status = 'ACTIVE') AS props_validated,
      (SELECT count(*) FROM property_images)  AS images,
      (SELECT count(*) FROM applications)     AS applications,
      (SELECT count(*) FROM visit_requests)   AS visits,
      (SELECT count(*) FROM ratings)          AS ratings,
      (SELECT count(*) FROM favorites)        AS favorites,
      (SELECT count(*) FROM leases)           AS leases,
      (SELECT count(*) FROM payments)         AS payments,
      (SELECT count(*) FROM rental_files)     AS rental_files`);
  const s = summary.rows[0];
  console.log(`\n📈 TOTALS — users: ${s.users} | properties: ${s.properties} (validées actives: ${s.props_validated}) | images: ${s.images} | applications: ${s.applications} | visits: ${s.visits} | ratings: ${s.ratings} | favorites: ${s.favorites} | leases: ${s.leases} | payments: ${s.payments} | rental_files: ${s.rental_files}`);
  console.log('✅ Seed terminé.');
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
