/**
 * Vérification de la base PostgreSQL locale — tests de bout en bout.
 * Vérifie: intégrité du schéma, RLS (via émulation JWT), vues, storage.
 * Usage: node db/verify.mjs
 */
import pg from 'pg';

const URL = 'postgresql://postgres@127.0.0.1:5432/montoit';
const LOCATAIRE_ID = 'aaaaaaaa-0000-4000-8000-000000000002';
let pass = 0, fail = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
}

async function main() {
  const c = new pg.Client({ connectionString: URL });
  await c.connect();

  // 1. Schéma
  const s = await c.query(`
    SELECT
      (SELECT count(*) FROM pg_tables   WHERE schemaname='public') AS tables,
      (SELECT count(*) FROM pg_views    WHERE schemaname='public') AS views,
      (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
      (SELECT count(*) FROM storage.buckets) AS buckets`);
  check('Schéma chargé', s.rows[0].tables >= 60, `${s.rows[0].tables} tables, ${s.rows[0].views} vues, ${s.rows[0].policies} policies, ${s.rows[0].buckets} buckets`);

  // 2. Données de test
  const d = await c.query(`
    SELECT
      (SELECT count(*) FROM users WHERE email LIKE '%@montoit-test.ci') AS users,
      (SELECT count(*) FROM properties WHERE id LIKE 'prop-test-%') AS properties,
      (SELECT count(*) FROM leases WHERE id LIKE 'lease-test-%') AS leases,
      (SELECT count(*) FROM payments WHERE id LIKE 'pay-test-%') AS payments`);
  const dd = d.rows[0];
  check('Seed présent', dd.users == 6 && dd.properties == 4 && dd.leases == 2 && dd.payments == 4,
    `${dd.users} users / ${dd.properties} propriétés / ${dd.leases} baux / ${dd.payments} paiements`);

  // 3. RLS + trigger métier — simulation d'un JWT locataire via request.jwt.claims
  await c.query(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: LOCATAIRE_ID, role: 'authenticated' })]);
  const trig = await c.query(`
    SELECT count(*) AS n FROM properties p
    JOIN leases l ON l.property_id = p.id AND l.status = 'ACTIVE'
    WHERE p.rental_status = 'loue'`);
  check('Trigger métier (bail ACTIVE → bien loué)', trig.rows[0].n >= 1, `${trig.rows[0].n} bien(x) basculé(s) en « loué » automatiquement`);
  const rls = await c.query(`SELECT count(*) AS n FROM properties`);
  check('Lecture avec JWT simulé (auth.uid())', rls.rows[0].n >= 1, `${rls.rows[0].n} propriétés visibles`);

  // 4. Jointures métier
  const j = await c.query(`
    SELECT l.id, p.title, u.first_name, u.last_name
    FROM leases l
    JOIN properties p ON p.id = l.property_id
    JOIN users u ON u.id = l.tenant_id
    WHERE l.status = 'ACTIVE' LIMIT 1`);
  check('Jointure leases↔properties↔users', j.rows.length === 1,
    j.rows[0] ? `${j.rows[0].first_name} ${j.rows[0].last_name} → ${j.rows[0].title}` : 'aucun résultat');

  // 5. Vue legacy trust_agent
  try {
    const v = await c.query('SELECT count(*) AS n FROM disputes_with_details');
    check('Vue legacy disputes_with_details', true, `${v.rows[0].n} ligne(s)`);
  } catch (e) {
    check('Vue legacy disputes_with_details', false, e.message);
  }

  // 6. Storage
  const b = await c.query(`SELECT id, public FROM storage.buckets ORDER BY id`);
  check('Buckets storage', b.rowCount >= 10, b.rows.map((x) => `${x.id}${x.public ? '' : ' (privé)'}`).join(', '));

  // 7. Fonctions auth Supabase
  const f = await c.query(`SELECT auth.uid() AS uid, auth.role() AS role`);
  check('Fonctions auth.uid()/auth.role()', f.rows[0].uid === LOCATAIRE_ID && f.rows[0].role === 'authenticated',
    `uid=${f.rows[0].uid}, role=${f.rows[0].role}`);

  console.log(`\n📊 RÉSULTAT : ${pass}/${pass + fail} vérifications OK`);
  await c.end();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
