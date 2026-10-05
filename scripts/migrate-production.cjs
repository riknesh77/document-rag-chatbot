const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL) throw new Error('Production database is not configured.');
  const migrationUrl = new URL(process.env.DATABASE_URL);
  // Supabase transaction pooling is for runtime queries. Prisma migrations need
  // session pooling, which uses the same host/user/password on port 5432.
  if (migrationUrl.hostname.endsWith('.pooler.supabase.com') && migrationUrl.port === '6543') {
    migrationUrl.port = '5432';
    migrationUrl.searchParams.delete('pgbouncer');
    console.log('Using Supabase session pooling for production migrations.');
  }
  const result = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { encoding: 'utf8', timeout: 120000, env: { ...process.env, DATABASE_URL: migrationUrl.toString() } });
  if (result.status !== 0) {
    // CLI diagnostics can include connection metadata. Return the error code
    // only; never print the environment or underlying provider error body.
    const output = String(result.stdout || '') + String(result.stderr || '');
    const code = output.match(/\bP\d{4}\b/)?.[0] || 'MIGRATION_FAILED';
    throw new Error(`Production migration failed (${code}). No deployment will be promoted.`);
  }
  console.log('Production database migrations applied successfully.');
}
