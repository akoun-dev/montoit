/**
 * Seed de données de test — Mon Toit CI (base PostgreSQL locale)
 * Comptes de test pour chaque acteur + données métier de base.
 * Idempotent : purge les données de test existantes avant réinsertion.
 * Usage: node db/seed.mjs
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';

const URL = 'postgresql://postgres@127.0.0.1:5432/montoit';
const EMAIL_DOMAIN = '@montoit-test.ci';
const PASSWORD = 'Test1234!';

async function main() {
  const c = new pg.Client({ connectionString: URL });
  await c.connect();

  const hash = await bcrypt.hash(PASSWORD, 10);

  // ---- Purge des données de test existantes (ordre des dépendances)
  const emails = ['admin', 'locataire', 'proprietaire', 'agence', 'tc1', 'tc2'].map((u) => u + EMAIL_DOMAIN);
  await c.query(`DELETE FROM payments WHERE lease_id IN (SELECT id FROM leases WHERE id LIKE 'lease-test-%')`);
  await c.query(`DELETE FROM leases WHERE id LIKE 'lease-test-%'`);
  await c.query(`DELETE FROM rental_files WHERE id LIKE 'rf-test-%'`);
  await c.query(`DELETE FROM lease_contracts WHERE id = '33333333-3333-4333-8333-333333333331'`);
  await c.query(`DELETE FROM properties WHERE owner_id LIKE 'u-test-%'`);
  await c.query(`DELETE FROM user_roles WHERE user_id IN (
    'aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003',
    'aaaaaaaa-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000005','aaaaaaaa-0000-4000-8000-000000000006')`);
  await c.query(`DELETE FROM profiles WHERE id IN ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')`);
  const del = await c.query(`DELETE FROM users WHERE email = ANY($1)`, [emails]);
  if (del.rowCount > 0) console.log(`🧹 Anciennes données de test purgées (${del.rowCount} users)`);

  // ---- 1. UTILISATEURS (tous les acteurs)
  const users = [
    ['aaaaaaaa-0000-4000-8000-000000000001', '+225 07 00 00 01', 'admin' + EMAIL_DOMAIN, 'Kouamé', 'Admin', 'ADMIN', 'Abidjan Plateau', 'ADMIN'],
    ['aaaaaaaa-0000-4000-8000-000000000002', '+225 07 00 00 02', 'locataire' + EMAIL_DOMAIN, 'Aya', 'Konan', 'LOCATAIRE', 'Abidjan Cocody', 'ADMIN'],
    ['aaaaaaaa-0000-4000-8000-000000000003', '+225 07 00 00 03', 'proprietaire' + EMAIL_DOMAIN, 'Yao', "N'Guessan", 'PROPRIETAIRE', 'Abidjan Marcory', 'ADMIN'],
    ['aaaaaaaa-0000-4000-8000-000000000004', '+225 07 00 00 04', 'agence' + EMAIL_DOMAIN, 'Immo', 'Plus CI', 'AGENCE', 'Abidjan Riviera', 'ADMIN'],
    ['aaaaaaaa-0000-4000-8000-000000000005', '+225 07 00 00 05', 'tc1' + EMAIL_DOMAIN, 'Sekou', 'Touré', 'TIERS_CONFIANCE', 'Abidjan Yopougon', 'ADMIN'],
    ['aaaaaaaa-0000-4000-8000-000000000006', '+225 07 00 00 06', 'tc2' + EMAIL_DOMAIN, 'Fatou', 'Diallo', 'TIERS_CONFIANCE', 'Bouaké Centre', 'ADMIN'],
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

  // ---- 2. PROPRIÉTÉS
  const props = [
    ['prop-test-angre', 'aaaaaaaa-0000-4000-8000-000000000003', 'Bel appartement 3 pièces Angré 7e tranche', 'APPARTEMENT', 'ACTIVE', 'disponible', 350000, 3, 2, 'Angré 7e Tranche', 'Cocody', 125],
    ['prop-test-yop', 'aaaaaaaa-0000-4000-8000-000000000003', 'Studio moderne Yopougon Niangon', 'STUDIO', 'ACTIVE', 'disponible', 120000, 1, 1, 'Niangon Nord', 'Yopougon', 35],
    ['prop-test-marcory', 'aaaaaaaa-0000-4000-8000-000000000004', 'Villa 5 pièces Marcory Résidentiel avec jardin', 'VILLA', 'ACTIVE', 'loue', 850000, 5, 4, 'Marcory Résidentiel', 'Marcory', 300],
    ['prop-test-riviera', 'aaaaaaaa-0000-4000-8000-000000000004', 'Duplex standing Riviera Palmeraie', 'DUPLEX', 'ACTIVE', 'reserve', 600000, 4, 3, 'Riviera Palmeraie', 'Cocody', 200],
  ];
  for (const [id, owner, title, type, status, rental, price, beds, baths, addr, city, area] of props) {
    await c.query(
      `INSERT INTO properties (id, owner_id, title, description, type, status, rental_status, price, currency, bedrooms, bathrooms, address, city, area, is_verified, is_furnished)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'XOF',$9,$10,$11,$12,$13,true,false)
       ON CONFLICT (id) DO NOTHING`,
      [id, owner, title, title + ' — bien de test Mon Toit CI', type, status, rental, price, beds, baths, addr, city, area]
    );
  }
  console.log(`🏠 ${props.length} propriétés de test`);

  // ---- 3. DOSSIER DE LOCATION
  await c.query(
    `INSERT INTO rental_files (id, tenant_id, status, priority, on_hold, file_type)
     VALUES ('rf-test-001','aaaaaaaa-0000-4000-8000-000000000002','VALIDATED','NORMAL',false,'STANDARD')
     ON CONFLICT (id) DO NOTHING`
  );
  console.log('📁 1 dossier de location (VALIDATED)');

  // ---- 4. BAUX (leases)
  const leases = [
    ['lease-test-001', 'prop-test-angre', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'ACTIVE', '2026-01-01', '2026-12-31', 350000, 25000, 700000],
    ['lease-test-002', 'prop-test-yop', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'PENDING_SIGNATURE', '2026-12-01', '2027-11-30', 120000, 10000, 240000],
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

  // ---- 5. PAIEMENTS
  const payments = [
    ['pay-test-001', 'lease-test-001', 'aaaaaaaa-0000-4000-8000-000000000002', 375000, 375000, 'PAID', '2026-11-01', '2026-11-02', 'ORANGE_MONEY'],
    ['pay-test-002', 'lease-test-001', 'aaaaaaaa-0000-4000-8000-000000000002', 375000, 375000, 'PAID', '2026-12-01', '2026-12-01', 'WAVE'],
    ['pay-test-003', 'lease-test-001', 'aaaaaaaa-0000-4000-8000-000000000002', 375000, 0, 'PENDING', '2027-01-01', null, 'ORANGE_MONEY'],
    ['pay-test-004', 'lease-test-001', 'aaaaaaaa-0000-4000-8000-000000000002', 375000, 150000, 'LATE', '2026-10-01', '2026-10-20', 'MTN_MOMO'],
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

  // ---- 6. COMPATIBILITÉ LEGACY (profiles / lease_contracts / user_roles)
  await c.query(
    `INSERT INTO profiles (id, user_id, email, phone, full_name, first_name, last_name, user_type, is_verified, city)
     VALUES
       ('11111111-1111-4111-8111-111111111111','aaaaaaaa-0000-4000-8000-000000000002','locataire$1','+225 07 00 00 02','Aya Konan','Aya','Konan','LOCATAIRE',true,'Abidjan Cocody'),
       ('22222222-2222-4222-8222-222222222222','aaaaaaaa-0000-4000-8000-000000000003','proprietaire$1','+225 07 00 00 03','Yao N''Guessan','Yao','N''Guessan','PROPRIETAIRE',true,'Abidjan Marcory')
     ON CONFLICT (id) DO NOTHING`.replaceAll('$1', EMAIL_DOMAIN)
  );
  await c.query(
    `INSERT INTO lease_contracts (id, contract_number, property_id, owner_id, tenant_id, status, rent_amount, start_date, end_date)
     VALUES ('33333333-3333-4333-8333-333333333331','BAIL-2026-TEST-001','prop-test-angre','aaaaaaaa-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','actif',350000,'2026-01-01','2026-12-31')
     ON CONFLICT (id) DO NOTHING`
  );
  for (const [userId, role] of [['aaaaaaaa-0000-4000-8000-000000000005', 'trust_agent'], ['aaaaaaaa-0000-4000-8000-000000000006', 'trust_agent'], ['aaaaaaaa-0000-4000-8000-000000000001', 'admin']]) {
    await c.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1,$2)`,
      [userId, role]
    );
  }
  console.log('🔗 Compat legacy : 2 profiles, 1 lease_contract, 3 user_roles');

  // ---- Résumé
  const summary = await c.query(`
    SELECT
      (SELECT count(*) FROM users)            AS users,
      (SELECT count(*) FROM properties)       AS properties,
      (SELECT count(*) FROM leases)           AS leases,
      (SELECT count(*) FROM payments)         AS payments,
      (SELECT count(*) FROM rental_files)     AS rental_files`);
  const s = summary.rows[0];
  console.log(`\n📈 TOTALS — users: ${s.users} | properties: ${s.properties} | leases: ${s.leases} | payments: ${s.payments} | rental_files: ${s.rental_files}`);
  console.log('✅ Seed terminé.');
  await c.end();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
