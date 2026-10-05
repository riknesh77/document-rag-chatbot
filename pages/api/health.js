import { getDb } from '../../lib/db';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Use GET.' }); }
  try {
    // Return readiness only, never connection URLs, account data or credentials.
    const rows = await getDb().$queryRaw`SELECT
      to_regclass('public."User"') IS NOT NULL AS "users",
      to_regclass('public."Session"') IS NOT NULL AS "sessions",
      to_regclass('public."RateLimit"') IS NOT NULL AS "limits",
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Document' AND column_name='ownerId') AS "ownership"`;
    const schemaReady = Object.values(rows[0]).every(Boolean);
    return res.status(schemaReady ? 200 : 503).json({ database: true, schemaReady, checks: rows[0] });
  } catch (error) {
    const code = /^P\d{4}$/.test(error.code || '') ? error.code : 'DATABASE_UNAVAILABLE';
    return res.status(503).json({ database: false, schemaReady: false, code });
  }
}
