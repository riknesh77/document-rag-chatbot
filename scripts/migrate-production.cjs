// Apply only reviewed additive migrations through the working pooled connection.
// Never replay the historical vector conversion against existing documents.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const legacy = ['20260912000000_document_chunks', '20260921000000_local_embeddings'];
const additions = ['20261005000000_briefproof_workspaces', '20261005010000_server_only_access'];
const read = name => fs.readFileSync(path.join(__dirname, '../prisma/migrations', name, 'migration.sql'), 'utf8');
async function migrate() {
  if (process.env.VERCEL_ENV !== 'production') return;
  if (!process.env.DATABASE_URL) throw new Error('Production database is not configured.');
  const db = new PrismaClient();
  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17051005)`;
      const shape = await tx.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Document','Chunk')`;
      const required = { Document: ['id','title','filename','content','pageCount','sizeBytes','createdAt'], Chunk: ['id','documentId','index','text','tokenCount','startToken','endToken','embeddingModel','embedding'] };
      for (const [table, columns] of Object.entries(required)) {
        if (!columns.every(column => shape.some(row => row.table_name === table && row.column_name === column))) throw new Error('LEGACY_SCHEMA_MISMATCH');
      }
      const vectors = await tx.$queryRaw`SELECT format_type(a.atttypid,a.atttypmod) AS type FROM pg_attribute a WHERE a.attrelid='public."Chunk"'::regclass AND a.attname='embedding'`;
      if (vectors[0]?.type !== 'vector(384)') throw new Error('VECTOR_SCHEMA_MISMATCH');
      await tx.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_prisma_migrations" ("id" VARCHAR(36) PRIMARY KEY, "checksum" VARCHAR(64) NOT NULL, "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ, "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0)');
      const records = await tx.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
      if (records.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error('UNRESOLVED_MIGRATION');
      const applied = new Set(records.filter(row => row.finished_at && !row.rolled_back_at).map(row => row.migration_name));
      const record = async name => {
        const checksum = createHash('sha256').update(read(name)).digest('hex');
        await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES (${randomUUID()},${checksum},${name},now(),1)`;
      };
      // Baseline a pre-existing MiniLM schema only with completely absent
      // history. Existing or partially applied history is never rewritten.
      if (!records.length) {
        for (const name of legacy) { await record(name); applied.add(name); }
      } else if (!legacy.every(name => applied.has(name))) throw new Error('INCOMPLETE_BASELINE');
      for (const name of additions) {
        if (applied.has(name)) continue;
        // These files contain simple DDL, no procedural SQL blocks. The SQL
        // comes from reviewed repository files, never from request input.
        const statements = read(name).replace(/^\s*--.*$/gm, '').split(';').map(sql => sql.trim()).filter(Boolean);
        for (const sql of statements) await tx.$executeRawUnsafe(sql);
        await record(name);
      }
    }, { maxWait: 10000, timeout: 120000 });
    console.log('Production database migrations applied successfully.');
  } catch (error) {
    const code = /^P\d{4}$/.test(error.code || '') ? error.code : /^[A-Z_]+$/.test(error.message || '') ? error.message : 'MIGRATION_FAILED';
    throw new Error(`Production migration failed (${code}). Transaction rolled back; deployment will not be promoted.`);
  } finally { await db.$disconnect(); }
}
migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
