const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL) throw new Error('Production database is not configured.');
  const result = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    // CLI diagnostics can include connection metadata. Return the error code
    // only; never print the environment or underlying provider error body.
    const output = String(result.stdout || '') + String(result.stderr || '');
    const code = output.match(/\bP\d{4}\b/)?.[0] || 'MIGRATION_FAILED';
    throw new Error(`Production migration failed (${code}). No deployment will be promoted.`);
  }
  console.log('Production database migrations applied successfully.');
}
